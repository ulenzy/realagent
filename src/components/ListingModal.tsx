import React from 'react';
import { X, ShieldAlert, CheckCircle2, ClipboardCheck, Clock, Percent, AlertTriangle, FileText, UserCheck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export default function ListingModal({ isOpen, onClose, onAgree }: ListingModalProps) {
  const terms = [
    {
      icon: <UserCheck className="text-brand-teal" size={20} />,
      title: "RealAgent Subscription",
      desc: "Agent verification is no longer required, but having a RealAgent Subscription significantly improves your chances of sale and visibility."
    },
    {
      icon: <ClipboardCheck className="text-brand-teal" size={20} />,
      title: "Information Accuracy",
      desc: "Mandatory physical inspection is no longer required, but all information provided must be strictly correct. Accuracy is the user's responsibility."
    },
    {
      icon: <Clock className="text-brand-teal" size={20} />,
      title: "Rapid Verification",
      desc: "Property verification and listing activation takes approximately 24 hours post-submission."
    },
    {
      icon: <Percent className="text-brand-teal" size={20} />,
      title: "Flexible Commission",
      desc: "No more fixed platform commission. Agents decide their own commission (0.5%-5% for sales, 10%-20% A&L for rentals) which reflects on the listing."
    },
    {
      icon: <Clock className="text-brand-teal" size={20} />,
      title: "Auto-Removal Timer",
      desc: "Exclusive notice is no longer needed. If a property is sold and not manually removed, our automated timer will take down the listing."
    },
    {
      icon: <CheckCircle2 className="text-brand-teal" size={20} />,
      title: "Marketing Promotional Rights",
      desc: "RealAgents reserves the right to use property images during marketing promotional content and social media marketing."
    },
    {
      icon: <AlertTriangle className="text-brand-red" size={20} />,
      title: "Liability & Compliance",
      desc: "RealAgent is not liable for negotiation fallouts. All properties must comply with local zoning and development laws."
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-[#1c1c21] border-4 border-brand-black dark:border-zinc-700 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-aggressive overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-4 border-brand-black dark:border-zinc-700 bg-brand-teal/10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-display font-black italic tracking-tight text-brand-black dark:text-white uppercase">
              Listing Terms & Conditions
            </h2>
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mt-1">Read carefully before proceeding</span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 border-2 border-brand-black dark:border-zinc-700 bg-brand-red text-white shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 gap-6">
            {terms.map((term, index) => (
              <div key={index} className="flex gap-4 p-4 border-2 border-brand-black/10 dark:border-zinc-800 bg-brand-gray/30 dark:bg-zinc-900/50 hover:border-brand-black transition-colors group">
                <div className="shrink-0 p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-brutal-xs group-hover:-translate-y-0.5 transition-transform">
                  {term.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-brand-black dark:text-zinc-200">
                    {term.title}
                  </h4>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-tight">
                    {term.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-4 border-brand-black dark:border-zinc-700 bg-brand-gray dark:bg-zinc-900 flex flex-col gap-4">
          <button 
            onClick={onAgree}
            className="w-full bg-brand-teal text-brand-black py-4 font-display font-black uppercase tracking-widest text-lg border-2 border-brand-black shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            I Agree to these Terms
          </button>
          <p className="text-[9px] text-zinc-500 font-black uppercase text-center tracking-widest italic">
            By clicking agree, you acknowledge that you have read and understood all processing guidelines.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
