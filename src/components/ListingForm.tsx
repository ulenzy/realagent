import React, { useState, useEffect } from 'react';
import { Building2, MapPin, FileText, User, ArrowLeft, ArrowRight, CheckCircle2, Home, Landmark, Trees, Factory, Banknote, Map, Hash, Info, Phone, Mail, UserCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn, formatNumberString, parseFormattedNumber, formatNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NIGERIAN_STATES, STATE_LGAS } from '../constants/locations';
import { ListingRequest } from '../types';

const PLATFORM_COMMISSION_RATE = 5; // 5% fixed — non-negotiable

type PropertyType = 'House' | 'Apartment' | 'Commercial' | 'Land' | 'Industrial';

import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export default function ListingForm() {
  const { addListingRequest: onSubmit } = useAuth();
  const { handleBackToMarketplace: onBack } = useNavigation();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [customAmenity, setCustomAmenity] = useState('');

  const [formData, setFormData] = useState({
    propertyType: '' as PropertyType | '',
    title: '',
    description: '',
    price: '',
    state: '',
    lga: '',
    area: '',
    address: '',
    estateName: '',
    flatNumber: '',
    // Type specific
    bedrooms: '',
    bathrooms: '',
    landSize: '',
    zoningType: '',
    floorNumber: '',
    condition: '' as 'New' | 'Renovated' | 'Fair' | 'Needs Work' | '',
    listingPurpose: '' as 'Sale' | 'Rent' | 'Joint Venture' | '',
    openToJV: false,
    jvSharingFormula: '',
    jvPremium: '',
    // Legal & Contact
    documents: [] as string[],
    documentFiles: {} as Record<string, { fileType: string; fileName: string }>,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    isAgent: false,
    isSubscriber: false,
    isBoosted: false,
    acceptsDownPayment: false,
    furnishing: '' as 'Unfurnished' | 'Semi-furnished' | 'Fully-furnished' | '',
    extraDays: 0,
    yearBuilt: '',
    parkingSpaces: '',
    googlePinLink: '',
    amenities: [] as string[],
    titleCompany: '',
    legalEncumbrances: '',
    nin: '',
    faceVerification: '',
    listingRequirements: {
      titleDocumentFileName: '',
      titleDocumentFileType: '',
      physicalConditionDescription: '',
      photos: [] as string[],
      locationPin: ''
    }
  });

  const [requirementsMet, setRequirementsMet] = useState(false);

  useEffect(() => {
    const reqs = formData.listingRequirements;
    const isValidMaps = reqs.locationPin.startsWith('https://maps.google') || reqs.locationPin.startsWith('https://goo.gl');
    const met = !!(
      reqs.titleDocumentFileName &&
      reqs.photos.length >= 3 &&
      isValidMaps &&
      reqs.physicalConditionDescription.length >= 100
    );
    setRequirementsMet(met);
  }, [formData.listingRequirements]);

  // Sync googlePinLink and locationPin
  useEffect(() => {
    if (formData.googlePinLink && !formData.listingRequirements.locationPin) {
      setFormData(prev => ({
        ...prev,
        listingRequirements: {
          ...prev.listingRequirements,
          locationPin: prev.googlePinLink
        }
      }));
    }
  }, [formData.googlePinLink]);

  useEffect(() => {
    if (formData.listingRequirements.locationPin && formData.listingRequirements.locationPin !== formData.googlePinLink) {
      setFormData(prev => ({
        ...prev,
        googlePinLink: prev.listingRequirements.locationPin
      }));
    }
  }, [formData.listingRequirements.locationPin]);

  const getTrustScore = () => {
    let score = 0;
    // Step 2 (max 1200)
    if (formData.price) score += 100;
    if (formData.openToJV) {
      score += 50;
      if (formData.jvSharingFormula) score += 50;
      if (formData.jvPremium) score += 50;
    }
    if (formData.state) score += 100;
    if (formData.lga) score += 100;
    if (formData.address) score += 100;
    if (formData.estateName) score += 50;
    if (formData.flatNumber && formData.propertyType === 'Apartment') score += 25;
    if (formData.googlePinLink || formData.listingRequirements.locationPin) score += 150;
    
    if (formData.propertyType === 'House' || formData.propertyType === 'Apartment') {
      if (formData.bedrooms) score += 50;
      if (formData.bathrooms) score += 50;
      if (formData.furnishing) score += 50; // Use furnishing
    } else if (formData.propertyType === 'Land') {
      if (formData.landSize) score += 50;
      if (formData.zoningType) score += 100;
    } else {
      if (formData.landSize) score += 100;
      if (formData.furnishing) score += 50; // Just as a placeholder for commercial
    }
    
    if (formData.yearBuilt) score += 50;
    if (formData.parkingSpaces) score += 50;
    if (formData.amenities.length > 0) score += 100;

    // Step 3 (Listing Requirements replacement points)
    // Title document uploaded: +400 points
    if (formData.listingRequirements.titleDocumentFileName) {
      score += 400;
    }
    // Physical condition description (100+ chars): +200 points, +100 bonus at 200+ chars
    const descLen = formData.listingRequirements.physicalConditionDescription.length;
    if (descLen >= 100) {
      score += 200;
      if (descLen >= 200) {
        score += 100;
      }
    }
    // 3 photos uploaded: +200 points, +50 per additional photo (max +150 bonus)
    const photoCount = formData.listingRequirements.photos.length;
    if (photoCount >= 3) {
      score += 200;
      const extraPhotos = photoCount - 3;
      score += Math.min(extraPhotos * 50, 150);
    }
    // Location pin provided: +200 points
    if (formData.listingRequirements.locationPin) {
      score += 200;
    }

    // Step 4 (max 1000)
    if (formData.contactName) score += 100;
    if (formData.contactPhone) score += 100;
    if (formData.contactEmail) score += 100;
    if (formData.nin) score += 300;
    if (formData.faceVerification) score += 400; // Will be set when photo uploaded

    return Math.min(score, 3700);
  };

  const propertyTypes: { type: PropertyType; icon: React.ReactNode; label: string }[] = [
    { type: 'House', icon: <Home size={20} />, label: 'Residential House' },
    { type: 'Apartment', icon: <Building2 size={20} />, label: 'Flat / Apartment' },
    { type: 'Commercial', icon: <Landmark size={20} />, label: 'Commercial Office' },
    { type: 'Land', icon: <Trees size={20} />, label: 'Undeveloped Land' },
    { type: 'Industrial', icon: <Factory size={20} />, label: 'Industrial / Warehouse' }
  ];

  const handleTypeSelect = (type: PropertyType) => {
    setFormData({ ...formData, propertyType: type });
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const EXTENSION_FEE_PER_30_DAYS = 3700;
  const BOOST_FEE = 15000; // Assuming a boost fee

  const calculateTotal = () => {
    let total = 0;
    if (formData.extraDays > 0) {
      total += (formData.extraDays / 30) * EXTENSION_FEE_PER_30_DAYS;
    }
    if (formData.isBoosted) {
      total += BOOST_FEE;
    }
    return total;
  };

  const currentFee = calculateTotal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Calculate expiration date (default 30 days + extensions)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30 + formData.extraDays);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      let generatedTitle = formData.title;
      if (!generatedTitle) {
        if (formData.propertyType === 'Land') {
          generatedTitle = `${formData.landSize} SQM ${formData.zoningType} Land in ${formData.address || formData.lga}`;
        } else {
          generatedTitle = `${formData.condition} ${formData.bedrooms ? formData.bedrooms + ' Bedroom ' : ''}${formData.propertyType} in ${formData.address || formData.lga}`;
        }
      }

      // Notify parent about new listing
      onSubmit({
        title: generatedTitle,
        type: formData.propertyType || 'House',
        price: Number(parseFormattedNumber(formData.price)) || 0,
        location: `${formData.lga}, ${formData.state}`,
        expiresAt: expirationDate.toISOString(),
        isBoosted: formData.isBoosted,
        isSubscriber: formData.isSubscriber,
        commission: PLATFORM_COMMISSION_RATE,
        acceptsDownPayment: formData.acceptsDownPayment,
        furnishing: formData.furnishing,
        trustScore: getTrustScore(),
        googlePinLink: formData.googlePinLink,
        listingRequirements: formData.listingRequirements,
        documents: formData.documents.map(d => ({
          name: d,
          ...formData.documentFiles[d]
        }))
      } as any);
    }, 2000);
  };

  const handleDocumentToggle = (docName: string) => {
    // Mutual exclusivity between C of O and R of O
    const isCofO = docName === 'Certificate of Occupancy';
    const isRofO = docName === 'Right of Occupancy (R of O)';

    setFormData(prev => {
      let nextDocs = [...prev.documents];
      const nextFiles = { ...prev.documentFiles };

      if (nextDocs.includes(docName)) {
        nextDocs = nextDocs.filter(d => d !== docName);
        delete nextFiles[docName];
      } else {
        if (isCofO) nextDocs = nextDocs.filter(d => d !== 'Right of Occupancy (R of O)');
        if (isRofO) nextDocs = nextDocs.filter(d => d !== 'Certificate of Occupancy');
        nextDocs.push(docName);
      }

      return { ...prev, documents: nextDocs, documentFiles: nextFiles };
    });
  };

  const handleFileUpload = (docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'pdf'].includes(extension || '')) {
        setFormData(prev => ({
          ...prev,
          documentFiles: {
            ...prev.documentFiles,
            [docName]: {
              fileType: extension === 'pdf' ? 'application/pdf' : 'image/' + (extension === 'jpg' ? 'jpeg' : extension),
              fileName: file.name
            }
          }
        }));
      }
    }
  };

  const handleTitleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'pdf'].includes(extension)) {
        const mimeType = extension === 'pdf' ? 'application/pdf' : 'image/' + (extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension);
        setFormData(prev => ({
          ...prev,
          listingRequirements: {
            ...prev.listingRequirements,
            titleDocumentFileName: file.name,
            titleDocumentFileType: mimeType
          }
        }));
      }
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const validFiles = filesArray.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return ['jpg', 'jpeg', 'png'].includes(ext);
      });
      const urls = validFiles.map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        listingRequirements: {
          ...prev.listingRequirements,
          photos: [...prev.listingRequirements.photos, ...urls]
        }
      }));
    }
  };

  const lgaOptions = formData.state ? STATE_LGAS[formData.state] || [] : [];

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-brand-teal flex items-center justify-center border-4 border-brand-black shadow-aggressive mb-8"
        >
          <CheckCircle2 size={48} className="text-brand-black" />
        </motion.div>
        <h2 className="text-4xl font-display font-black italic tracking-tighter uppercase mb-4 leading-none text-brand-black dark:text-white">
          Submission <br /> <span className="text-brand-teal">Logged Successfully</span>
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-medium max-w-sm mb-8">
          A registered RealAgent has been notified. Verification normally takes 24 hours. Physical inspection is optional based on documentation quality.
        </p>
        <button 
          onClick={onBack}
          className="brutalist-button-black px-12"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      {/* Information Value Score (Trust Score) */}
      <div className="mb-8 p-4 bg-brand-black text-white shadow-brutal-sm border-2 border-brand-teal">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-xs font-display font-black uppercase text-brand-teal tracking-widest leading-none">Listing Trust Score</h3>
            <p className="text-[9px] text-zinc-400 font-black uppercase mt-1">Information Value Points</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-display font-black text-white italic leading-none">{getTrustScore()}</span>
            <span className="text-[10px] text-brand-teal font-black uppercase ml-1">/ 3700</span>
          </div>
        </div>
        <div className="w-full h-3 bg-zinc-800 border-2 border-zinc-700 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-brand-teal"
            initial={{ width: 0 }}
            animate={{ width: `${(getTrustScore() / 3700) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex flex-col gap-4 mb-10">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-3 flex-1 border-2 border-brand-black transition-colors duration-300",
                s <= step ? "bg-brand-teal" : "bg-white dark:bg-zinc-800"
              )}
            />
          ))}
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 italic">Step {step} of 4</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-teal italic">
            {step === 1 && "Category Select"}
            {step === 2 && "Core Specifics"}
            {step === 3 && "Listing Requirements"}
            {step === 4 && "Contact Identity"}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8 pb-20"
          >
            <div>
              <h2 className="text-4xl font-display font-black italic uppercase tracking-tighter mb-8 leading-tight">
                What are you <br /> <span className="text-brand-teal bg-brand-black px-2 inline-block -rotate-1">Listing?</span>
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {propertyTypes.map((pt) => (
                  <button
                    key={pt.type}
                    onClick={() => handleTypeSelect(pt.type)}
                    className={cn(
                      "flex items-center gap-4 p-6 border-4 shadow-brutal-sm transition-all text-left group",
                      formData.propertyType === pt.type 
                        ? "bg-brand-black dark:bg-black border-brand-black dark:border-white shadow-none translate-y-1" 
                        : "bg-white dark:bg-zinc-900 border-brand-black dark:border-zinc-700 hover:-translate-y-1 hover:shadow-brutal-md"
                    )}
                  >
                    <div className={cn(
                      "p-4 border-2 shadow-brutal-xs transition-transform",
                      formData.propertyType === pt.type
                        ? "bg-brand-teal text-brand-black border-white"
                        : "bg-brand-black text-brand-teal border-brand-teal group-hover:scale-110"
                    )}>
                      {pt.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-display font-black uppercase tracking-wider text-sm leading-none mb-1",
                        formData.propertyType === pt.type ? "text-brand-teal" : "text-brand-black dark:text-white"
                      )}>{pt.label}</h3>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest opacity-60 italic",
                        formData.propertyType === pt.type ? "text-zinc-300" : "text-zinc-500"
                      )}>Process for {pt.type.toLowerCase()} details</p>
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 border-2 border-brand-black dark:border-zinc-500">
                      {formData.propertyType === pt.type && <div className="w-3 h-3 bg-brand-teal" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                <span>Listing Purpose</span>
                <span className="text-brand-teal">+50 pts</span>
              </label>
              <div className="flex gap-4">
                {['Sale', 'Rent'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData, 
                        listingPurpose: p as 'Sale' | 'Rent'
                      });
                    }}
                    className={cn(
                      "flex-1 py-4 border-4 font-display font-black uppercase text-sm transition-all",
                      formData.listingPurpose === p 
                        ? "bg-brand-black text-brand-teal border-brand-black shadow-none translate-y-1" 
                        : "bg-white dark:bg-zinc-800 border-brand-black dark:border-zinc-700 hover:-translate-y-1 shadow-brutal-sm text-zinc-600"
                    )}
                  >
                    For {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => setStep(2)} 
                disabled={!formData.propertyType || !formData.listingPurpose}
                className="w-full bg-brand-teal text-brand-black border-4 border-brand-black font-display font-black uppercase tracking-widest text-lg py-4 flex items-center justify-center gap-2 shadow-brutal-md hover:-translate-y-1 hover:shadow-brutal-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-brutal-md group"
              >
                Continue to Specifics
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
              Identify <span className="text-brand-teal">Core Specifics</span>
            </h2>
            
            <div className="space-y-6">
              {/* Boxed Input Group */}
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span className="flex items-center gap-2"><ShieldAlert size={12} className="text-brand-teal" /> Condition</span>
                  </label>
                  <select 
                    className="brutalist-input-large h-[58px]"
                    value={formData.condition}
                    onChange={e => setFormData({...formData, condition: e.target.value as any})}
                  >
                    <option value="" disabled>Select Condition</option>
                    <option value="New">Brand New</option>
                    <option value="Renovated">Newly Renovated</option>
                    <option value="Fair">Fair / Used</option>
                    <option value="Needs Work">Blighted / Needs Reform</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  {formData.propertyType === 'Land' && (
                    <div className="pt-2">
                      <label className="flex items-center gap-3 mb-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-6 h-6 border-2 border-brand-black bg-white group-hover:bg-zinc-100 transition-colors">
                          {formData.openToJV && <CheckCircle2 size={16} className="text-brand-black" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={formData.openToJV}
                          onChange={(e) => setFormData({...formData, openToJV: e.target.checked})}
                        />
                        <div className="flex-1">
                          <div className="text-xs font-black uppercase tracking-wider flex justify-between items-center">
                            Open to Joint Venture (JV)?
                            <span className="text-[10px] text-brand-teal whitespace-nowrap">+50 pts</span>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-medium">Select if you are willing to partner with developers.</p>
                        </div>
                      </label>

                      <AnimatePresence>
                        {formData.openToJV && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4 border-l-2 border-brand-teal pl-3 mt-2"
                          >
                            <div className="flex flex-col gap-1.5 pt-2">
                              <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                                <span>Proposed Sharing Formula</span>
                                <span className="text-brand-teal">+50 pts</span>
                              </label>
                              <div className="px-2 pt-2 pb-2">
                                <input 
                                  type="range" 
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={parseInt(formData.jvSharingFormula) || 50}
                                  onChange={(e) => {
                                    const devShare = parseInt(e.target.value);
                                    setFormData({...formData, jvSharingFormula: `${devShare}`})
                                  }}
                                  className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 appearance-none border-2 border-brand-black cursor-pointer accent-brand-teal"
                                />
                                <div className="flex justify-between mt-2">
                                  <span className="text-[9px] font-black text-brand-black dark:text-white uppercase italic text-left leading-tight w-1/3">
                                    <span className="text-brand-teal font-display text-sm">{parseInt(formData.jvSharingFormula) || 50}%</span><br/>Developer
                                  </span>
                                  <span className="text-[9px] font-black text-brand-black dark:text-white uppercase italic text-right leading-tight w-1/3">
                                    <span className="text-brand-teal font-display text-sm">{100 - (parseInt(formData.jvSharingFormula) || 50)}%</span><br/>Owner
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-2">
                              <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                                <span>Premium (₦) Optional</span>
                                <span className="text-brand-teal">+50 pts</span>
                              </label>
                              <div className="relative mb-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-black/30 font-black">₦</span>
                                <input 
                                  type="text" 
                                  placeholder="50,000,000"
                                  className={cn(
                                    "brutalist-input-large pl-10",
                                    formData.jvPremium === '0' ? "text-zinc-600 bg-zinc-200 cursor-not-allowed border-zinc-400" : ""
                                  )}
                                  value={formData.jvPremium === '0' ? 'No Premium' : formData.jvPremium}
                                  readOnly={formData.jvPremium === '0'}
                                  onChange={e => {
                                    if(formData.jvPremium !== '0') {
                                      setFormData({...formData, jvPremium: formatNumberString(e.target.value)})
                                    }
                                  }}
                                />
                              </div>
                              <label className="flex items-center gap-3 cursor-pointer group pb-2">
                                <div className="relative flex items-center justify-center w-5 h-5 border-2 border-brand-black bg-white group-hover:bg-zinc-100 transition-colors">
                                  {formData.jvPremium === '0' && <CheckCircle2 size={14} className="text-brand-black" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={formData.jvPremium === '0'}
                                  onChange={(e) => {
                                    if(e.target.checked) setFormData({...formData, jvPremium: '0'});
                                    else setFormData({...formData, jvPremium: ''});
                                  }}
                                />
                                <span className="text-[10px] font-black uppercase text-zinc-600">No Premium Needed</span>
                              </label>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Breakdown */}
              <div className="brutalist-card-flat p-4 bg-brand-teal/5 border-brand-teal/30 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-teal italic border-b border-brand-teal/20 pb-2 mb-2">Location Intelligence</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>State</span>
                      <span className="text-brand-teal">+100 pts</span>
                    </label>
                    <select 
                      className="brutalist-input-large h-[58px]"
                      value={formData.state}
                      onChange={e => setFormData({...formData, state: e.target.value, lga: ''})}
                    >
                      <option value="">Select State</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>City / LGA</span>
                      <span className="text-brand-teal">+100 pts</span>
                    </label>
                    <select 
                      className="brutalist-input-large h-[58px]"
                      value={formData.lga}
                      onChange={e => setFormData({...formData, lga: e.target.value})}
                      disabled={!formData.state}
                    >
                      <option value="">Select Area</option>
                      {lgaOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Estate Name (Optional)</span>
                    <span className="text-brand-teal">+50 pts</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pinnock Beach Estate"
                    className="brutalist-input-large"
                    list="estateList"
                    value={formData.estateName}
                    onChange={e => setFormData({...formData, estateName: e.target.value})}
                  />
                  <datalist id="estateList">
                    <option value="Banana Island" />
                    <option value="Pinnock Beach Estate" />
                    <option value="Nicon Town" />
                    <option value="VGC" />
                    <option value="Chevy View Estate" />
                    <option value="Osapa London" />
                    <option value="Ikoyi" />
                    <option value="Magodo GRA Phase 2" />
                    <option value="Gowon Estate" />
                    <option value="1004 Estates" />
                  </datalist>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(formData.propertyType === 'Apartment') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                        <span>Flat / unit Number</span>
                        <span className="text-brand-teal">+25 pts</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Flat 4B"
                        className="brutalist-input-large"
                        value={formData.flatNumber}
                        onChange={e => setFormData({...formData, flatNumber: e.target.value})}
                      />
                    </div>
                  )}

                  <div className={cn("flex flex-col gap-1.5", formData.propertyType !== 'Apartment' ? "col-span-full" : "")}>
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>
                        {formData.propertyType === 'Land' ? 'Plot Address / No.' : 
                         formData.propertyType === 'House' ? 'House Address (Street & No.)' : 
                         formData.propertyType === 'Apartment' ? 'Property Address (Street & No.)' : 'Address'}
                      </span>
                      <span className="text-brand-teal">+100 pts</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder={
                        formData.propertyType === 'Land' ? 'e.g. Plot 12, Block B, Road 4' : 
                        formData.propertyType === 'Apartment' ? 'e.g. 10 Admiralty Way' :
                        'e.g. 14 Awolowo Road'
                      }
                      className="brutalist-input-large"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span className="flex items-center gap-1">
                      Google Pin Link / Coordinates <span className="text-red-500 font-bold">*</span>
                    </span>
                    <span className="text-brand-teal font-black uppercase">Required</span>
                  </label>
                  <div className="relative">
                    {!formData.googlePinLink && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-black uppercase text-red-500 animate-pulse">
                        <MapPin size={8} /> Mandatory Pin
                      </div>
                    )}
                    <input 
                      type="text" 
                      placeholder="e.g. https://maps.app.goo.gl/... or 6.5244° N, 3.3792° E"
                      className={cn(
                        "brutalist-input-large",
                        !formData.googlePinLink && formData.state && formData.lga ? "border-red-500" : ""
                      )}
                      value={formData.googlePinLink}
                      onChange={e => setFormData({...formData, googlePinLink: e.target.value})}
                      required
                    />
                  </div>
                  {(!formData.googlePinLink && formData.state && formData.lga) && (
                    <p className="text-[8px] font-black uppercase text-red-500 pl-1">
                      Listing cannot be verified without a valid map pin or coordinates.
                    </p>
                  )}
                </div>
              </div>

              {/* Functional Attributes */}
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic border-b border-brand-black/10 pb-2 mb-2">Physical Attributes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(formData.propertyType === 'House' || formData.propertyType === 'Apartment') && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                          <span>Bedrooms</span>
                          <span className="text-brand-teal">+50 pts</span>
                        </label>
                        <div className="relative">
                          {!formData.bedrooms && <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />}
                          <input 
                            type="text" 
                            className={cn("brutalist-input-large", !formData.bedrooms ? "pl-10" : "pl-4")}
                            placeholder="0"
                            value={formData.bedrooms}
                            onChange={e => setFormData({...formData, bedrooms: formatNumberString(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                          <span>Bathrooms</span>
                          <span className="text-brand-teal">+50 pts</span>
                        </label>
                        <div className="relative">
                          {!formData.bathrooms && <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />}
                          <input 
                            type="text" 
                            className={cn("brutalist-input-large", !formData.bathrooms ? "pl-10" : "pl-4")}
                            placeholder="0"
                            value={formData.bathrooms}
                            onChange={e => setFormData({...formData, bathrooms: formatNumberString(e.target.value)})}
                          />
                        </div>
                      </div>
                      {(formData.propertyType === 'Apartment' || formData.propertyType === 'Commercial') && (
                        <div className="flex flex-col gap-1.5">
                          <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                            <span>Floor Number</span>
                            <span className="text-brand-teal">+50 pts</span>
                          </label>
                          <div className="relative">
                            {!formData.floorNumber && <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />}
                            <input 
                              type="text" 
                              className={cn("brutalist-input-large", !formData.floorNumber ? "pl-10" : "pl-4")}
                              placeholder="e.g. 3"
                              value={formData.floorNumber}
                              onChange={e => setFormData({...formData, floorNumber: formatNumberString(e.target.value)})}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {(formData.propertyType === 'House' || formData.propertyType === 'Apartment') && (
                    <div className="flex flex-col gap-1.5 col-span-full">
                      <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                        <span>Furnishing Status</span>
                        <span className="text-brand-teal">+50 pts</span>
                      </label>
                      <div className="flex gap-2">
                        {['Unfurnished', 'Semi-furnished', 'Fully-furnished'].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFormData({...formData, furnishing: f as any})}
                            className={cn(
                              "flex-1 py-3 border-2 font-display font-black uppercase text-[10px] transition-all",
                              formData.furnishing === f 
                                ? "bg-brand-black text-white border-brand-black shadow-brutal-sm" 
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                            )}
                          >
                            {f.replace('-furnished', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.propertyType === 'Land' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                          <span>Land Size (sqm)</span>
                          <span className="text-brand-teal">+50 pts</span>
                        </label>
                        <div className="relative">
                          {!formData.landSize && <Map size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />}
                          <input 
                            type="text" 
                            className={cn("brutalist-input-large", !formData.landSize ? "pl-10" : "pl-4")}
                            placeholder="e.g. 600"
                            value={formData.landSize}
                            onChange={e => setFormData({...formData, landSize: formatNumberString(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                          <span>Zoning Category</span>
                          <span className="text-brand-teal">+100 pts</span>
                        </label>
                        <select 
                          className="brutalist-input-large h-[58px]"
                          value={formData.zoningType}
                          onChange={e => setFormData({...formData, zoningType: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          <option value="Residential">Pure Residential</option>
                          <option value="Commercial">High-Street Commercial</option>
                          <option value="Mixed Use">Mixed Use (Urban)</option>
                          <option value="Agricultural">Agricultural / Farm</option>
                        </select>
                      </div>
                    </>
                  )}
                  {(formData.propertyType === 'Commercial' || formData.propertyType === 'Industrial') && (
                    <div className="flex flex-col gap-1.5 col-span-full">
                      <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                        <span>Net Internal Area (sqft)</span>
                        <span className="text-brand-teal">+100 pts</span>
                      </label>
                      <div className="relative">
                        {!formData.landSize && <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />}
                        <input 
                          type="text" 
                          className={cn("brutalist-input-large", !formData.landSize ? "pl-10" : "pl-4")}
                          placeholder="e.g. 2500"
                          value={formData.landSize}
                          onChange={e => setFormData({...formData, landSize: formatNumberString(e.target.value)})}
                        />
                      </div>
                    </div>
                  )}

                  {/* Universal attributes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Year Built (Optional)</span>
                      <span className="text-brand-teal">+50 pts</span>
                    </label>
                    <input 
                      type="number" 
                      className="brutalist-input-large"
                      placeholder="e.g. 2020"
                      value={formData.yearBuilt}
                      onChange={e => setFormData({...formData, yearBuilt: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Parking Spaces (Optional)</span>
                      <span className="text-brand-teal">+50 pts</span>
                    </label>
                    <input 
                      type="number" 
                      className="brutalist-input-large"
                      placeholder="e.g. 4"
                      value={formData.parkingSpaces}
                      onChange={e => setFormData({...formData, parkingSpaces: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 col-span-full">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Amenities</span>
                      <span className="text-brand-teal">+100 pts (if any)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                       {['Swimming Pool', 'Gym', '24/7 Power', 'CCTV', 'Boys Quarters', 'Elevator'].concat(
                         formData.amenities.filter(a => !['Swimming Pool', 'Gym', '24/7 Power', 'CCTV', 'Boys Quarters', 'Elevator'].includes(a))
                       ).map(amenity => (
                         <button
                           key={amenity}
                           type="button"
                           onClick={() => {
                             setFormData(prev => ({
                               ...prev,
                               amenities: prev.amenities.includes(amenity) 
                                 ? prev.amenities.filter(a => a !== amenity)
                                 : [...prev.amenities, amenity]
                             }));
                           }}
                           className={cn(
                             "px-3 py-1.5 border-2 text-[10px] font-black uppercase transition-all",
                             formData.amenities.includes(amenity)
                               ? "bg-brand-black text-white border-brand-black"
                               : "bg-white text-zinc-500 border-zinc-200 hover:border-brand-black"
                           )}
                         >
                           {amenity}
                         </button>
                       ))}
                       <div className="flex items-center gap-2">
                         <input
                           type="text"
                           placeholder="Type to Add Other"
                           className="brutalist-input h-8 text-[10px] px-2 w-32 border-dashed uppercase"
                           value={customAmenity}
                           onChange={e => setCustomAmenity(e.target.value)}
                           onKeyDown={e => {
                             if (e.key === 'Enter') {
                               e.preventDefault();
                               if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                                 setFormData(prev => ({ ...prev, amenities: [...prev.amenities, customAmenity.trim()] }));
                                 setCustomAmenity('');
                               }
                             }
                           }}
                         />
                         <button 
                           type="button" 
                           onClick={() => {
                             if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                               setFormData(prev => ({ ...prev, amenities: [...prev.amenities, customAmenity.trim()] }));
                               setCustomAmenity('');
                             }
                           }}
                           className="bg-brand-black text-white text-[10px] px-3 h-8 uppercase font-black"
                         >
                           Add
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button 
                onClick={handlePrev} 
                className="brutalist-button-gray flex-1 group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back
              </button>
              <button 
                onClick={handleNext} 
                disabled={!formData.title || !formData.price || !formData.state || !formData.lga || !formData.googlePinLink}
                className="brutalist-button-black flex-[2] disabled:opacity-50 group"
              >
                Continue Verification
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck size={32} className="text-brand-teal" /> Listing <span className="text-brand-teal">Requirements</span>
            </h2>

            {/* Checklist Live Tracker */}
            <div className="p-4 bg-brand-black text-white border-2 border-brand-teal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none">
              <h3 className="text-xs font-display font-black uppercase text-brand-teal tracking-widest leading-none mb-3 flex items-center gap-2">
                <ShieldCheck className="text-brand-teal shrink-0" size={16} /> LISTING REQUIREMENTS TRACKER
              </h3>
              <ul className="space-y-2">
                {[
                  {
                    text: "Title Document — upload C of O, R of O, or equivalent",
                    met: !!formData.listingRequirements.titleDocumentFileName
                  },
                  {
                    text: "Property Photos — minimum 3 photos required",
                    met: formData.listingRequirements.photos.length >= 3
                  },
                  {
                    text: "Location Pin — valid Google Maps link",
                    met: !!(formData.listingRequirements.locationPin && (formData.listingRequirements.locationPin.startsWith('https://maps.google') || formData.listingRequirements.locationPin.startsWith('https://goo.gl')))
                  }
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "w-5 h-5 flex items-center justify-center border text-[11px] font-black shrink-0",
                      item.met ? "border-brand-teal bg-brand-teal/10 text-brand-teal" : "border-red-500 bg-red-500/10 text-red-500"
                    )}>
                      {item.met ? "✓" : "✗"}
                    </span>
                    <span className={cn(
                      "font-semibold",
                      item.met ? "text-zinc-400 line-through" : "text-white"
                    )}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 1 — Title Document */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
              <label className="block">
                <span className="block text-xs font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                  Title Document <span className="text-red-500">*</span>
                </span>
                <span className="block text-[10px] uppercase text-zinc-500 font-bold leading-tight mt-0.5">
                  Certificate of Occupancy, Right of Occupancy, Deed of Assignment, or equivalent
                </span>
              </label>
              <div className="flex items-center gap-4">
                <label className={cn(
                  "flex-1 border-2 border-dashed p-4 flex flex-col items-center justify-center cursor-pointer transition-colors select-none",
                  formData.listingRequirements.titleDocumentFileName 
                    ? "bg-brand-teal/5 border-brand-teal" 
                    : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.pdf" 
                    onChange={handleTitleDocUpload} 
                  />
                  {formData.listingRequirements.titleDocumentFileName ? (
                    <div className="text-center font-semibold text-xs">
                      <span className="text-brand-teal font-black block mb-1">✓ TITLE UPLOADED</span>
                      <span className="text-zinc-600 dark:text-zinc-300 block break-all font-mono">
                        {formData.listingRequirements.titleDocumentFileName}
                      </span>
                      <span className="mt-1 inline-block bg-brand-teal text-brand-black text-[9px] font-black uppercase px-2 py-0.5">
                        {formData.listingRequirements.titleDocumentFileType.split('/').pop()?.toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-brand-teal text-xs font-black block uppercase">SELECT FILE</span>
                      <span className="text-[10px] text-zinc-400 font-medium uppercase mt-0.5 block">JPG, PNG, PDF only</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Section 2 — Physical Condition Description */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
              <label className="block">
                <span className="block text-xs font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                  Property Condition <span className="text-red-500">*</span>
                </span>
              </label>
              <textarea
                value={formData.listingRequirements.physicalConditionDescription}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  listingRequirements: {
                    ...prev.listingRequirements,
                    physicalConditionDescription: e.target.value
                  }
                }))}
                placeholder="Describe the current state of the property: structural condition, interior finish, exterior, access road, utilities, any known issues..."
                className="w-full brutalist-input-large min-h-[120px] p-3 text-xs leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-zinc-400 italic">Written in first person</span>
                <span className={cn(
                  formData.listingRequirements.physicalConditionDescription.length >= 100 
                    ? "text-brand-teal" 
                    : "text-zinc-400"
                )}>
                  {formData.listingRequirements.physicalConditionDescription.length} / 100 minimum
                </span>
              </div>
            </div>

            {/* Section 3 — Property Photos */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="block">
                  <span className="block text-xs font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                    Property Photos <span className="text-red-500">*</span>
                  </span>
                </label>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2 py-0.5",
                  formData.listingRequirements.photos.length >= 3 
                    ? "bg-brand-teal text-brand-black border-2 border-brand-black" 
                    : "bg-red-50 text-red-500 border-2 border-red-500 animate-pulse"
                )}>
                  {formData.listingRequirements.photos.length} of 3 required
                </span>
              </div>
              
              <label className="flex h-14 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors items-center justify-center cursor-pointer select-none">
                <input 
                  type="file" 
                  multiple 
                  accept=".jpg,.jpeg,.png" 
                  onChange={handlePhotosUpload} 
                  className="hidden" 
                />
                <span className="text-xs font-black uppercase text-brand-teal">CHOOSE PHOTO FILES (JPG, PNG)</span>
              </label>
              
              {formData.listingRequirements.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.listingRequirements.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square border-2 border-brand-black bg-zinc-200">
                      <img 
                        src={photo} 
                        alt={`Preview ${index}`} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            listingRequirements: {
                              ...prev.listingRequirements,
                              photos: prev.listingRequirements.photos.filter((_, idx) => idx !== index)
                            }
                          }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white border border-brand-black hover:bg-red-650 w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4 — Location Pin */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
              <label className="block">
                <span className="block text-xs font-black uppercase text-zinc-900 dark:text-zinc-100 tracking-wider">
                  Google Maps Location Pin <span className="text-red-500">*</span>
                </span>
              </label>
              <input 
                type="text" 
                value={formData.listingRequirements.locationPin} 
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  listingRequirements: {
                    ...prev.listingRequirements,
                    locationPin: e.target.value
                  }
                }))}
                placeholder="https://maps.google.com/..."
                className="w-full brutalist-input-large text-xs"
              />
              
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider leading-normal">
                Open Google Maps, find your property, tap Share → Copy Link, paste here
              </p>
              
              {formData.listingRequirements.locationPin && 
               !formData.listingRequirements.locationPin.startsWith('https://maps.google') && 
               !formData.listingRequirements.locationPin.startsWith('https://goo.gl') && (
                <p className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/25 p-2 border-l-4 border-red-500">
                  Inline error: Must start with https://maps.google or https://goo.gl
                </p>
              )}
            </div>

            {/* Step Navigation Controls - Gated Next Button */}
            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back
              </button>
              {requirementsMet && (
                <button 
                  onClick={handleNext} 
                  className="brutalist-button-black flex-[2] group"
                >
                  Identify Entity
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
              Stakeholder <span className="text-brand-teal">Identity</span>
            </h2>

            <div className="space-y-6">
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span className="flex items-center gap-2"><UserCircle size={12} className="text-brand-teal" /> Full Legal Name</span>
                    <span className="text-brand-teal">+100 pts</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="brutalist-input-large"
                    value={formData.contactName}
                    onChange={e => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span className="flex items-center gap-2"><Phone size={12} className="text-brand-teal" /> Phone Number</span>
                      <span className="text-brand-teal">+100 pts</span>
                    </label>
                    <input 
                      type="tel" 
                      placeholder="+234..."
                      className="brutalist-input-large"
                      value={formData.contactPhone}
                      onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span className="flex items-center gap-2"><Mail size={12} className="text-brand-teal" /> Email Address</span>
                      <span className="text-brand-teal">+100 pts</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="john@example.com"
                      className="brutalist-input-large"
                      value={formData.contactEmail}
                      onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-brand-black/10">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>National ID Number (NIN)</span>
                    <span className="text-brand-teal">+300 pts</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="11-digit NIN"
                    className="brutalist-input-large"
                    value={formData.nin}
                    onChange={e => setFormData({...formData, nin: e.target.value})}
                  />
                  <p className="text-[8px] font-black uppercase text-zinc-400 pl-1">Required for highly verified listings.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Face Verification (Selfie)</span>
                    <span className="text-brand-teal">+400 pts</span>
                  </label>
                  <label className="brutalist-input-large flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-500">{formData.faceVerification ? 'Selfie Uploaded' : 'Upload Selfie Photo'}</span>
                    <span className="bg-brand-black text-white px-3 py-1 text-xs font-black">Browse</span>
                    <input 
                      type="file" 
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                           setFormData({...formData, faceVerification: 'uploaded'});
                        }
                      }}
                    />
                  </label>
                  <p className="text-[8px] font-black uppercase text-zinc-400 pl-1">Must match your ID documents for maximum Trust Score.</p>
                </div>
              </div>

              {/* Target Price */}
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span className="flex items-center gap-2"><Banknote size={12} className="text-brand-teal" /> Target Price (₦)</span>
                    <span className="text-brand-teal">+100 pts</span>
                  </label>
                  <div className="relative">
                    {!formData.price && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-black/30 font-black">₦</span>}
                    <input 
                      type="text" 
                      placeholder="0"
                      className={cn("brutalist-input-large", !formData.price ? "pl-10" : "pl-4")}
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: formatNumberString(e.target.value)})}
                    />
                  </div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 pl-1 leading-tight mt-1">
                    Provide a target price. Based on the specs entered earlier, AI will map pricing trends upon submission.
                  </p>
                </div>
              </div>

              {/* Platform Commission Info Card */}
              <div className="p-4 bg-brand-black text-white border-2 border-brand-teal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center border-b border-brand-teal/25 pb-2 mb-2">
                  <h3 className="text-xs font-display font-black uppercase text-brand-teal tracking-widest leading-none">Platform Commission</h3>
                  <span className="bg-brand-teal text-brand-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">{PLATFORM_COMMISSION_RATE}% FIXED</span>
                </div>
                <p className="text-[11px] text-zinc-300 font-medium leading-relaxed mb-3">
                  RealAgents charges a fixed 5% facilitation fee on all completed transactions.
                  This is non-negotiable and is the same for all agents, regardless of tier.
                </p>
                {formData.price ? (
                  <div className="flex justify-between items-center bg-zinc-900 border border-brand-teal/20 p-2.5 font-mono text-xs">
                    <span className="text-zinc-400 font-semibold uppercase text-[10px]">FACILITATION FEE</span>
                    <span className="text-brand-teal font-bold select-all">
                      On ₦{formData.price}, this equals ₦{formatNumber(Math.round(Number(parseFormattedNumber(formData.price)) * (PLATFORM_COMMISSION_RATE / 100)))}
                    </span>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-brand-teal/20 p-2.5 font-mono text-[10px] text-zinc-500 uppercase tracking-wider text-center">
                    Enter target price to calculate facilitation fee
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={cn(
                  "flex items-start gap-3 p-4 border-4 cursor-pointer transition-all shadow-brutal-sm",
                  formData.isSubscriber 
                    ? "border-brand-teal bg-brand-teal/5" 
                    : "border-brand-black bg-white dark:bg-zinc-900"
                )}>
                  <div className="relative flex items-center pt-1">
                    <input 
                      type="checkbox" 
                      className="peer w-5 h-5 opacity-0 absolute cursor-pointer"
                      checked={formData.isSubscriber}
                      onChange={e => setFormData({...formData, isSubscriber: e.target.checked})}
                    />
                    <div className="w-5 h-5 border-2 border-brand-black bg-white dark:bg-zinc-800 flex items-center justify-center peer-checked:bg-brand-teal transition-colors">
                      {formData.isSubscriber && <CheckCircle2 size={12} className="text-brand-black" />}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black uppercase text-[10px] leading-tight mb-1">Subscriber Package</span>
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-tight italic">Verified Badge + Auto-Renew + Green Border</span>
                  </div>
                </label>

                <label className={cn(
                  "flex items-start gap-3 p-4 border-4 cursor-pointer transition-all shadow-brutal-sm",
                  formData.isBoosted 
                    ? "border-amber-400 bg-amber-400/5" 
                    : "border-brand-black bg-white dark:bg-zinc-900"
                )}>
                  <div className="relative flex items-center pt-1">
                    <input 
                      type="checkbox" 
                      className="peer w-5 h-5 opacity-0 absolute cursor-pointer"
                      checked={formData.isBoosted}
                      onChange={e => setFormData({...formData, isBoosted: e.target.checked})}
                    />
                    <div className="w-5 h-5 border-2 border-brand-black bg-white dark:bg-zinc-800 flex items-center justify-center peer-checked:bg-amber-400 transition-colors">
                      {formData.isBoosted && <CheckCircle2 size={12} className="text-brand-black" />}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black uppercase text-[10px] leading-tight mb-1">Boost Listing</span>
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-tight">+₦{BOOST_FEE.toLocaleString()} for Top-of-Marketplace</span>
                  </div>
                </label>

                <label className={cn(
                  "flex items-start gap-3 p-4 border-4 cursor-pointer transition-all shadow-brutal-sm col-span-full",
                  formData.acceptsDownPayment 
                    ? "border-brand-teal bg-brand-teal/5" 
                    : "border-brand-black bg-white dark:bg-zinc-900"
                )}>
                  <div className="relative flex items-center pt-1">
                    <input 
                      type="checkbox" 
                      className="peer w-5 h-5 opacity-0 absolute cursor-pointer"
                      checked={formData.acceptsDownPayment}
                      onChange={e => setFormData({...formData, acceptsDownPayment: e.target.checked})}
                    />
                    <div className="w-5 h-5 border-2 border-brand-black bg-white dark:bg-zinc-800 flex items-center justify-center peer-checked:bg-brand-teal transition-colors">
                      {formData.acceptsDownPayment && <CheckCircle2 size={12} className="text-brand-black" />}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black uppercase text-[10px] leading-tight mb-1">Accepting Down Payment</span>
                    <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-tight">Let buyers know you're open to installment payments / deposits</span>
                  </div>
                </label>
              </div>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
                <div className="flex justify-between items-baseline border-b border-brand-black/10 pb-2 mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Listing Duration</h3>
                  <span className="text-[8px] font-black uppercase text-zinc-400">Manual Renewal Required for Standard</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setFormData({...formData, extraDays: 0})}
                    className={cn(
                      "flex-1 p-3 border-2 font-display font-black uppercase text-[10px] transition-all",
                      formData.extraDays === 0 ? "bg-brand-black text-white border-brand-black" : "bg-white border-zinc-200 text-zinc-400"
                    )}
                  >
                    30 Days (Free)
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, extraDays: 30})}
                    className={cn(
                      "flex-1 p-3 border-2 font-display font-black uppercase text-[10px] transition-all",
                      formData.extraDays === 30 ? "bg-brand-black text-white border-brand-black" : "bg-white border-zinc-200 text-zinc-400"
                    )}
                  >
                    60 Days (+₦3,700)
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, extraDays: 60})}
                    className={cn(
                      "flex-1 p-3 border-2 font-display font-black uppercase text-[10px] transition-all",
                      formData.extraDays === 60 ? "bg-brand-black text-white border-brand-black" : "bg-white border-zinc-200 text-zinc-400"
                    )}
                  >
                    90 Days (+₦7,400)
                  </button>
                </div>
              </div>

              {/* Fee Summary */}
              <div className="brutalist-card-flat p-5 bg-brand-black text-brand-teal space-y-3">
                <div className="flex justify-between items-center border-b border-brand-teal/30 pb-2">
                  <h3 className="text-xs font-display font-black uppercase tracking-widest">Listing Package Fee</h3>
                  <span className="text-lg font-display font-black italic">₦{currentFee.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80 flex items-center gap-2">
                    <CheckCircle2 size={10} /> {formData.extraDays + 30} Days Active Visibility
                  </p>
                  {formData.isBoosted && (
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80 flex items-center gap-2">
                      <CheckCircle2 size={10} /> Marketplace Boost Enabled
                    </p>
                  )}
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80 flex items-center gap-2 italic">
                    {formData.isSubscriber ? "Subscriber Listing (Green Border)" : "Standard Listing (Red Border)"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                 <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                 Back
              </button>
              {requirementsMet && (
                <button 
                  onClick={handleSubmit} 
                  className="brutalist-button-teal flex-[2] group"
                  disabled={isSubmitting || !formData.contactName || !formData.contactPhone}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      Logging Request...
                    </span>
                  ) : (
                    <>
                      Confirm Submission
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[8px] text-center font-black uppercase tracking-widest text-zinc-400 mt-2">
              By submitting, you authorize RealAgent to begin verification. 
              <br/>This request is logged as a pending job.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

