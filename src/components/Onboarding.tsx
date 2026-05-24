import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Shield, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { User } from '../types';

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    name: user?.name || '',
    gender: user?.gender || 'Prefer not to say'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.name) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateUser({
        ...formData,
        onboardingCompleted: true,
        profileScore: 20 // Initial boost for completing onboarding
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray dark:bg-[#0a0a0b] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-800 shadow-aggressive p-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-brand-teal border-4 border-brand-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
            <UserIcon className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-brand-black dark:text-white leading-tight">
            Identity Setup
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Configure your professional presence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                First Name <span className="text-brand-red">*</span>
              </label>
              <input 
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="brutalist-input-small dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="Entry"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                Last Name <span className="text-brand-red">*</span>
              </label>
              <input 
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="brutalist-input-small dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="Surname"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
              Display Username <span className="text-brand-red">*</span>
            </label>
            <input 
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="brutalist-input-small dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              placeholder="e.g. AgentProphet"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1">
              Gender Identity
            </label>
            <select 
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="brutalist-input-small dark:bg-zinc-800 dark:border-zinc-700 dark:text-white appearance-none"
            >
              <option value="Prefer not to say">Select Identity</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Non-Binary / Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border-2 border-red-500 text-red-600 text-[10px] font-black uppercase animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-black text-white hover:bg-zinc-800 py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-transform active:translate-y-1 shadow-aggressive"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Check size={18} className="text-brand-teal" />
                COMPLETE INITIALIZATION
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-zinc-100 dark:border-zinc-800 flex items-center gap-3 grayscale opacity-60">
           <Shield size={16} />
           <p className="text-[8px] font-bold uppercase text-zinc-400 leading-tight">
             All personal data is encrypted. Identity verification required for premium marketplace operations.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
