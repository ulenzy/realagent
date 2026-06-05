import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { getUserAvatarUrl } from '../lib/avatar';

const AVATAR_SEEDS = ["Caleb", "Aria", "Jordan", "Elena", "Alex", "Nova", "Felix", "Kai"];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  
  const [username, setUsername] = useState('');
  const [surname, setSurname] = useState(user?.lastName || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [selectedAvatar, setSelectedAvatar] = useState('Caleb');
  
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync names if user details load after mount
  useEffect(() => {
    if (!firstName && !surname) {
      const fName = user?.firstName || '';
      const lName = user?.lastName || '';
      if (fName || lName) {
        setFirstName(fName);
        setSurname(lName);
      } else {
        const raw = user?.name || user?.displayName || '';
        if (raw) {
          const parts = raw.trim().split(/\s+/);
          if (parts.length === 1) {
            setFirstName(parts[0]);
          } else if (parts.length > 1) {
            setFirstName(parts[0]);
            setSurname(parts.slice(1).join(' '));
          }
        }
      }
    }
  }, [user?.firstName, user?.lastName, user?.name, user?.displayName, firstName, surname]);

  // Check username uniqueness
  const checkUsernameUniqueness = useCallback(async (nameVal: string) => {
    const cleanName = nameVal.trim().toLowerCase();
    
    if (cleanName.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
      setUsernameError("Alphanumeric characters and underscores only.");
      setUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', nameVal.trim()));
      const querySnapshot = await getDocs(q);
      
      let isUnique = true;
      querySnapshot.forEach((doc) => {
        if (doc.id !== user?.id) {
          isUnique = false;
        }
      });

      if (isUnique) {
        setUsernameAvailable(true);
        setUsernameError(null);
      } else {
        setUsernameAvailable(false);
        setUsernameError("This username is already taken.");
      }
    } catch (err) {
      console.error("Error checking username uniqueness:", err);
      // Fallback for guest mode/local storage
      setUsernameAvailable(true);
      setUsernameError(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [user?.id]);

  // Debounced username checking
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    const handler = setTimeout(() => {
      checkUsernameUniqueness(username);
    }, 500);

    return () => clearTimeout(handler);
  }, [username, checkUsernameUniqueness]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameAvailable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`;
      const combinedName = `${firstName.trim()} ${surname.trim()}`.trim();
      await updateUser({
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: surname.trim(),
        name: combinedName || username.trim(),
        avatarSeed: selectedAvatar,
        avatarUrl: finalAvatarUrl,
        onboardingCompleted: true,
        userStates: ['Default'],
        profileScore: 50, // Standard starting trust score
      });
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      alert(err.message || "Failed to complete onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-brand-gray dark:bg-[#040405] font-sans antialiased text-brand-black dark:text-zinc-100 selection:bg-brand-teal selection:text-white">
      <div className="w-full max-w-md">
        <motion.div
          key="onboarding-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] dark:shadow-[8px_8px_0px_0px_#14b8a6] p-6 sm:p-8"
        >
          {/* Logo Context */}
          <div className="text-center mb-6">
            <span className="bg-brand-teal text-white border-2 border-brand-black px-3 py-1 font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Welcome
            </span>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white mt-4">
              RealAgents Setup
            </h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mt-1">
              Configure your permanent profile identity
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preferred Avatar Selector */}
            <div className="space-y-2 text-center">
              <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                Select Your Avatar Profile
              </label>
              
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 border-4 border-brand-black dark:border-zinc-700 bg-brand-teal/10 p-2 shadow-brutal-sm rounded-none overflow-hidden flex items-center justify-center relative">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAvatar}`} 
                    alt="Selected Avatar Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {AVATAR_SEEDS.map((seed) => {
                  const isSelected = selectedAvatar === seed;
                  return (
                    <button
                      type="button"
                      key={seed}
                      onClick={() => setSelectedAvatar(seed)}
                      className={cn(
                        "p-1 border-2 border-brand-black bg-brand-gray dark:bg-zinc-800 dark:border-zinc-700 hover:border-brand-teal transition-all focus:outline-none flex items-center justify-center",
                        isSelected && "border-brand-teal bg-brand-teal/20 shadow-none scale-105"
                      )}
                    >
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} 
                        alt={seed}
                        className="w-8 h-8 rounded-none"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Username Selection Block */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center justify-between">
                <span>Choose Username <span className="text-brand-red font-black">*</span></span>
                {isCheckingUsername && (
                  <span className="flex items-center gap-1 text-[8px] text-zinc-400">
                    <Loader2 size={10} className="animate-spin" /> VERIFYING...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\s+/g, '');
                    setUsername(val);
                  }}
                  className={cn(
                    "w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-xs uppercase tracking-wider focus:outline-none transition-all placeholder-zinc-400",
                    usernameAvailable === true && "border-emerald-500",
                    usernameError && "border-brand-red"
                  )}
                  placeholder="e.g. LANDLORDPRO"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {usernameAvailable === true && (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  )}
                  {usernameError && (
                    <AlertCircle size={16} className="text-brand-red" />
                  )}
                </div>
              </div>

              {usernameAvailable === true && (
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">
                  Excellent! Username is available.
                </p>
              )}
              {usernameError && (
                <p className="text-[9px] font-bold text-brand-red uppercase tracking-wide">
                  {usernameError}
                </p>
              )}
            </div>

            {/* First Name & Surname Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  Surname <span className="text-brand-red font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-xs uppercase tracking-wider focus:outline-none focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                  placeholder="e.g. DEE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  First Name <span className="text-brand-red font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-brand-black dark:text-white font-black text-xs uppercase tracking-wider focus:outline-none focus:border-brand-teal focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-zinc-400"
                  placeholder="e.g. JOHN"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={!usernameAvailable || isSubmitting}
              className="w-full py-4 bg-brand-black dark:bg-brand-teal text-white dark:text-brand-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 border-brand-black dark:border-brand-teal shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Complete Activation <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
