import React, { useState } from 'react';
import ListingModal from './ListingModal';
import ListingForm from './ListingForm';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { ListingRequest } from '../types';

interface ListPropertyFlowProps {
  onBack: () => void;
  onSubmit: (request: Omit<ListingRequest, 'id' | 'status' | 'submittedAt' | 'lastUpdated'>) => void;
}

export default function ListPropertyFlow({ onBack, onSubmit }: ListPropertyFlowProps) {
  const [showModal, setShowModal] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAgree = () => {
    setHasAgreed(true);
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!hasAgreed) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21]">
      <div className="flex items-center gap-4 p-6 border-b-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-brutal-sm">
        <button 
          onClick={onBack}
          className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-display font-black italic uppercase tracking-tighter">
          List <span className="text-brand-teal">Property</span>
        </h1>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!hasAgreed ? (
            <motion.div 
              key="agreement-cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <h2 className="text-2xl font-display font-black mb-4">Agreement Required</h2>
              <button 
                onClick={() => setShowModal(true)}
                className="brutalist-button-teal px-8"
              >
                Review Terms
              </button>
            </motion.div>
          ) : (
            <ListingForm onBack={onBack} onSubmit={onSubmit} />
          )}
        </AnimatePresence>
      </div>

      <ListingModal 
        isOpen={showModal} 
        onClose={handleCloseModal} 
        onAgree={handleAgree} 
      />
    </div>
  );
}
