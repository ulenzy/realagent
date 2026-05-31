import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Trees, Landmark, Info, Banknote 
} from 'lucide-react';
import { cn, formatNumberString, parseFormattedNumber, formatNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NIGERIAN_STATES, STATE_LGAS } from '../constants/locations';
import { LeafletMap } from './shared/LeafletMap';
import DocumentUpload from './shared/DocumentUpload';
import PhotoUpload from './shared/PhotoUpload';

interface LandListingFormProps {
  onSubmit: (data: any) => void;
  onBack?: () => void;
  initialData?: any;
}

const defaultEmptyState = {
  propertyCategory: 'Land',
  listingType: 'Sale', // default
  pricePerSqm: '',
  askingPrice: '',
  salePrice: '',
  price: '',
  state: '',
  lga: '',
  address: '',
  googlePinLink: '',
  landDetails: {
    landSize: '',
    landSizeUnit: 'sqm',
    landUse: '',
    topography: '',
    isEstatePlot: false,
    estateName: '',
    infrastructure: [] as string[],
    locationPin: '',
    surveyPlanFileName: '',
    surveyPlanUrl: '',
  },
  titleDocumentFile: null as File | null,
  surveyPlanFile: null as File | null,
  photos: [] as string[]
};

export default function LandListingForm({ onSubmit, onBack, initialData }: LandListingFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    try {
      const draft = localStorage.getItem('realagents_land_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        return {
          ...defaultEmptyState,
          ...parsed,
          titleDocumentFile: null,
          surveyPlanFile: null
        };
      }
    } catch (e) {
      console.warn("Failed to read draft:", e);
    }
    return { ...defaultEmptyState, ...initialData };
  });

  const [showDraftBanner, setShowDraftBanner] = useState(() => {
    return !!localStorage.getItem('realagents_land_draft');
  });
  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleLandDetailsChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      landDetails: {
        ...prev.landDetails,
        [field]: value
      }
    }));
  };

  const handleNext = () => setStep(2);
  const handlePrev = () => setStep(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStep1Valid && isStep2Valid) {
      setShowPublishModal(true);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: any) => f.name);
      setFormData((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), ...newFiles]
      }));
    }
  };

  useEffect(() => {
    localStorage.setItem('realagents_land_draft', JSON.stringify(formData));
  }, [formData]);

  const calculatedTotal = useMemo(() => {
    return parseFloat(String(formData.salePrice || '0'));
  }, [formData.salePrice]);

  const pin = formData.landDetails?.locationPin || '';
  const link = formData.googlePinLink || '';
  const locationSatisfied = 
    pin.startsWith('pin:') || 
    link.startsWith('pin:') || 
    link.startsWith('https://maps') || 
    link.startsWith('https://goo.gl') || 
    link.startsWith('https://maps.app.goo.gl');

  const isStep1Valid = !!(
    formData.state &&
    formData.lga &&
    formData.address &&
    formData.landDetails.landSize !== '' && 
    formData.askingPrice !== '' && 
    formData.salePrice !== '' && 
    formData.landDetails.landUse !== '' && 
    locationSatisfied &&
    (!formData.landDetails.isEstatePlot || (formData.landDetails.estateName && formData.landDetails.estateName.trim() !== ''))
  );

  const isStep2Valid = !!(
    formData.titleDocumentFile !== null && 
    formData.surveyPlanFile !== null && 
    formData.photos && 
    formData.photos.length >= 3
  );

  const handleHeaderBack = () => {
    if (step === 1) {
      if (onBack) {
        onBack();
      } else {
        window.history.back();
      }
    } else {
      handlePrev();
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('realagents_land_draft');
    setFormData(defaultEmptyState);
    setShowDraftBanner(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 px-4 sm:px-6 relative">
      {/* Sticky Header Bar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b-4 border-brand-black dark:border-zinc-700 px-4 py-3 -mx-4 sm:-mx-6 mb-8 flex items-center justify-between">
        <button 
          onClick={handleHeaderBack}
          type="button"
          className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-[10px] font-black uppercase tracking-widest text-brand-black dark:text-white italic">
          Step {step} of 2: <span className="text-brand-teal animate-pulse">{step === 1 ? "Land Details" : "Document Verification"}</span>
        </div>
      </div>

      <div className="mb-10 text-center">
         <h1 className="text-5xl font-display font-black italic uppercase tracking-tighter mb-4">
            List Your <span className="text-brand-teal">Land Plot</span>
         </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex flex-col gap-4 mb-10">
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
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
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 italic">Step {step} of 2</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-teal italic font-bold">
            {step === 1 ? "Land Details" : "Document Verification"}
          </span>
         </div>
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              {showDraftBanner && (
                <div className="bg-amber-100 dark:bg-amber-955/40 border-2 border-amber-500 text-amber-800 dark:text-amber-200 p-3 flex items-center justify-between font-bold text-xs uppercase tracking-wider shadow-brutal-xs mb-4">
                  <span>Draft restored — tap × to start fresh.</span>
                  <button 
                    type="button" 
                    onClick={handleClearDraft} 
                    className="w-6 h-6 border bg-amber-200 dark:bg-amber-80 * border-amber-600 flex items-center justify-center font-display font-black text-xs hover:bg-amber-300 dark:hover:bg-amber-700 active:translate-y-0.5"
                  >
                    ×
                  </button>
                </div>
              )}

              <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
                Land <span className="text-brand-teal">Details</span>
              </h2>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Listing Type *</label>
                  <div className="flex rounded-none border-2 border-brand-black dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800">
                     {['Sale', 'Rent'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, listingType: type })}
                          className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${formData.listingType === type ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black' : 'bg-transparent text-brand-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                          FOR {type}
                        </button>
                     ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">State *</label>
                    <select 
                      className="brutalist-input-large"
                      value={formData.state}
                      onChange={e => setFormData({...formData, state: e.target.value, lga: ''})}
                    >
                      <option value="" disabled>Select State</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">LGA / Area *</label>
                    <select 
                      className="brutalist-input-large"
                      value={formData.lga}
                      onChange={e => setFormData({...formData, lga: e.target.value})}
                      disabled={!formData.state}
                    >
                      <option value="" disabled>Select LGA</option>
                      {formData.state && STATE_LGAS[formData.state]?.map((l: string) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Full Address *</label>
                  <input 
                    type="text" 
                    className="brutalist-input-large" 
                    placeholder="e.g. Plot 24, Zone C, Guzape" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
                </div>
              </div>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Land Size (SQM) *</label>
                  <input
                    type="number"
                    className="brutalist-input-large font-mono"
                    placeholder="Size in SQM"
                    value={formData.landDetails.landSize}
                    onChange={e => {
                      const sizeVal = e.target.value;
                      const size = parseFloat(sizeVal || '0');
                      const sale = parseFloat(String(formData.salePrice || '0'));
                      setFormData((prev: any) => ({
                        ...prev,
                        pricePerSqm: size > 0 ? (sale / size).toFixed(0) : '',
                        landDetails: {
                          ...prev.landDetails,
                          landSize: sizeVal
                        }
                      }));
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Asking Price (Seller's Valuation) *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-black text-xl text-brand-black dark:text-zinc-600">₦</span>
                      <input 
                        type="text"
                        className="brutalist-input-large !pl-12 font-mono font-black w-full"
                        value={formatNumberString(formData.askingPrice)}
                        onChange={e => setFormData({
                          ...formData, 
                          askingPrice: parseFormattedNumber(e.target.value)
                        })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Sale Price (Actual Listed Price) *</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-black text-xl text-brand-black dark:text-zinc-600">₦</span>
                      <input 
                        type="text"
                        className="brutalist-input-large !pl-12 font-mono font-black w-full"
                        value={formatNumberString(formData.salePrice)}
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          const size = parseFloat(formData.landDetails.landSize || '0');
                          setFormData({
                            ...formData, 
                            salePrice: val,
                            price: val,
                            pricePerSqm: size > 0 ? (Number(val) / size).toFixed(0) : ''
                          });
                        }}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Dynamic Price Calculation Card */}
                {formData.askingPrice && formData.salePrice ? (
                  <div className="p-4 border-4 border-brand-black dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-800 space-y-2 animate-fadeIn">
                    {(() => {
                      const ask = parseFloat(String(formData.askingPrice));
                      const sale = parseFloat(String(formData.salePrice));
                      const actualDiff = ask > 0 ? ((sale - ask) / ask) * 100 : 0;
                      
                      let badgeText = "STANDARD PRICE";
                      let badgeColor = "bg-zinc-800 text-white dark:bg-zinc-700 border-2 border-brand-black";
                      
                      if (actualDiff < -20) {
                        badgeText = "SUPER-DISTRESS SALE";
                        badgeColor = "bg-brand-red text-white font-black border-2 border-brand-black";
                      } else if (actualDiff <= -6) {
                        badgeText = "DISTRESS SALE";
                        badgeColor = "bg-orange-500 text-white font-black border-2 border-brand-black";
                      } else if (actualDiff >= 5.1) {
                        badgeText = "ABOVE MARKET VALUE";
                        badgeColor = "bg-purple-600 text-white font-black border-2 border-brand-black";
                      }
                      
                      const isBelow = actualDiff < 0;
                      const absDiffStr = Math.abs(actualDiff).toFixed(1);
                      const sentence = actualDiff === 0 
                        ? "This property is listed at exactly the seller's market value."
                        : `This property is listed at ${absDiffStr}% ${isBelow ? "below" : "above"} seller's market value.`;

                      const size = parseFloat(formData.landDetails.landSize || '0');
                      const ppsqm = size > 0 ? (sale / size) : 0;

                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] font-mono font-black uppercase text-zinc-500">Dual-valuation live audit:</span>
                            <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", badgeColor)}>
                              {badgeText}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {sentence}
                          </p>
                          {ppsqm > 0 && (
                            <p className="text-[10px] font-mono font-black uppercase text-zinc-400">
                              Computed Land Rate: ₦{formatNumber(ppsqm)} / SQM
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              {/* Is Estate Plot Toggle & Estate Name */}
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Is this inside an estate? *</label>
                  <div className="flex gap-2">
                    {[
                      { label: 'Yes', val: true },
                      { label: 'No', val: false }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleLandDetailsChange('isEstatePlot', opt.val)}
                        className={cn(
                          "flex-1 py-3 border-2 font-display font-black uppercase text-xs transition-colors",
                          formData.landDetails.isEstatePlot === opt.val
                            ? "bg-brand-black text-white border-brand-black"
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.landDetails.isEstatePlot && (
                  <div className="flex flex-col gap-1.5 pt-2 animate-fadeIn">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Estate / Development Name *</label>
                    <input
                      type="text"
                      className="brutalist-input-large"
                      placeholder="e.g. Guzape Hills Estate"
                      value={formData.landDetails.estateName || ''}
                      onChange={e => handleLandDetailsChange('estateName', e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Land Use *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                     {['Residential', 'Commercial', 'Mixed Use', 'Agricultural'].map((use) => (
                       <button
                         key={use}
                         type="button"
                         onClick={() => handleLandDetailsChange('landUse', use)}
                         className={cn(
                           "py-2.5 border-2 text-[10px] font-black uppercase transition-all",
                           formData.landDetails.landUse === use
                             ? "bg-brand-black text-white border-brand-black"
                             : "bg-white text-zinc-500 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                         )}
                       >
                         {use}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Topography / Drainage Status</label>
                  <textarea
                    className="brutalist-input min-h-[100px] resize-y"
                    placeholder="Describe the terrain (sloped, flat), topography, fence, surrounding development, etc."
                    value={formData.landDetails.topography}
                    onChange={e => handleLandDetailsChange('topography', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Available Infrastructure</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Paved Roads', 'Drainage System', 'Central Sewage', 
                      'Water Connection', 'Three-Phase Power', 'Street Lights', 
                      'Fenced Boundary', 'Gatehouse / Security'
                    ].map((infra) => {
                      const list = formData.landDetails.infrastructure || [];
                      const isChecked = list.includes(infra);
                      return (
                        <button
                          key={infra}
                          type="button"
                          onClick={() => {
                            const newList = isChecked
                              ? list.filter((i: string) => i !== infra)
                              : [...list, infra];
                            handleLandDetailsChange('infrastructure', newList);
                          }}
                          className={cn(
                            "px-3 py-1.5 border-2 text-[10px] font-black uppercase transition-all",
                            isChecked 
                              ? "bg-brand-black text-white border-brand-black" 
                              : "bg-white text-zinc-500 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                          )}
                        >
                          {infra}
                          {isChecked && <span className="ml-1.5 text-zinc-400">×</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Location Coordinates *</label>
                  <LeafletMap 
                     defaultLocation={formData.state ? `${formData.state}, Nigeria` : 'Lagos, Nigeria'}
                     onLocationSelect={({ lat, lng }) => {
                        const pinStr = `pin:${lat},${lng}`;
                        handleLandDetailsChange('locationPin', pinStr);
                        setFormData((prev: any) => ({ ...prev, googlePinLink: pinStr }));
                     }}
                  />
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"/>
                    <span className="text-[8px] font-black uppercase text-zinc-400">OR</span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"/>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest pl-1">Or paste Google Maps Link</label>
                    <input 
                      type="text" 
                      placeholder="https://maps.app.goo.gl/..." 
                      className="brutalist-input-large"
                      value={(formData.googlePinLink || '').startsWith('pin:') ? '' : (formData.googlePinLink || '')}
                      onChange={e => {
                         const val = e.target.value;
                         setFormData((prev: any) => ({ ...prev, googlePinLink: val }));
                         handleLandDetailsChange('locationPin', val);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
                <button type="button" onClick={handleHeaderBack} className="brutalist-button-gray flex-1 group">
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
                </button>
                <button
                  type="button"
                  className="brutalist-button-black flex-[2] bg-brand-black dark:bg-white text-white dark:text-brand-black disabled:opacity-50 group font-black"
                  disabled={!isStep1Valid}
                  onClick={handleNext}
                >
                  Continue documents
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform inline-block ml-1" />
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
                Verification <span className="text-brand-teal">Documents</span>
              </h2>

              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-6 border-2 border-brand-black dark:border-zinc-700">
                <DocumentUpload 
                  label="Title Document * (C of O, Gazette, etc.)"
                  required
                  onFileSelect={file => setFormData({ ...formData, titleDocumentFile: file })}
                />

                <DocumentUpload 
                  label="Survey Plan *"
                  required
                  accept="application/pdf,image/jpeg,image/png"
                  onFileSelect={file => {
                     setFormData({ ...formData, surveyPlanFile: file });
                     handleLandDetailsChange('surveyPlanFileName', file?.name || '');
                  }}
                />

                <PhotoUpload 
                  label="Photos / Beacons of Land * (Min 3)"
                  required
                  onPhotosSelect={handlePhotosUpload}
                />
              </div>

              <div className="mt-8 pt-8 border-t-4 border-brand-black dark:border-zinc-700">
                 <h3 className="text-xl font-display font-black uppercase tracking-tight mb-4 dark:text-white">Listing Summary</h3>
                 <div className="bg-brand-gray dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 p-6 flex flex-col gap-3 shadow-brutal-sm">
                    <div className="font-display font-black text-lg dark:text-white">AI-Generated Land Title (Created on Submit)</div>
                    <div className="font-black text-brand-teal text-xl">
                      Estimated value: ₦{formatNumber(calculatedTotal)}
                    </div>
                    <div className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-300">
                      {formData.landDetails.landSize} SQM • {formData.landDetails.landUse} • {formData.lga || ''}, {formData.state || ''}
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="brutalist-button-black flex-1 py-4 text-xs font-black uppercase"
                >
                  ← BACK
                </button>
                <button
                  type="submit"
                  disabled={!isStep2Valid}
                  className="brutalist-button-teal flex-[2] py-4 text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SUBMIT LISTING
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Submission type selection overlay */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 p-6 shadow-brutal-lg"
            >
              <h3 className="text-2xl font-display font-black italic uppercase tracking-tighter mb-2 text-brand-black dark:text-white">
                Ready to publish?
              </h3>
              <p className="text-xs font-bold uppercase tracking-tight text-zinc-500 mb-6">
                CHOOSE SUBMISSION TYPE FOR YOUR WORKSPACE LISTING
              </p>
              
              <div className="flex flex-col gap-4">
                {/* Button A — PUBLISH AS LIVE */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishModal(false);
                    localStorage.removeItem('realagents_land_draft');
                    onSubmit({ ...formData, propertyCategory: 'Land', isDraft: false });
                  }}
                  className="flex items-center gap-4 p-4 border-4 border-brand-black dark:border-zinc-700 bg-brand-teal hover:bg-brand-teal/90 text-brand-black transition-transform hover:-translate-y-1 hover:shadow-brutal-xs font-display font-black italic uppercase text-left w-full"
                >
                  <div className="p-2 bg-brand-black text-white shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg tracking-tight">PUBLISH AS LIVE</div>
                    <div className="text-[10px] font-mono font-normal normal-case text-zinc-800 leading-tight">Make listing instantly viewable to agents and start bidding now.</div>
                  </div>
                </button>

                {/* Button B — SAVE TO DRAFTS FOR LATER */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishModal(false);
                    localStorage.removeItem('realagents_land_draft');
                    onSubmit({ ...formData, propertyCategory: 'Land', isDraft: true });
                  }}
                  className="flex items-center gap-4 p-4 border-4 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-805 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-brand-black dark:text-white transition-transform hover:-translate-y-1 hover:shadow-brutal-xs font-display font-black italic uppercase text-left w-full"
                >
                  <div className="p-2 bg-zinc-200 dark:bg-zinc-700 text-brand-black dark:text-white shrink-0">
                    <Banknote size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg tracking-tight">SAVE TO DRAFTS FOR LATER</div>
                    <div className="text-[10px] font-mono font-normal normal-case text-zinc-500 dark:text-zinc-400 leading-tight">Keep it safely tucked away in your workspace drafts. (Max 3 drafts)</div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="text-xs font-black uppercase text-zinc-500 hover:text-brand-black dark:hover:text-white pl-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
