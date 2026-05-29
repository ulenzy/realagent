import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Facebook, Shield, AlertCircle, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function Login() {
  const { 
    signInWithGoogle, 
    signInWithFacebook, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogleMock, 
    signInWithFacebookMock 
  } = useAuth();
  
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState(0);

  // Email login state
  const [useEmail, setUseEmail] = useState(false);
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Simple rate limiting
  const isRateLimited = () => {
    const now = Date.now();
    if (now - lastAttempt < 2000) {
      setError('Too many attempts. Please wait a moment.');
      return true;
    }
    setLastAttempt(now);
    return false;
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    if (isRateLimited()) return;
    
    setLoading(provider);
    setError(null);
    
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'facebook') await signInWithFacebook();
    } catch (err: any) {
      console.error(`${provider} sign-in error:`, err);
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setError('Sign in cancelled. The authentication window was closed.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        setError('Only one sign-in window can be active at a time.');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setError('Sign in window was blocked. Please allow popups for this site.');
      } else {
        setError(err.message || `Failed to sign in with ${provider}`);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRateLimited()) return;

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (emailMode === 'signup' && !fullName) {
      setError('Please enter your full name.');
      return;
    }

    setLoading('email');
    setError(null);

    try {
      if (emailMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      // Beautiful human errors
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('The email address is already in use by another account.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to authenticate via email.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b] p-4 font-sans select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-aggressive p-8"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-brand-teal border-4 border-brand-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-brand-black dark:text-white uppercase transition-colors">
            RealAgents<span className="text-brand-teal">.</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Premium Marketplace Access</p>
        </div>

        {/* Mode Selector Tab */}
        <div className="flex border-4 border-brand-black mb-6 bg-brand-gray dark:bg-zinc-800 p-1">
          <button 
            type="button"
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all",
              !useEmail ? "bg-brand-black text-white px-2" : "text-brand-black dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            )}
            onClick={() => { setUseEmail(false); setError(null); }}
          >
            Social Sign-in
          </button>
          <button 
            type="button"
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all",
              useEmail ? "bg-brand-black text-white px-2" : "text-brand-black dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            )}
            onClick={() => { setUseEmail(true); setError(null); }}
          >
            Email Login
          </button>
        </div>

        {!useEmail ? (
          /* OAuth Sign-in Panel */
          <div className="space-y-4">
            <button
              onClick={() => handleOAuthSignIn('google')}
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
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={!!loading}
              className={cn(
                "brutalist-button-white w-full py-4 flex items-center justify-center gap-3 font-bold border-brand-black",
                loading === 'facebook' && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading === 'facebook' ? <Loader2 className="animate-spin" /> : <Facebook size={20} />}
              CONTINUE WITH FACEBOOK
            </button>
          </div>
        ) : (
          /* Email Sign-in/Sign-up Panel */
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {emailMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Musa Aminu"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-black dark:text-zinc-300 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-550" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-2 border-brand-black text-brand-black dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!!loading}
              className={cn(
                "brutalist-button-teal w-full py-3.5 flex items-center justify-center gap-2 font-bold mt-4",
                loading === 'email' && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading === 'email' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {emailMode === 'signin' ? 'AUTHENTICATE ACCESS' : 'CREATE NEW ACCOUNT'}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="text-xs font-extrabold text-brand-teal hover:underline uppercase tracking-wide cursor-pointer"
                onClick={() => {
                  setEmailMode(emailMode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
              >
                {emailMode === 'signin' ? "Need a workspace account? Sign up" : "Already have a registered profile? Sign in"}
              </button>
            </div>
          </form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-50 dark:bg-zinc-800 border-2 border-red-500 text-red-600 dark:text-red-400 flex flex-col gap-3 overflow-hidden select-none"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-bold uppercase leading-tight">{error}</p>
              </div>

              {/* Secure simulated authentication bypass for sandbox environments */}
              {(error.includes('window was closed') || error.includes('blocked') || error.includes('Only one sign-in') || error.includes('failed') || error.includes('cancelled')) && (
                <div className="p-3 bg-white dark:bg-zinc-900 border-2 border-red-500 text-brand-black dark:text-white flex flex-col gap-2 mt-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 leading-tight">
                    Popups are typically blocked or fail to communicate back in the sandboxed preview iframe.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOAuthSignIn('google').catch(() => {})}
                      className="bg-brand-black hover:bg-brand-teal dark:bg-zinc-800 text-white p-2 text-[10px] font-black border-2 border-brand-black hover:border-brand-teal uppercase tracking-widest text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      MOCK GOOGLE
                    </button>
                    <button
                      onClick={() => handleOAuthSignIn('facebook').catch(() => {})}
                      className="bg-brand-black hover:bg-brand-teal dark:bg-zinc-800 text-white p-2 text-[10px] font-black border-2 border-brand-black hover:border-brand-teal uppercase tracking-widest text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      MOCK FACEBOOK
                    </button>
                  </div>
                </div>
              )}
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
