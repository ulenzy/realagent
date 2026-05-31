import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Home, Trees, Banknote, Map, Info 
} from 'lucide-react';
import { cn, formatNumberString, parseFormattedNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NIGERIAN_STATES, STATE_LGAS } from '../constants/locations';

import DocumentUpload from './shared/DocumentUpload';
import PhotoUpload from './shared/PhotoUpload';

import { LeafletMap } from './shared/LeafletMap';

const defaultEmptyState = {
  title: '',
  propertyType: 'House',
  listingType: 'Sale' as 'Sale' | 'Rent',
  propertySubType: '',
  price: '',
  askingPrice: '',
  salePrice: '',
  sizeSqm: '',
  bedrooms: '0',
  bathrooms: '0',
  estateName: '',
  amenities: [] as string[],
  state: '',
  lga: '',
  address: '',
  condition: '',
  yearBuilt: '',
  parkingSpaces: '',
  googlePinLink: '',
  titleDocumentFile: null as File | null,
  photos: [] as string[],
  listingRequirements: {
    locationPin: '',
    titleDocumentFileName: '',
    titleDocumentFileType: '',
    physicalConditionDescription: '',
    photos: [] as string[],
  }
};

export default function BuildingListingForm({ 
  onSubmit, 
  onBack, 
  initialData 
}: { 
  onSubmit?: (data: any) => void; 
  onBack?: () => void; 
  initialData?: any; 
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    try {
      const draft = localStorage.getItem('realagents_building_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        return {
          ...defaultEmptyState,
          ...parsed,
          titleDocumentFile: null
        };
      }
    } catch (e) {
      console.warn("Failed to read draft:", e);
    }
    return { ...defaultEmptyState, ...initialData };
  });

  const [showDraftBanner, setShowDraftBanner] = useState(() => {
    return !!localStorage.getItem('realagents_building_draft');
  });

  const [customAmenity, setCustomAmenity] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleNext = () => setStep(s => Math.min(s + 1, 2));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentReqsMet()) {
      setShowPublishModal(true);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: any) => f.name);
      setFormData(prev => ({
        ...prev,
        listingRequirements: {
          ...prev.listingRequirements,
          photos: [...prev.listingRequirements.photos, ...newFiles]
        }
      }));
    }
  };

  const currentReqsMet = () => {
    if (step === 1) {
      return !!(
        formData.propertySubType && 
        formData.sizeSqm && 
        formData.estateName && 
        formData.amenities.length > 0 && 
        formData.askingPrice && 
        formData.salePrice && 
        formData.listingType && 
        formData.bedrooms && 
        formData.bathrooms
      );
    }
    if (step === 2) {
      const pin = formData.listingRequirements.locationPin || '';
      const link = formData.googlePinLink || '';
      const locationSatisfied = 
        pin.startsWith('pin:') || 
        link.startsWith('pin:') || 
        link.startsWith('https://maps') || 
        link.startsWith('https://goo.gl') || 
        link.startsWith('https://maps.app.goo.gl');

      return !!(
        formData.state && 
        formData.lga && 
        formData.address && 
        locationSatisfied && 
        formData.listingRequirements.photos.length >= 3 && 
        (formData.listingType === 'Sale' ? formData.titleDocumentFile : true)
      );
    }
    return false;
  };

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
    localStorage.removeItem('realagents_building_draft');
    setFormData(defaultEmptyState);
    setShowDraftBanner(false);
  };

  useEffect(() => {
    localStorage.setItem('realagents_building_draft', JSON.stringify(formData));
  }, [formData]);

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
          Step {step} of 2: <span className="text-brand-teal animate-pulse">{step === 1 ? "Property Details" : "Media & Location"}</span>
        </div>
      </div>

      <div className="mb-10 text-center">
         <h1 className="text-5xl font-display font-black italic uppercase tracking-tighter mb-4">
            List Your <span className="text-brand-teal">Property</span>
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
            {step === 1 ? "Property Details" : "Media & Location"}
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
            className="flex flex-col gap-6"
          >
            {showDraftBanner && (
              <div className="bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-500 text-amber-800 dark:text-amber-200 p-3 flex items-center justify-between font-bold text-xs uppercase tracking-wider shadow-brutal-xs mb-4">
                <span>Draft restored — tap × to start fresh.</span>
                <button 
                  type="button" 
                  onClick={handleClearDraft} 
                  className="w-6 h-6 border bg-amber-200 dark:bg-amber-805 border-amber-600 flex items-center justify-center font-display font-black text-xs hover:bg-amber-300 dark:hover:bg-amber-700 active:translate-y-0.5"
                >
                  ×
                </button>
              </div>
            )}

            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
              Property <span className="text-brand-teal">Details</span>
            </h2>

            <div className="space-y-6">
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700">
                {/* Dual Pricing Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Asking Price (Seller's Valuation) *</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-black text-xl text-brand-black dark:text-zinc-650">₦</span>
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
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Sale Price (Actual Listed Price) *</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 font-black text-xl text-brand-black dark:text-zinc-650">₦</span>
                      <input 
                        type="text"
                        className="brutalist-input-large !pl-12 font-mono font-black w-full"
                        value={formatNumberString(formData.salePrice)}
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          setFormData({
                            ...formData, 
                            salePrice: val,
                            price: val
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
                        </div>
                      );
                    })()}
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Listing Type</span>
                  </label>
                  <div className="flex gap-2">
                    {['Sale', 'Rent'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, listingType: t as 'Sale' | 'Rent'})}
                        className={cn(
                          "flex-1 py-3 border-2 font-display font-black uppercase text-xs transition-all",
                          formData.listingType === t 
                            ? "bg-brand-black text-white border-brand-black" 
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                        )}
                      >
                        For {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Property Sub-Type <span className="text-red-500">*</span></span>
                  </label>
                  <select 
                    className="brutalist-input-large h-[58px]"
                    value={formData.propertySubType}
                    onChange={e => setFormData({...formData, propertySubType: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select Sub-Type</option>
                    {['Terrace', 'Bungalow', 'Semi-Detached Duplex', 'Fully Detached Duplex', 'Mansion'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Size in SQM <span className="text-red-500">*</span></span>
                  </label>
                  <input 
                    type="number"
                    placeholder="e.g. 600"
                    className="brutalist-input-large font-mono"
                    value={formData.sizeSqm}
                    onChange={e => setFormData({...formData, sizeSqm: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Bedrooms</span>
                    </label>
                    <div className="flex items-center border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bedrooms: String(Math.max(0, Number(formData.bedrooms || 0) - 1))})}
                        className="p-3 w-12 border-r-2 border-brand-black dark:border-zinc-700 disabled:opacity-50 dark:text-white"
                      >-</button>
                      <div className="flex-1 text-center font-display font-black text-lg dark:text-white">{formData.bedrooms}</div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bedrooms: String(Math.min(10, Number(formData.bedrooms || 0) + 1))})}
                        className="p-3 w-12 border-l-2 border-brand-black dark:border-zinc-700 disabled:opacity-50 dark:text-white"
                      >+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Bathrooms</span>
                    </label>
                    <div className="flex items-center border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bathrooms: String(Math.max(0, Number(formData.bathrooms || 0) - 1))})}
                        className="p-3 w-12 border-r-2 border-brand-black dark:border-zinc-700 disabled:opacity-50 dark:text-white"
                      >-</button>
                      <div className="flex-1 text-center font-display font-black text-lg dark:text-white">{formData.bathrooms}</div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bathrooms: String(Math.min(10, Number(formData.bathrooms || 0) + 1))})}
                        className="p-3 w-12 border-l-2 border-brand-black dark:border-zinc-700 disabled:opacity-50 dark:text-white"
                      >+</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Estate / Development Name <span className="text-red-500">*</span></span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pinnock Beach Estate"
                    className="brutalist-input-large"
                    value={formData.estateName}
                    onChange={e => setFormData({...formData, estateName: e.target.value})}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Amenities <span className="text-red-500">*</span></span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Electricity', 'Borehole', 'Security', 'Road Access', 'Fence', 'Gate', 'BQ', 'Swimming Pool', 'Gym', 'Playground'].map((amenity) => {
                       const isChecked = formData.amenities.includes(amenity);
                       return (
                         <button
                           key={amenity}
                           type="button"
                           onClick={() => setFormData(prev => ({
                             ...prev,
                             amenities: isChecked ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity]
                           }))}
                           className={cn(
                             "px-3 py-1.5 border-2 text-[10px] font-black uppercase transition-all",
                             isChecked ? "bg-brand-black text-white border-brand-black" : "bg-white text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                           )}
                         >
                           {amenity}
                           {isChecked && <span className="ml-1.5 text-zinc-400">×</span>}
                         </button>
                       );
                    })}
                    {formData.amenities.filter(a => !['Electricity', 'Borehole', 'Security', 'Road Access', 'Fence', 'Gate', 'BQ', 'Swimming Pool', 'Gym', 'Playground'].includes(a)).map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          amenities: prev.amenities.filter(a => a !== amenity)
                        }))}
                        className="px-3 py-1.5 border-2 text-[10px] font-black uppercase transition-all bg-brand-black text-white border-brand-black flex items-center gap-1.5"
                      >
                        {amenity}
                        <span className="text-zinc-400">×</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <input 
                      type="text"
                      placeholder="Add custom amenity..."
                      className="brutalist-input flex-1"
                      value={customAmenity}
                      onChange={e => setCustomAmenity(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customAmenity.trim();
                          if (val && !formData.amenities.includes(val)) {
                            setFormData(prev => ({
                              ...prev,
                              amenities: [...prev.amenities, val]
                            }));
                            setCustomAmenity('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customAmenity.trim();
                        if (val && !formData.amenities.includes(val)) {
                          setFormData(prev => ({
                            ...prev,
                            amenities: [...prev.amenities, val]
                          }));
                          setCustomAmenity('');
                        }
                      }}
                      className="brutalist-button-black px-4 py-2 text-xs font-black uppercase tracking-wider"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button type="button" onClick={handleHeaderBack} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={!currentReqsMet()}
                className="brutalist-button-black flex-[2] disabled:opacity-50 group"
              >
                Continue specifications
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
              Media & <span className="text-brand-teal">Location</span>
            </h2>

            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4 border-2 border-brand-black dark:border-zinc-700 rounded-none">
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
                  <input type="text" className="brutalist-input-large" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            {/* Media & Location Requirements */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-6 border-2 border-brand-black dark:border-zinc-700">
               <DocumentUpload 
                  label="Title Document" 
                  required={formData.listingType === 'Sale'} 
                  onFileSelect={file => setFormData({...formData, titleDocumentFile: file})} 
                />
               <PhotoUpload 
                  label="Property Photos (Min 3)" 
                  required 
                  onPhotosSelect={handlePhotosUpload} 
                />
               <div className="flex flex-col gap-1.5">
                 <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                   Google Pin Link / Coordinates *
                 </label>
                 <LeafletMap 
                   defaultLocation={formData.state ? `${formData.state}, Nigeria` : 'Abuja, Nigeria'}
                   onLocationSelect={(pos) => setFormData({
                     ...formData, 
                     googlePinLink: `pin:${pos.lat},${pos.lng}`, 
                     listingRequirements: {
                       ...formData.listingRequirements, 
                       locationPin: `pin:${pos.lat},${pos.lng}`
                     }
                   })} 
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
                     value={formData.googlePinLink.startsWith('pin:') ? '' : formData.googlePinLink}
                     onChange={e => setFormData({
                       ...formData, 
                       googlePinLink: e.target.value,
                       listingRequirements: {
                         ...formData.listingRequirements, 
                         locationPin: e.target.value
                       }
                     })}
                   />
                 </div>
               </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button type="button" onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={!currentReqsMet()} 
                className="brutalist-button-black flex-[2] bg-brand-teal hover:bg-brand-teal/90 text-brand-black border-brand-teal group font-black"
              >
                Submit Listing <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    localStorage.removeItem('realagents_building_draft');
                    if (onSubmit) onSubmit({ ...formData, propertyCategory: 'Building', isDraft: false });
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
                    localStorage.removeItem('realagents_building_draft');
                    if (onSubmit) onSubmit({ ...formData, propertyCategory: 'Building', isDraft: true });
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
