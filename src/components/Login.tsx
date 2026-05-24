import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Github, Mail, Facebook, UserCircle, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function Login() {
  const { signInWithGoogle, signInWithFacebook, signInAsGuest } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState(0);

  // Simple brute-force protection (rate limiting)
  const isRateLimited = () => {
    const now = Date.now();
    if (now - lastAttempt < 3000) { // 3 seconds between attempts
      setError('Too many attempts. Please wait a moment.');
      return true;
    }
    setLastAttempt(now);
    return false;
  };

  const handleSignIn = async (provider: 'google' | 'facebook' | 'guest') => {
    if (isRateLimited()) return;
    
    setLoading(provider);
    setError(null);
    
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'facebook') await signInWithFacebook();
      if (provider === 'guest') await signInAsGuest();
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-aggressive p-8"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-brand-teal border-4 border-brand-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-brand-black dark:text-white uppercase">
            RealAgents<span className="text-brand-teal">.</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Premium Marketplace Access</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleSignIn('google')}
            disabled={!!loading}
            className={cn(
              "brutalist-button-white w-full py-4 flex items-center justify-center gap-3 font-bold",
              loading === 'google' && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading === 'google' ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
            CONTINUE WITH GOOGLE
          </button>

          <button
            onClick={() => handleSignIn('facebook')}
            disabled={!!loading}
            className={cn(
              "brutalist-button-white w-full py-4 flex items-center justify-center gap-3 font-bold border-brand-black",
              loading === 'facebook' && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading === 'facebook' ? <Loader2 className="animate-spin" /> : <Facebook size={20} />}
            CONTINUE WITH FACEBOOK
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500 font-bold">Or try first</span>
            </div>
          </div>

          <button
            onClick={() => handleSignIn('guest')}
            disabled={!!loading}
            className={cn(
              "brutalist-button-teal w-full py-4 flex items-center justify-center gap-3 font-bold",
              loading === 'guest' && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading === 'guest' ? <Loader2 className="animate-spin" /> : <UserCircle size={20} />}
            ENTER AS GUEST
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-100 border-2 border-red-500 text-red-600 flex items-start gap-3 overflow-hidden"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold uppercase leading-tight">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-8 text-center text-xs text-zinc-400 font-medium uppercase tracking-widest">
            Identity verification and secure transactions guaranteed.
        </p>
      </motion.div>
    </div>
  );
}
