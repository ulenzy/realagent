import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, MapPin, FileText, User, ArrowLeft, ArrowRight, 
  CheckCircle2, Home, Landmark, Trees, Factory, Banknote, Map, Hash, Info, 
  Phone, Mail, UserCircle, ShieldAlert, ShieldCheck, Trash2, FileCode, Paperclip 
} from 'lucide-react';
import { cn, formatNumberString, parseFormattedNumber, formatNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { NIGERIAN_STATES, STATE_LGAS } from '../constants/locations';

const propertyTypes = [
  { type: 'House', icon: Home, label: 'House / Apartments' },
  { type: 'Land', icon: Trees, label: 'Plots / Acres' }
];

import DocumentUpload from './shared/DocumentUpload';
import PhotoUpload from './shared/PhotoUpload';

export default function BuildingListingForm({ onSubmit, initialData }: { onSubmit?: (data: any) => void; initialData?: any; }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    propertyType: 'House',
    listingType: 'Sale' as 'Sale' | 'Rent',
    propertySubType: '',
    price: '',
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
    },
    nin: '',
    bvn: '',
    faceVerificationSent: false,
    faceVerificationDone: false,
    ...initialData
  });

  const [customAmenity, setCustomAmenity] = useState('');

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit({ ...formData, propertyCategory: 'Building' });
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
    if (step === 1) return formData.propertyType !== '';
    if (step === 2) return formData.propertySubType && formData.sizeSqm && formData.estateName && formData.amenities.length > 0;
    if (step === 3) return formData.state && formData.lga && formData.address && (formData.listingRequirements.locationPin || formData.googlePinLink) && formData.listingRequirements.photos.length >= 3 && (formData.listingType === 'Sale' ? formData.titleDocumentFile : true);
    if (step === 4) return formData.nin && formData.bvn && formData.faceVerificationDone && formData.price;
    return false;
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10 text-center">
         <h1 className="text-5xl font-display font-black italic uppercase tracking-tighter mb-4">
            List Your <span className="text-brand-teal">Property</span>
         </h1>
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
            {step === 2 && "Property Details"}
            {step === 3 && "Media & Location"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {propertyTypes.map((pt) => (
                  <button
                    key={pt.type}
                    onClick={() => setFormData({...formData, propertyType: pt.type})}
                    className={cn(
                      "flex items-center gap-4 p-6 border-4 text-left transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      formData.propertyType === pt.type
                        ? "border-brand-black bg-brand-teal/10 dark:bg-brand-teal/20"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    )}
                  >
                    <div className="p-4 bg-brand-black text-white shrink-0">
                      <pt.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-display font-black italic uppercase tracking-tighter text-xl">{pt.label}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button 
                onClick={handleNext} 
                disabled={!formData.propertyType}
                className="brutalist-button-black w-1/2 disabled:opacity-50 group"
              >
                Continue
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
              Property <span className="text-brand-teal">Details</span>
            </h2>

            <div className="space-y-6">
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
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
                        className="p-3 w-12 border-r-2 border-brand-black disabled:opacity-50"
                      >-</button>
                      <div className="flex-1 text-center font-display font-black text-lg">{formData.bedrooms}</div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bedrooms: String(Math.min(10, Number(formData.bedrooms || 0) + 1))})}
                        className="p-3 w-12 border-l-2 border-brand-black disabled:opacity-50"
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
                        className="p-3 w-12 border-r-2 border-brand-black disabled:opacity-50"
                      >-</button>
                      <div className="flex-1 text-center font-display font-black text-lg">{formData.bathrooms}</div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, bathrooms: String(Math.min(10, Number(formData.bathrooms || 0) + 1))})}
                        className="p-3 w-12 border-l-2 border-brand-black disabled:opacity-50"
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
                             isChecked ? "bg-brand-black text-white border-brand-black" : "bg-white text-zinc-500 border-zinc-200"
                           )}
                         >{amenity}</button>
                       );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button 
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

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
              Media & <span className="text-brand-teal">Location</span>
            </h2>

            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
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
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-6">
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
                 <div className="h-64 border-4 border-brand-black relative bg-zinc-100 dark:bg-zinc-800">
                    <MapContainer center={[6.5244, 3.3792]} zoom={11} className="w-full h-full z-0">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </MapContainer>
                    <div className="absolute top-2 left-2 right-2 z-10 flex gap-2">
                       <input 
                         type="text" 
                         placeholder="Or paste Google Maps link here" 
                         className="brutalist-input shadow-lg flex-1"
                         value={formData.googlePinLink}
                         onChange={e => setFormData({
                           ...formData, 
                           googlePinLink: e.target.value,
                           listingRequirements: {...formData.listingRequirements, locationPin: e.target.value}
                         })}
                       />
                    </div>
                 </div>
               </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button onClick={handleNext} disabled={!currentReqsMet()} className="brutalist-button-black flex-[2] group">
                Identify Entity <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
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
              Contact <span className="text-brand-teal">Identity</span>
            </h2>

            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Expected Price *</label>
                  <input 
                    type="text"
                    className="brutalist-input-large font-mono font-black"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFormattedNumber(e.target.value)})}
                    placeholder="₦ 0.00"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">NIN *</label>
                    <input type="text" className="brutalist-input-large font-mono" value={formData.nin} onChange={e => setFormData({...formData, nin: e.target.value})} maxLength={11} placeholder="11 Digits" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">BVN *</label>
                    <input type="text" className="brutalist-input-large font-mono" value={formData.bvn} onChange={e => setFormData({...formData, bvn: e.target.value})} maxLength={11} placeholder="11 Digits" />
                 </div>
               </div>
               
               <div className="pt-4">
                 <button 
                   type="button"
                   onClick={() => setFormData({...formData, faceVerificationDone: true, faceVerificationSent: true})}
                   className={cn(
                     "w-full p-4 border-4 text-center font-black uppercase tracking-widest transition-all",
                     formData.faceVerificationDone ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-brand-black bg-brand-black text-white"
                   )}
                 >
                   {formData.faceVerificationDone ? "Face Verified ✓" : "Launch Face Verification"}
                 </button>
               </div>
            </div>

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!currentReqsMet()}
                className="brutalist-button-black flex-[2] bg-brand-teal hover:bg-brand-teal/90 text-brand-black border-brand-teal group"
              >
                Submit Listing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
