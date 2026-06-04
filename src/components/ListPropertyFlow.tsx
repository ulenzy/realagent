import React, { useState, useEffect } from 'react';
import BuildingListingForm from './BuildingListingForm';
import LandListingForm from './LandListingForm';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldAlert, CheckCircle, CreditCard, Coins, Check, FileText, Building2, Map, Home, Trees } from 'lucide-react';

import { ListingRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export default function ListPropertyFlow() {
  const { user, updateUser, updateTokens, addTransaction, listingRequests, addListingRequest, drafts, saveDraft } = useAuth();
  const { handleBackToMarketplace: onBack, setIsListingFlow, setActiveTab } = useNavigation();


  const [listingCategory, setListingCategory] = useState<'Building' | 'Land' | null>(null);
  const [monthlyFeePaidState, setMonthlyFeePaidState] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestTitle, setSubmittedRequestTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if seller has an active monthly listing
  const nowISO = new Date().toISOString();
  const hasActiveListing = listingRequests.some(
    (req) => req.monthlyFeeExpiresAt && req.monthlyFeeExpiresAt > nowISO
  );

  const monthlyFeePaid = monthlyFeePaidState || (user?.listingFeeStatus === 'Monthly Paid' && user?.monthlyFeeExpiresAt && user.monthlyFeeExpiresAt > nowISO);


  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 border-4 border-brand-black m-6 rounded-none shadow-brutal-md">
        <ShieldAlert size={48} className="text-zinc-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-display font-black uppercase tracking-tight text-brand-black dark:text-white">Access Restricted</h2>
        <p className="text-xs text-zinc-500 uppercase font-bold mt-2">Please log in to list properties</p>
      </div>
    );
  }

  // --- 0. KYC check ---
  if (user.kycStatus !== 'Verified') {
    const isPending = user.kycStatus === 'Pending';
    return (
      <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6 flex flex-col justify-center items-center">
        <div className="max-w-xl w-full bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-md text-center">
          <div className="w-16 h-16 bg-red-100/10 text-brand-red flex items-center justify-center rounded-full mx-auto mb-6 border-4 border-brand-black dark:border-zinc-700">
            <ShieldAlert size={32} />
          </div>
          
          <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2 dark:text-white">KYC Required</h2>
          
          <div className="mb-6">
            {isPending ? (
              <span className="bg-amber-100 border-2 border-brand-black dark:border-zinc-700 text-amber-700 px-3 py-1 text-xs font-black uppercase tracking-wider inline-block">
                UNDER REVIEW
              </span>
            ) : (
              <span className="bg-red-100 border-2 border-brand-black dark:border-zinc-700 text-brand-red px-3 py-1 text-xs font-black uppercase tracking-wider inline-block">
                NOT STARTED
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-500 font-bold uppercase tracking-tight mb-8 leading-relaxed">
            You must complete identity verification before listing a property on RealAgents.
          </p>
          
          <button
            onClick={() => {
              setActiveTab('profile');
              onBack();
            }}
            className="brutalist-button-teal w-full py-4 text-xs font-black uppercase tracking-wider shadow-brutal-xs"
          >
            Complete KYC
          </button>
        </div>
      </div>
    );
  }

  // --- 1. Property Verification check ---
  if (!user.verifiedPropertySeller) {
    const handlePayVerificationFee = async () => {
      const now = new Date().toISOString();
      await updateUser({
        verifiedPropertySeller: true,
        verificationFeePaidAt: now,
        // Optional verification fee stub object as required
        verificationFeeStub: {
          amount: 20000,
          status: 'pending',
          reference: `vf-${Date.now()}`,
        } as any,
      });
    };

    return (
      <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6">
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-md">
          <div className="text-center mb-8">
            <span className="bg-amber-100 border-2 border-brand-black dark:border-zinc-700 text-amber-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-brutal-xs inline-block mb-3">
              One-Time Required Gate
            </span>
            <h2 className="text-3xl font-display font-black tracking-tighter dark:text-white uppercase">ONE-TIME PROPERTY VERIFICATION</h2>
            <div className="text-4xl font-display font-black text-brand-teal my-3 tracking-widest">
              ₦20,000
            </div>
            <p className="text-sm text-zinc-500 font-bold uppercase tracking-tight">
              Paid once. All your future listings on RealAgents are covered.
            </p>
          </div>

          <div className="bg-brand-gray dark:bg-zinc-800 p-6 border-2 border-brand-black dark:border-zinc-700 mb-8 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wide border-b-2 border-zinc-300 dark:border-zinc-700 pb-2 dark:text-zinc-200">
              What Verification Covers:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-brand-teal text-brand-black border-2 border-brand-black rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase dark:text-white">Document Review</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Strict manual cross-referencing with property registers.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-brand-teal text-brand-black border-2 border-brand-black rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase dark:text-white">AI Screening</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Metadata checking, duplicate search, intelligence verification.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-brand-teal text-brand-black border-2 border-brand-black rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase dark:text-white">Admin Approval</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Human checks to confirm valid pricing, titles, and agent assignments.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-brand-teal text-brand-black border-2 border-brand-black rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase dark:text-white">Platform Trust Badge</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Higher subscriber engagement, confidence rating, secure deals.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handlePayVerificationFee}
            className="brutalist-button-teal w-full py-4 text-sm font-black uppercase tracking-wider shadow-brutal-sm"
          >
            PAY ₦20,000
          </button>

          <div className="mt-6 text-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
              Secure payment powered by Paystack — coming soon. Your verification is being processed.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. Monthly Listing Fee check ---
  if (hasActiveListing && !monthlyFeePaid) {
    const handlePayMonthlyNaira = async () => {
      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 30 * 86400000).toISOString();
      try {
        await updateUser({
          listingFeeStatus: 'Monthly Paid',
          monthlyFeePaidAt: now,
          monthlyFeeExpiresAt: expires,
        });
        setMonthlyFeePaidState(true);
      } catch (err: any) {
        console.error('Error paying monthly fee via Naira:', err);
      }
    };

    const handlePayMonthlyTokens = async () => {
      if (user.tokens < 200) {
        setTokenError('Insufficient tokens — top up in Profile');
        return;
      }
      setTokenError(null);

      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 30 * 86400000).toISOString();

      try {
        await updateTokens(-200);
        await addTransaction({
          id: `tx-${Date.now()}`,
          type: 'Debit',
          amount: 200,
          description: 'Monthly listing fee payment',
          timestamp: now,
        });

        await updateUser({
          listingFeeStatus: 'Monthly Paid',
          monthlyFeePaidAt: now,
          monthlyFeeExpiresAt: expires,
        });
        setMonthlyFeePaidState(true);
      } catch (err: any) {
        console.error('Error paying monthly fee via wallet tokens:', err);
        setTokenError('Failed to pay with tokens. Please try again.');
      }
    };

    return (
      <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6">
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-md">
          <div className="text-center mb-8">
            <span className="bg-emerald-100 border-2 border-brand-black dark:border-zinc-700 text-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-brutal-xs inline-block mb-3">
              Secondary Listing Gate
            </span>
            <h2 className="text-3xl font-display font-black tracking-tighter dark:text-white uppercase">MONTHLY LISTING FEE</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight mt-2">
              ₦3,690 or 200 tokens per listing per month.
            </p>
          </div>

          {tokenError && (
            <div className="mb-6 p-3 bg-red-100 border-2 border-brand-black text-brand-red text-xs font-black uppercase">
              {tokenError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Pay Naira Option */}
            <div className="border-4 border-brand-black p-6 bg-brand-gray dark:bg-zinc-800 flex flex-col justify-between shadow-brutal-xs">
              <div>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 border-2 border-brand-black flex items-center justify-center mb-4">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-sm font-black uppercase dark:text-zinc-150">Pay with Naira</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-normal">
                  Standard checkout. Fast confirmation via bank transfer or card proxy.
                </p>
                <div className="text-xl font-display font-black text-brand-black dark:text-white my-4">
                  ₦3,690/mo
                </div>
              </div>
              <button
                onClick={handlePayMonthlyNaira}
                className="brutalist-button-teal w-full py-2.5 text-[11px]"
              >
                PAY ₦3,690
              </button>
            </div>

            {/* Use Tokens Option */}
            <div className="border-4 border-brand-black p-6 bg-brand-gray dark:bg-zinc-800 flex flex-col justify-between shadow-brutal-xs">
              <div>
                <div className="w-10 h-10 bg-amber-100 text-amber-600 border-2 border-brand-black flex items-center justify-center mb-4">
                  <Coins size={20} />
                </div>
                <h3 className="text-sm font-black uppercase dark:text-zinc-150">Use Token Balance</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 leading-normal">
                  Instant activation. Deducted directly from your in-app token wallet.
                </p>
                <div className="text-xl font-display font-black text-amber-500 my-4 flex items-center gap-1.5 justify-start">
                  200 Tokens
                  <span className="text-[10px] text-zinc-400 font-sans lowercase">({user.tokens || 0} active)</span>
                </div>
              </div>
              <button
                onClick={handlePayMonthlyTokens}
                className="bg-amber-400 hover:bg-amber-300 text-brand-black border-2 border-brand-black font-black uppercase text-[11px] py-2.5 shadow-brutal-xs transition-all active:translate-y-0.5"
              >
                USE 200 TOKENS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleListingSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 30 * 86400000).toISOString();
      
      const PLATFORM_COMMISSION_RATE = 5;
      const resolvedCommission = user.commissionRate !== undefined ? user.commissionRate : PLATFORM_COMMISSION_RATE;
      
      // Clean and parse price
      let cleanPrice = 0;
      if (formData.propertyCategory === 'Land' || formData.pricePerSqm) {
        const size = parseFloat(formData.landDetails?.landSize || '0');
        const pricePerSqm = parseFloat(String(formData.pricePerSqm || '0').replace(/[^0-9.]/g, ''));
        cleanPrice = size * pricePerSqm;
      } else if (formData.price) {
        cleanPrice = parseFloat(String(formData.price).replace(/[^0-9.]/g, '')) || 0;
      }

      const generatedTitle = `${formData.bedrooms} Bed ${formData.propertySubType} inside ${formData.estateName}`;
      setSubmittedRequestTitle(generatedTitle);

      // Dual values resolution
      const ask = parseFloat(String(formData.askingPrice || '0')) || cleanPrice;
      const sale = parseFloat(String(formData.salePrice || '0')) || cleanPrice;
      const diffPercent = ask > 0 ? ((sale - ask) / ask) * 100 : 0;
      let tag: 'Standard' | 'Distress Sale' | 'Super-Distress Sale' | 'Above Market' = 'Standard';
      if (diffPercent < -20) {
        tag = 'Super-Distress Sale';
      } else if (diffPercent <= -6) {
        tag = 'Distress Sale';
      } else if (diffPercent >= 5.1) {
        tag = 'Above Market';
      }

      let finalRequest: ListingRequest;
      if (formData.propertyCategory === 'Land') {
        let generatedTitle = `${formData.landDetails?.landSize || '0'}SQM ${formData.landDetails?.landUse || 'Land'} Land — ${formData.state || 'Abuja'}`;
        try {
          const titleRes = await fetch('/api/generate-land-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              landUse: formData.landDetails?.landUse || 'Land',
              landSize: formData.landDetails?.landSize || '0',
              state: formData.state || 'Abuja'
            })
          });
          const titleData = await titleRes.json();
          if (titleData && titleData.title) {
            generatedTitle = titleData.title;
          }
        } catch (err) {
          console.warn("Failed to generate title, using fallback:", err);
        }

        setSubmittedRequestTitle(generatedTitle);
        finalRequest = {
          id: `req-${Date.now()}`,
          title: generatedTitle,
          type: 'Land',
          propertyCategory: 'Land',
          price: sale,
          askingPrice: ask,
          salePrice: sale,
          priceDifferencePercent: diffPercent,
          priceTag: tag,
          location: `${formData.lga || ''}, ${formData.state || ''}`,
          status: 'Agent Bidding',
          submittedAt: now,
          lastUpdated: now,
          expiresAt: expires,
          commission: resolvedCommission,
          listingType: formData.listingType || 'Sale',
          propertySubType: 'Land',
          sizeSqm: parseFloat(formData.landDetails?.landSize || '0'),
          bedrooms: 0,
          bathrooms: 0,
          estateName: formData.landDetails?.isEstatePlot ? (formData.landDetails?.estateName || '') : '',
          amenities: formData.landDetails?.infrastructure || [],
          googlePinLink: formData.googlePinLink || formData.landDetails?.locationPin || '',
          listingFeeStatus: user.listingFeeStatus || 'Monthly Unpaid',
          listingFeePaidAt: user.monthlyFeePaidAt || '',
          verificationFeePaid: user.verifiedPropertySeller || false,
          verificationFeePaidAt: user.verificationFeePaidAt || '',
          monthlyFeePaidAt: user.monthlyFeePaidAt || '',
          monthlyFeeExpiresAt: user.monthlyFeeExpiresAt || '',
          dealStatus: 'Open',
          listingRequirements: {
            titleDocumentFileName: formData.titleDocumentFile ? formData.titleDocumentFile.name : '',
            titleDocumentFileType: formData.titleDocumentFile ? formData.titleDocumentFile.type : '',
            physicalConditionDescription: formData.landDetails?.topography || 'Standard land plot',
            photos: formData.photos || [],
            locationPin: formData.googlePinLink || formData.landDetails?.locationPin || '',
          },
          landDetails: formData.landDetails,
          metrics: { views: 0, saves: 0, inquiries: 0 }
        };
      } else {
        finalRequest = {
          id: `req-${Date.now()}`,
          propertyCategory: 'Building',
          title: generatedTitle,
          type: formData.propertyType || 'House',
          price: sale,
          askingPrice: ask,
          salePrice: sale,
          priceDifferencePercent: diffPercent,
          priceTag: tag,
          location: `${formData.lga || ''}, ${formData.state || ''}`,
          status: 'Agent Bidding',
          submittedAt: now,
          lastUpdated: now,
          expiresAt: expires,
          commission: resolvedCommission,
          acceptsDownPayment: false,
          listingType: formData.listingType || 'Sale',
          propertySubType: formData.propertySubType,
          sizeSqm: parseFloat(formData.sizeSqm || '0'),
          bedrooms: parseInt(formData.bedrooms || '0', 10),
          bathrooms: parseInt(formData.bathrooms || '0', 10),
          estateName: formData.estateName,
          amenities: formData.amenities,
          googlePinLink: formData.googlePinLink,
          listingFeeStatus: user.listingFeeStatus || 'Monthly Unpaid',
          listingFeePaidAt: user.monthlyFeePaidAt || '',
          verificationFeePaid: user.verifiedPropertySeller || false,
          verificationFeePaidAt: user.verificationFeePaidAt || '',
          monthlyFeePaidAt: user.monthlyFeePaidAt || '',
          monthlyFeeExpiresAt: user.monthlyFeeExpiresAt || '',
          dealStatus: 'Open',
          listingRequirements: {
            titleDocumentFileName: formData.titleDocumentFile ? formData.titleDocumentFile.name : '',
            titleDocumentFileType: formData.titleDocumentFile ? formData.titleDocumentFile.type : '',
            physicalConditionDescription: formData.listingRequirements?.physicalConditionDescription || 'Verifiable physical asset with documented standard features and clear estate boundaries.',
            photos: formData.listingRequirements?.photos || [],
            locationPin: formData.googlePinLink || formData.listingRequirements?.locationPin || '',
          },
          metrics: { views: 0, saves: 0, inquiries: 0 }
        };
      }

      if (formData.isDraft) {
        if (drafts.length >= 3) {
          setDraftError("You have exceeded the saved drafts limit. A maximum of 3 drafts is allowed at any time. Please publish or delete existing drafts in your Seller workspace to continue saving.");
          return;
        }
        finalRequest.status = 'Draft';
        finalRequest.isDraft = true;
        await saveDraft(finalRequest);
        setDraftSaved(true);
        return;
      }

      await addListingRequest(finalRequest);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit property listing:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (draftSaved) {
    return (
      <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6 animate-fadeIn">
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-md text-center my-12">
          <div className="w-16 h-16 bg-blue-500 text-white border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center rounded-none mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          
          <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2 dark:text-white">Draft Saved!</h2>
          <span className="bg-blue-400 border-2 border-brand-black dark:border-zinc-750 text-brand-black px-3 py-1 text-xs font-black uppercase tracking-wider inline-block mb-6">
            WORKSPACE DRAFT PRESERVED
          </span>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-tight mb-4 leading-relaxed max-w-md mx-auto">
            Your draft <span className="text-brand-black dark:text-white italic">"{submittedRequestTitle}"</span> has been successfully saved to your workspace drafts.
          </p>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-tight mb-8 leading-relaxed max-w-sm mx-auto">
            You can access, update, edit, delete, or promote this draft to a live listing at any time from your Space Dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setActiveTab('myspace');
              }}
              className="brutalist-button-teal flex-1 py-4 text-xs font-black uppercase tracking-wider shadow-brutal-xs"
            >
              Go to My Space
            </button>
            <button
              onClick={onBack}
              className="brutalist-button-black flex-1 py-4 text-xs font-black uppercase tracking-wider shadow-brutal-xs"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6 animate-fadeIn">
        <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-8 shadow-brutal-md text-center my-12">
          <div className="w-16 h-16 bg-brand-teal text-brand-black border-4 border-brand-black dark:border-zinc-700 flex items-center justify-center rounded-none mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          
          <h2 className="text-3xl font-display font-black uppercase tracking-tight mb-2 dark:text-white">Listing Submitted!</h2>
          <span className="bg-brand-teal border-2 border-brand-black dark:border-zinc-750 text-brand-black px-3 py-1 text-xs font-black uppercase tracking-wider inline-block mb-6">
            AGENT BIDDING IS LIVE
          </span>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-tight mb-4 leading-relaxed max-w-md mx-auto">
            Your listing <span className="text-brand-black dark:text-white italic">"{submittedRequestTitle}"</span> was received with verification details.
          </p>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-tight mb-8 leading-relaxed max-w-sm mx-auto">
            Platform agents can now submit representation bids. You will receive updates in real-time in your space dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setActiveTab('myspace');
              }}
              className="brutalist-button-teal flex-1 py-4 text-xs font-black uppercase tracking-wider shadow-brutal-xs"
            >
              Go to My Space
            </button>
            <button
              onClick={onBack}
              className="brutalist-button-black flex-1 py-4 text-xs font-black uppercase tracking-wider shadow-brutal-xs"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

    // Both gates checked and paid successfully.
  if (listingCategory === 'Building') {
    return (
      <>
        <BuildingListingForm onSubmit={handleListingSubmit} onBack={() => setListingCategory(null)} />
        {/* Custom modal overlays for draft errors */}
        <AnimatePresence>
          {draftError && (
            <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-zinc-900 border-4 border-brand-red p-6 shadow-brutal-lg"
              >
                <div className="flex items-center gap-3 text-brand-red mb-3">
                  <ShieldAlert size={32} />
                  <h3 className="text-xl font-display font-black uppercase tracking-tight">DRAFT LIMIT EXCEEDED</h3>
                </div>
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-350 uppercase leading-relaxed mb-6">
                  {draftError}
                </p>
                <button
                  type="button"
                  onClick={() => setDraftError(null)}
                  className="w-full brutalist-button-black py-3 text-xs font-black uppercase"
                >
                  Understand
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (listingCategory === 'Land') {
    return (
      <>
        <LandListingForm onSubmit={handleListingSubmit} onBack={() => setListingCategory(null)} />
        {/* Custom modal overlays for draft errors */}
        <AnimatePresence>
          {draftError && (
            <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-zinc-900 border-4 border-brand-red p-6 shadow-brutal-lg"
              >
                <div className="flex items-center gap-3 text-brand-red mb-3">
                  <ShieldAlert size={32} />
                  <h3 className="text-xl font-display font-black uppercase tracking-tight">DRAFT LIMIT EXCEEDED</h3>
                </div>
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-350 uppercase leading-relaxed mb-6">
                  {draftError}
                </p>
                <button
                  type="button"
                  onClick={() => setDraftError(null)}
                  className="w-full brutalist-button-black py-3 text-xs font-black uppercase"
                >
                  Understand
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6 animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-8 dark:text-white">WHAT ARE YOU LISTING?</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => setListingCategory('Building')}
            className="flex items-center gap-4 p-6 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_#52525b]"
          >
            <div className="p-4 bg-brand-black text-white shrink-0">
              <Home size={24} />
            </div>
            <div>
              <h3 className="font-display font-black italic uppercase tracking-tighter text-xl dark:text-white">BUILDING</h3>
            </div>
          </button>

          <button 
            onClick={() => setListingCategory('Land')}
            className="flex items-center gap-4 p-6 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 text-left transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_#52525b]"
          >
            <div className="p-4 bg-brand-black text-white shrink-0">
              <Trees size={24} />
            </div>
            <div>
              <h3 className="font-display font-black italic uppercase tracking-tighter text-xl dark:text-white">LAND</h3>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
