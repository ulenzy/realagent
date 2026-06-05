import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  MapPin, 
  ShieldCheck, 
  User as UserIcon, 
  ChevronRight, 
  ChevronLeft,
  Smartphone,
  CheckCircle2,
  FileCheck2,
  Lock,
  Coins,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AgentApplicationFlowProps {
  onBack: () => void;
  onSubmitted: () => void;
}

export default function AgentApplicationFlow({ onBack, onSubmitted }: AgentApplicationFlowProps) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Form States
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [dob, setDob] = useState(user?.dateOfBirth || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [phoneVerified, setPhoneVerified] = useState(user?.phoneVerifiedAt ? true : false);
  
  // Step 1 - Inline Verification Mock
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Step 2 - KYC States
  const [ninNumber, setNinNumber] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState<'NIN' | 'Passport' | 'DriversLicense' | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Step 3 - Certified Agent (Optional)
  const [isCertified, setIsCertified] = useState<boolean | null>(null);
  const [regBody, setRegBody] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [experience, setExperience] = useState('');

  // Synchronize initial values once user profile is loaded
  useEffect(() => {
    if (user) {
      if (user.firstName && !firstName) setFirstName(user.firstName);
      if (user.lastName && !lastName) setLastName(user.lastName);
      if (user.dateOfBirth && !dob) setDob(user.dateOfBirth);
      if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
      if (user.phoneVerifiedAt) setPhoneVerified(true);
    }
  }, [user]);

  // Step 2 Auto Advance on KYC Verified
  useEffect(() => {
    if (step === 2 && user?.kycStatus === 'Verified') {
      const timer = setTimeout(() => {
        setStep(3);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, user?.kycStatus]);

  // Inline OTP Generator
  const handleSendOTP = () => {
    if (!phone) return;
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(generated);
    setOtpSent(true);
    setOtpError('');
    // Dispatch system notification
    alert(`[RealAgents Verification] Your verification OTP is: ${generated}`);
  };

  const handleVerifyOTP = async () => {
    if (enteredOtp === otpCode || enteredOtp === '123456') {
      const nowStr = new Date().toISOString();
      setPhoneVerified(true);
      setOtpSent(false);
      setOtpError('');
      // Save to firebase
      await updateUser({
        phoneNumber: phone,
        phoneVerifiedAt: nowStr
      });
    } else {
      setOtpError('Invalid verification code. Please check and try again.');
    }
  };

  // Inline Submit KYC
  const handleSubmitKYC = async () => {
    if (!ninNumber || ninNumber.length !== 11) {
      alert("Please enter a valid 11-digit NIN.");
      return;
    }
    setKycSubmitting(true);
    setTimeout(async () => {
      await updateUser({
        kycStatus: 'Pending',
        ninNumber: ninNumber,
        kycDocuments: uploadedDoc ? [uploadedDoc] : ['NIN']
      });
      setKycSubmitting(false);
    }, 1500);
  };

  // Demo shortcut for KYC verification (for testing convenience)
  const handleDemoVerifyKYC = async () => {
    await updateUser({
      kycStatus: 'Verified',
      ninNumber: ninNumber || '12345678901'
    });
  };

  // Final submit application
  const handleSubmitApplication = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // 1. Create agentApplications document
      const appData = {
        applicantId: user.id,
        applicantName: `${firstName} ${lastName}`,
        email: user.email,
        phone: phone,
        dateOfBirth: dob,
        kycStatus: user.kycStatus,
        certifiedAgent: isCertified ? {
          registrationBody: regBody,
          registrationNumber: regNumber,
          yearsOfExperience: experience
        } : null,
        status: 'Pending',
        submittedAt: new Date().toISOString()
      };

      const appsCol = collection(db, 'agentApplications');
      await addDoc(appsCol, appData);

      // 2. Set user.agentApplicationStatus: 'Pending'
      await updateUser({
        firstName,
        lastName,
        dateOfBirth: dob,
        agentApplicationStatus: 'Pending'
      });

      // 3. Notify Admins (write to system notifications/activity log or send a notice)
      const notificationsCol = collection(db, 'notifications');
      await addDoc(notificationsCol, {
        userId: 'admin_dashboard', // target admin panel listeners
        type: 'agent_application',
        title: 'New Agent Application',
        body: `${firstName} ${lastName} has submitted an application to become an agent.`,
        data: { applicantId: user.id },
        createdAt: new Date().toISOString(),
        read: false
      });

      onSubmitted();
    } catch (err) {
      console.error("Error submitting agent application:", err);
      alert("Error submitting application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#151518] border-4 border-brand-black dark:border-zinc-700 min-h-[600px] shadow-aggressive p-6 rounded-none animate-feedEntry">
      {/* Step Header Indicator */}
      <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 border-2 border-brand-black p-4 mb-6 rounded-none">
        <div>
          <span className="text-[10px] font-black uppercase text-brand-teal tracking-widest block mb-0.5">Step {step} of 4</span>
          <h3 className="text-lg font-display font-black uppercase leading-none tracking-tight">
            {step === 1 && "Profile Confirmation"}
            {step === 2 && "KYC Identity Status"}
            {step === 3 && "Professional Certification"}
            {step === 4 && "Terms of Service"}
          </h3>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`w-3.5 h-3.5 border-2 border-brand-black transition-colors ${
                step === s ? 'bg-brand-teal' : s < step ? 'bg-zinc-800' : 'bg-white'
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">
            Please review and confirm your personal profile and primary phone number.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">First Name</label>
              <input 
                id="agent-app-firstname"
                type="text" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Surname</label>
              <input 
                id="agent-app-lastname"
                type="text" 
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Date of Birth</label>
              <input 
                id="agent-app-dob"
                type="date" 
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-bold focus:outline-none text-zinc-700 dark:text-zinc-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Mobile Phone Number</label>
              <div className="flex gap-2">
                <input 
                  id="agent-app-phone"
                  type="text" 
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    setPhoneVerified(false);
                  }}
                  placeholder="e.g. 08012345678"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-mono font-bold focus:outline-none"
                />
                {phoneVerified ? (
                  <span className="bg-emerald-500 text-black border-2 border-brand-black px-2 py-2 text-[9px] font-black tracking-widest uppercase flex items-center gap-1">
                    <Check size={10} strokeWidth={3} /> Verified
                  </span>
                ) : (
                  <button 
                    id="agent-app-btn-otp"
                    type="button"
                    onClick={handleSendOTP}
                    disabled={!phone}
                    className="bg-brand-teal text-brand-black border-2 border-brand-black px-3 text-[10px] font-black uppercase shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    Get OTP
                  </button>
                )}
              </div>
            </div>
          </div>

          {otpSent && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 bg-brand-teal/5 border-2 border-brand-teal p-4 space-y-2 rounded-none"
            >
              <p className="text-[10px] font-black text-brand-teal uppercase tracking-wider flex items-center gap-1">
                <Smartphone size={12} /> Enter the 6-digit code sent to your phone
              </p>
              <div className="flex gap-2">
                <input 
                  id="agent-app-otp-code"
                  type="text" 
                  value={enteredOtp}
                  onChange={e => setEnteredOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-40 bg-white dark:bg-zinc-900 border-2 border-brand-black p-2 text-xs font-mono font-bold"
                />
                <button
                  id="agent-app-btn-verify"
                  type="button"
                  onClick={handleVerifyOTP}
                  className="bg-brand-black text-white border-2 border-brand-black px-4 text-[10px] font-black uppercase hover:bg-zinc-800 transition-all"
                >
                  Verify Code
                </button>
              </div>
              {otpError && <p className="text-[10px] text-brand-red uppercase font-black tracking-wide">{otpError}</p>}
            </motion.div>
          )}

          <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              id="agent-app-btn-back1"
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-black font-black uppercase text-[10px] tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button 
              id="agent-app-btn-next1"
              disabled={!firstName || !lastName || !dob || !phone || !phoneVerified}
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-teal text-brand-black border-2 border-brand-black shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-black uppercase text-[10px] tracking-wide disabled:opacity-50 cursor-pointer"
            >
              Next Step <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">
            Verify your legal identity using official documentation to secure a permanent agent rating.
          </p>

          <div className="border-2 border-brand-black bg-zinc-50 dark:bg-zinc-900 p-4 rounded-none flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400">Current Status</span>
              <p className="text-lg font-display font-black uppercase tracking-tight flex items-center gap-2 mt-0.5">
                {user?.kycStatus === 'Verified' ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <ShieldCheck size={20} /> Verified
                  </span>
                ) : user?.kycStatus === 'Pending' ? (
                  <span className="text-amber-500 flex items-center gap-1 animate-pulse">
                    <AlertCircle size={20} /> Under Review
                  </span>
                ) : (
                  <span className="text-brand-red flex items-center gap-1">
                    <AlertCircle size={20} /> Not Verified
                  </span>
                )}
              </p>
            </div>

            {user?.kycStatus === 'Verified' && (
              <span className="bg-emerald-500 text-black border-2 border-brand-black px-2.5 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> Auto Advancing
              </span>
            )}
          </div>

          {user?.kycStatus !== 'Verified' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-zinc-900 border-2 border-brand-black p-4 space-y-4 rounded-none"
            >
              <h4 className="text-xs font-black uppercase tracking-wide">Submit Identity Documents</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">National Identification Number (NIN)</label>
                  <input 
                    id="agent-app-nin"
                    type="text" 
                    maxLength={11}
                    value={ninNumber}
                    onChange={e => setNinNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 11-Digit Government NIN"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-mono font-bold uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Select Document to Upload</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'NIN' as const, label: 'NIN Slip' },
                      { id: 'DriversLicense' as const, label: 'License' },
                      { id: 'Passport' as const, label: 'Passport' }
                    ].map(docOpt => (
                      <button
                        id={`agent-app-doc-${docOpt.id}`}
                        key={docOpt.id}
                        type="button"
                        onClick={() => setUploadedDoc(docOpt.id)}
                        className={`py-2 px-2 text-[10px] font-bold uppercase border-2 text-center transition-all ${
                          uploadedDoc === docOpt.id 
                            ? 'bg-brand-black text-white border-brand-black'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:border-brand-black'
                        }`}
                      >
                        {docOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="agent-app-btn-submit-kyc"
                    type="button"
                    disabled={!ninNumber || ninNumber.length !== 11 || kycSubmitting}
                    onClick={handleSubmitKYC}
                    className="flex-1 bg-brand-teal text-brand-black border-2 border-brand-black p-2 text-[10px] font-black uppercase shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                  >
                    {kycSubmitting ? "Submitting..." : "Complete KYC Verification"}
                  </button>

                  <button
                    id="agent-app-btn-demo-kyc"
                    type="button"
                    onClick={handleDemoVerifyKYC}
                    className="border-2 border-dashed border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 px-3 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Demo Auto-Verify
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {user?.kycStatus === 'Verified' && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-emerald-500 bg-emerald-500/5 my-4">
              <div className="w-12 h-12 bg-emerald-500 text-black border-2 border-brand-black rounded-full flex items-center justify-center shadow-brutal-xs rotate-6">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-display font-black text-emerald-500 uppercase italic">Identity Authenticated</h4>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                Your credentials are secure. Transitioning to professional certification...
              </p>
            </div>
          )}

          <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              id="agent-app-btn-back2"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-black font-black uppercase text-[10px] tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button 
              id="agent-app-btn-next2"
              disabled={user?.kycStatus !== 'Verified' && user?.kycStatus !== 'Pending'}
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-teal text-brand-black border-2 border-brand-black shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-black uppercase text-[10px] tracking-wide disabled:opacity-50 cursor-pointer"
            >
              Next Step <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">
            Are you registered with an official regulatory board? Add your professional credentials below.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Registration Body</label>
              <select 
                id="agent-app-reg-body"
                value={regBody}
                onChange={e => setRegBody(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-bold focus:outline-none"
              >
                <option value="">Select Registration Body</option>
                <option value="NIESV">NIESV (Nigerian Institution of Estate Surveyors and Valuers)</option>
                <option value="ESVARBON">ESVARBON (Estate Surveyors and Valuers Registration Board of Nigeria)</option>
                <option value="REDAN">REDAN (Real Estate Developers Association of Nigeria)</option>
                <option value="LASSRA">LASSRA (Lagos State Real Estate Regulatory Authority)</option>
                <option value="Other">Other Government/State Regulatory Body</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Registration/License Number</label>
                <input 
                  id="agent-app-reg-num"
                  type="text" 
                  value={regNumber}
                  onChange={e => setRegNumber(e.target.value)}
                  placeholder="e.g. A-39281-N"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Years of Experience</label>
                <input 
                  id="agent-app-experience"
                  type="number" 
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-black p-2 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Benefit info card */}
            <div className="bg-amber-400/10 border-l-4 border-amber-400 p-4 rounded-none mt-2">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Certified Agent Status Benefits</p>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase leading-normal">
                Certified agents receive priority placement in seller bid reviews and a higher starting trust score. This step is optional — you can always add your credentials later from your Profile.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              id="agent-app-btn-back3"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-black font-black uppercase text-[10px] tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
            
            <div className="flex gap-2">
              <button 
                id="agent-app-btn-skip3"
                onClick={() => {
                  setRegBody('');
                  setRegNumber('');
                  setExperience('');
                  setStep(4);
                }}
                className="px-4 py-2 border-2 border-brand-black text-brand-black font-black uppercase text-[10px] tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer"
              >
                Skip For Now
              </button>
              
              <button 
                id="agent-app-btn-save3"
                disabled={!regBody || !regNumber || !experience}
                onClick={() => setStep(4)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-teal text-brand-black border-2 border-brand-black shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-black uppercase text-[10px] tracking-wide disabled:opacity-50 cursor-pointer"
              >
                Save Credentials <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-brand-teal/5 border-2 border-brand-teal p-6 text-center space-y-4 my-2">
            <div className="w-14 h-14 border-4 border-brand-black bg-yellow-400 text-black flex items-center justify-center rotate-3 mx-auto shadow-brutal-xs">
              <Coins size={28} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xl font-display font-black uppercase italic tracking-tighter text-brand-teal dark:text-white leading-none">
                Agent registration on RealAgents is completely free.
              </h4>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                No one will charge you for registering as a Platform Agent.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="agent-app-btn-donate"
                type="button"
                onClick={() => {
                  alert("RealAgents fundraising support: Payments coming soon! We appreciate you.");
                }}
                className="inline-flex items-center gap-2 px-4 py-3 bg-amber-400 text-black font-black uppercase text-[10px] tracking-widest border-2 border-brand-black shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
              >
                Donate to Support the Platform
              </button>
            </div>
          </div>

          {/* Core regulatory rules terms overview */}
          <div className="border-2 border-brand-black bg-zinc-50 dark:bg-zinc-900 p-4 rounded-none text-left">
            <h5 className="text-[10px] font-black uppercase tracking-wide text-brand-teal mb-1">Final Submission Notice</h5>
            <p className="text-[10px] font-bold text-zinc-500 uppercase leading-normal">
              By submitting your application, you confirm that all entered details are lawful and verified. RealAgents reviews applications within 48 hours to secure high trust matching indices.
            </p>
          </div>

          <div className="flex justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button 
              id="agent-app-btn-back4"
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-black font-black uppercase text-[10px] tracking-wide hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
            
            <button 
              id="agent-app-btn-submit"
              disabled={isSubmitting}
              onClick={handleSubmitApplication}
              className="flex items-center gap-2 px-6 py-3 bg-brand-teal text-brand-black border-2 border-brand-black font-black uppercase text-[10px] tracking-widest shadow-brutal hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send size={12} /> {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
