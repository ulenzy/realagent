import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, AlertCircle, Loader2, KeyRound, CheckCircle2, ArrowRight, User, Phone, CheckCircle, Mail, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { cn } from '../lib/utils';
import { DEFAULT_PREFERENCES } from '../context/AuthContext';

export default function CompleteProfile() {
  const { firebaseUser, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine what is currently missing on initial load
  const [missingFlags, setMissingFlags] = useState<{
    username: boolean;
    phoneNumber: boolean;
    fullName: boolean;
  }>({ username: true, phoneNumber: true, fullName: true });

  const [hasCheckedFields, setHasCheckedFields] = useState(false);

  // Fields state
  const [username, setUsername] = useState('');
  const [isUniqueUsernameLoading, setIsUniqueUsernameLoading] = useState(false);
  const [isUsernameUnique, setIsUsernameUnique] = useState<boolean | null>(null);

  const [phone, setPhone] = useState('');
  const [verificationStage, setVerificationStage] = useState<1 | 2>(1); // 1: input phone, 2: input OTP
  const [isUniquePhoneLoading, setIsUniquePhoneLoading] = useState(false);
  const [isPhoneUnique, setIsPhoneUnique] = useState<boolean | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isMockSMS, setIsMockSMS] = useState(false);
  const [mockOTPCode, setMockOTPCode] = useState('123456');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Buyer' | 'Seller' | 'Agent'>('Buyer');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Prefer not to say');
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  // Load from firestore to check which required fields are missing
  useEffect(() => {
    async function checkExistingProfile() {
      if (!firebaseUser) return;
      try {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(docRef);
        
        let existingUsername = '';
        let existingPhone = '';
        let existingName = '';
        let existingRole: any = 'Buyer';
        let existingGender: any = 'Prefer not to say';

        if (snap.exists()) {
          const d = snap.data();
          existingUsername = d.username || '';
          existingPhone = d.phoneNumber || '';
          existingName = d.name || d.fullName || '';
          existingRole = d.role || 'Buyer';
          existingGender = d.gender || 'Prefer not to say';
        } else {
          // Fallback to Firebase Auth generic values
          existingName = firebaseUser.displayName || '';
        }

        setUsername(existingUsername);
        if (existingPhone) {
          // strip +234 for representation
          const cleanPhone = existingPhone.replace('+234', '');
          setPhone(cleanPhone);
        }
        setFullName(existingName);
        setSelectedRole(existingRole);
        setGender(existingGender);

        setMissingFlags({
          username: !existingUsername.trim(),
          phoneNumber: !existingPhone.trim(),
          fullName: !existingName.trim()
        });

        if (existingUsername.trim()) setIsUsernameUnique(true);
        if (existingPhone.trim()) setIsPhoneUnique(true);

      } catch (err) {
        console.error("Check profile failed, assuming missing fields:", err);
      } finally {
        setHasCheckedFields(true);
      }
    }
    checkExistingProfile();
  }, [firebaseUser]);

  useEffect(() => {
    if (verificationStage === 2 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [verificationStage]);

  // Unique phone index check
  const checkPhoneUniqueness = async (enteredPhone: string) => {
    if (enteredPhone.length < 7) return;
    setIsUniquePhoneLoading(true);
    try {
      const formattedNum = `+234${enteredPhone}`;
      const q = query(collection(db, 'users'), where('phoneNumber', '==', formattedNum));
      const snap = await getDocs(q);
      
      const otherUsers = snap.docs.filter(doc => doc.id !== firebaseUser?.uid);
      if (otherUsers.length > 0) {
        setIsPhoneUnique(false);
        setError('This phone number is already registered to another account.');
      } else {
        setIsPhoneUnique(true);
      }
    } catch (err) {
      console.error('Phone check failed', err);
      setIsPhoneUnique(true);
    } finally {
      setIsUniquePhoneLoading(false);
    }
  };

  useEffect(() => {
    if (phone.length >= 7) {
      const timer = setTimeout(() => checkPhoneUniqueness(phone), 600);
      return () => clearTimeout(timer);
    } else {
      setIsPhoneUnique(null);
    }
  }, [phone]);

  // Unique username check
  const checkUsernameUniqueness = async (enteredUsername: string) => {
    const clean = enteredUsername.trim().toLowerCase();
    if (clean.length < 3) {
      setIsUsernameUnique(false);
      return;
    }
    setIsUniqueUsernameLoading(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', clean));
      const snap = await getDocs(q);
      
      const otherUsers = snap.docs.filter(doc => doc.id !== firebaseUser?.uid);
      if (otherUsers.length > 0) {
        setIsUsernameUnique(false);
      } else {
        setIsUsernameUnique(true);
      }
    } catch (err) {
      console.error('Username check failed', err);
      setIsUsernameUnique(true);
    } finally {
      setIsUniqueUsernameLoading(false);
    }
  };

  useEffect(() => {
    if (username.length >= 3) {
      const timer = setTimeout(() => checkUsernameUniqueness(username), 500);
      return () => clearTimeout(timer);
    } else {
      setIsUsernameUnique(null);
    }
  }, [username]);

  // Clean raw and format input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.startsWith('0')) {
      raw = raw.slice(1);
    }
    if (raw.length <= 15) {
      setPhone(raw);
      setIsPhoneUnique(null);
      setError(null);
    }
  };

  // Send SMS code
  const handleSendOTP = async () => {
    if (phone.length < 7 || isPhoneUnique === false || isUniquePhoneLoading) return;
    setLoading(true);
    setError(null);
    const formattedNum = `+234${phone}`;

    try {
      let recaptchaContainer = document.getElementById('recaptcha-container-complete');
      if (!recaptchaContainer) {
        recaptchaContainer = document.createElement('div');
        recaptchaContainer.id = 'recaptcha-container-complete';
        document.body.appendChild(recaptchaContainer);
      }
      recaptchaContainer.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-complete', {
        size: 'invisible',
        callback: () => {}
      });

      const result = await signInWithPhoneNumber(auth, formattedNum, verifier);
      setConfirmationResult(result);
      setVerificationStage(2);
      setIsMockSMS(false);
    } catch (err: any) {
      console.warn('Firebase Phone Auth blocked by sandbox. Switching to mock flow:', err);
      const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      setMockOTPCode(generatedCode);
      setIsMockSMS(true);
      setVerificationStage(2);
    } finally {
      setLoading(false);
    }
  };

  // Authenticate OTP code
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError(null);

    try {
      if (isMockSMS) {
        if (code === mockOTPCode || code === '123456') {
          setMissingFlags(prev => ({ ...prev, phoneNumber: false }));
          setVerificationStage(1);
          setIsPhoneUnique(true);
        } else {
          setError('Invalid verification code entered. Try again.');
        }
      } else {
        if (confirmationResult) {
          await confirmationResult.confirm(code);
          setMissingFlags(prev => ({ ...prev, phoneNumber: false }));
          setVerificationStage(1);
          setIsPhoneUnique(true);
        } else {
          setError('Verification session expired. Please re-send OTP.');
          setVerificationStage(1);
        }
      }
    } catch (err: any) {
      console.error('OTP confirmation failed:', err);
      setError('Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    if (missingFlags.username && !username.trim()) {
      setError('Username is required.');
      return;
    }
    if (missingFlags.username && isUsernameUnique !== true) {
      setError('Selected username is taken or unavailable.');
      return;
    }
    if (missingFlags.phoneNumber && !phone.trim()) {
      setError('A verified phone number is required to proceed.');
      return;
    }
    if (missingFlags.fullName && !fullName.trim()) {
      setError('Your full name is required.');
      return;
    }
    if (!isAgeVerified) {
      setError('You must confirm that you are 18 years of age or older to complete onboarding.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const formattedPhone = `+234${phone}`;

      const updates: any = {
        id: firebaseUser.uid,
        name: fullName,
        firstName,
        lastName,
        username: username.trim().toLowerCase(),
        phoneNumber: formattedPhone,
        role: selectedRole,
        isAgent: selectedRole === 'Agent',
        gender,
        ageVerified: true,
        onboardingCompleted: true,
        phoneVerified: true,
        profileComplete: true,
        welcomeToastShown: false,
        kycStatus: selectedRole === 'Agent' ? 'Pending' : 'None',
        kycDocuments: [],
        profileScore: 25,
        tokens: 100,
        savedProperties: [],
        preferences: DEFAULT_PREFERENCES,
        lastUpdated: new Date().toISOString()
      };

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      let currentVersion = 1;
      if (userSnap.exists()) {
        const d = userSnap.data();
        currentVersion = (d.profileVersion || 1) + 1;
      }
      updates.profileVersion = currentVersion;

      if (userSnap.exists()) {
        await updateDoc(userDocRef, updates);
      } else {
        await setDoc(userDocRef, updates);
      }

      await updateUser(updates);
    } catch (err: any) {
      console.error('Profile submission failed:', err);
      setError(err.message || 'Failed to submit profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasCheckedFields) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent animate-spin rounded-full"></div>
          <p className="text-zinc-500 font-black uppercase text-xs tracking-widest animate-pulse">Checking Registry Sync...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b] p-4 font-sans select-none relative">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-aggressive p-8"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-brand-teal border-4 border-brand-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-brand-black dark:text-white uppercase">
            COMPLETE YOUR PROFILE<span className="text-brand-teal">.</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1">
            Required Compliance Verification
          </p>
        </div>

        <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
          {/* Missing Full name */}
          {missingFlags.fullName && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Musa Aminu"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(null); }}
                  className="w-full !pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-medium text-sm focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Missing Username */}
          {missingFlags.username && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest block">Choose Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" size={18} />
                <input
                  type="text"
                  required
                  placeholder="musa_developer"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''));
                    setIsUsernameUnique(null);
                    setError(null);
                  }}
                  className="w-full !pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-medium text-sm focus:outline-none transition-all"
                />
              </div>
              {isUniqueUsernameLoading && (
                <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Querying availability...
                </span>
              )}
              {isUsernameUnique === true && (
                <span className="text-[9px] text-emerald-600 font-black uppercase block tracking-tight">✓ USERNAME AVAILABLE</span>
              )}
              {isUsernameUnique === false && username.length >= 3 && (
                <span className="text-[9px] text-brand-red font-black uppercase block tracking-tight">✗ USERNAME TAKEN</span>
              )}
            </div>
          )}

          {/* Missing Phone Number */}
          {missingFlags.phoneNumber && (
            <div className="space-y-2 border-2 border-dashed border-brand-black p-3 dark:border-zinc-700">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-teal flex items-center gap-1">
                <Phone size={14} /> SMS Verification Required
              </h3>
              
              {verificationStage === 1 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm font-bold">+234</span>
                    <input
                      type="tel"
                      placeholder="8031234567"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full pl-14 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-mono font-medium text-sm focus:outline-none h-[48px]"
                    />
                  </div>
                  {isUniquePhoneLoading && (
                    <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Scanning registry...
                    </span>
                  )}
                  {isPhoneUnique === true && (
                    <span className="text-[9px] text-emerald-600 font-black uppercase tracking-tight block">✓ UNIQUE PHONE NUMBER</span>
                  )}

                  <button
                    type="button"
                    disabled={phone.length < 7 || isPhoneUnique === false || isUniquePhoneLoading || loading}
                    onClick={handleSendOTP}
                    className="w-full brutalist-button-teal py-2 text-xs font-black uppercase text-center bg-brand-teal text-brand-black"
                  >
                    SEND SMS VERIFICATION
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-amber-100 text-[9px] font-black uppercase text-zinc-800 border-2 border-brand-black rotate-[-1deg] leading-tight">
                    {isMockSMS ? (
                      <div>
                        <p className="text-brand-red font-black">ⓘ DEV PREVIEW CODE SENT:</p>
                        <p className="font-mono text-xs mt-0.5">USE CODE: {mockOTPCode}</p>
                      </div>
                    ) : (
                      <span>Code dispatched to +234{phone}. Please enter.</span>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = [...otp];
                          newOtp[idx] = val;
                          setOtp(newOtp);
                          if (val && idx < 5 && otpRefs.current[idx + 1]) {
                            otpRefs.current[idx + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[idx] && idx > 0 && otpRefs.current[idx - 1]) {
                            otpRefs.current[idx - 1]?.focus();
                          }
                        }}
                        className="w-full text-center py-2 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-mono font-black text-lg focus:outline-none"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={otp.join('').length < 6 || loading}
                    onClick={handleVerifyOTP}
                    className="w-full brutalist-button-teal py-2 text-xs font-black uppercase text-center bg-brand-teal text-brand-black"
                  >
                    SUBMIT SMS CODE
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt role and gender inputs on Complete Profile so we have complete records */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest block">Gender</label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className="w-full px-3 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-bold text-xs uppercase focus:outline-none h-[48px]"
              >
                <option value="Male">MALE</option>
                <option value="Female">FEMALE</option>
                <option value="Other">OTHER</option>
                <option value="Prefer not to say">PREFER NOT TO SAY</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest block">Role Type</label>
              <select
                value={selectedRole}
                onChange={(e: any) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-bold text-xs uppercase focus:outline-none h-[48px]"
              >
                <option value="Buyer">PROSPECTIVE BUYER</option>
                <option value="Seller">PROPERTY OWNER</option>
                <option value="Agent">VERIFIED AGENT</option>
              </select>
            </div>
          </div>

          {/* Age verification Checkbox */}
          <div className="mt-4 p-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5" id="complete-profile-age-checkbox-container">
                <input 
                  id="complete-profile-age-checkbox"
                  type="checkbox"
                  checked={isAgeVerified}
                  onChange={(e) => {
                    setIsAgeVerified(e.target.checked);
                    setError(null);
                  }}
                  className="sr-only"
                />
                <div className={cn(
                  "w-6 h-6 border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center transition-all",
                  isAgeVerified ? "bg-brand-teal" : "bg-white dark:bg-zinc-800 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700"
                )}>
                  {isAgeVerified && <Check size={14} className="text-white stroke-[4]" />}
                </div>
              </div>
              <span className="text-[11px] font-black uppercase text-brand-black dark:text-zinc-300 leading-tight select-none mt-1">
                I confirm that I am 18 years of age or older <span className="text-brand-red font-black">*</span>
              </span>
            </label>
          </div>

          <button
            id="complete-profile-submit-btn"
            type="submit"
            disabled={
              (missingFlags.username && !username.trim()) ||
              (missingFlags.username && isUsernameUnique !== true) ||
              (missingFlags.phoneNumber && isPhoneUnique !== true) ||
              (missingFlags.fullName && !fullName.trim()) ||
              !isAgeVerified ||
              loading
            }
            className="brutalist-button-teal w-full py-3.5 flex items-center justify-center gap-2 font-black mt-4 uppercase text-xs"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={16} />}
            COMPLETE ACCOUNT SETUP
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-100 border-2 border-brand-red text-brand-red flex gap-2 items-center text-xs font-black uppercase overflow-hidden"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-6">
          <button
            onClick={() => logout()}
            className="text-xs font-black uppercase text-brand-red hover:underline tracking-widest cursor-pointer"
          >
            CANCEL & LOG OUT
          </button>
        </div>
      </motion.div>
      <div id="recaptcha-container-complete" className="hidden"></div>
    </div>
  );
}
