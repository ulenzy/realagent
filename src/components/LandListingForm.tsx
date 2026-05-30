import React, { useState } from 'react';
import { LeafletMap } from './shared/LeafletMap';
import DocumentUpload from './shared/DocumentUpload';
import PhotoUpload from './shared/PhotoUpload';
import { ArrowLeft } from 'lucide-react';

export default function LandListingForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    propertyCategory: 'Land',
    title: '',
    listingType: 'Sale', // default
    price: '',
    landDetails: {
      landSize: '',
      landSizeUnit: 'sqm',
      landUse: '',
      topography: '',
      locationPin: '',
      surveyPlanFileName: '',
      surveyPlanUrl: '',
    },
    titleDocumentFile: null,
    surveyPlanFile: null,
    photos: []
  });

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
    onSubmit(formData);
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

  const isStep1Valid = 
    formData.title.length > 0 && 
    formData.price !== '' && 
    formData.landDetails.landSize !== '' && 
    formData.landDetails.landUse !== '' && 
    formData.landDetails.locationPin !== '';

  const isStep2Valid = 
    formData.titleDocumentFile !== null && 
    formData.surveyPlanFile !== null && 
    formData.photos.length >= 3;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-fadeIn">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl font-display font-black uppercase text-brand-black dark:text-white">
             Land Information Form
          </div>
        </div>
        <div className="flex gap-2">
          <div className={`h-2 flex-1 rounded-none ${step >= 1 ? 'bg-brand-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
          <div className={`h-2 flex-1 rounded-none ${step >= 2 ? 'bg-brand-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-3">
          Step {step} of 2 — {step === 1 ? 'Land Information' : 'Verification Documents'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Listing Title *</label>
              <input
                type="text"
                placeholder="e.g. 500sqm Residential Plot, Guzape Abuja."
                className="brutalist-input"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Listing Type *</label>
              <div className="flex rounded-none border-2 border-brand-black dark:border-zinc-700 overflow-hidden">
                 {['Sale', 'Rent'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, listingType: type })}
                      className={`flex-1 py-3 text-xs font-black uppercase tracking-widest ${formData.listingType === type ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black' : 'bg-transparent text-brand-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      FOR {type}
                    </button>
                 ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Asking Price *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-brand-black dark:text-white">₦</span>
                <input
                  type="text"
                  className="brutalist-input pl-10"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value.replace(/[^0-9,.]/g, '') })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Land Size *</label>
              <div className="flex gap-2">
                 <input
                  type="number"
                  className="brutalist-input flex-1"
                  placeholder="Size"
                  value={formData.landDetails.landSize}
                  onChange={e => handleLandDetailsChange('landSize', e.target.value)}
                  required
                 />
                 <div className="flex border-2 border-brand-black dark:border-zinc-700 w-48 shrink-0">
                    {['sqm', 'hectares'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleLandDetailsChange('landSizeUnit', unit)}
                        className={`flex-1 text-[10px] font-black uppercase tracking-widest ${formData.landDetails.landSizeUnit === unit ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black' : 'bg-transparent text-brand-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                      >
                        {unit}
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Land Use *</label>
              <div className="flex flex-wrap gap-2">
                 {['Residential', 'Commercial', 'Mixed Use', 'Agricultural'].map((use) => (
                   <button
                     key={use}
                     type="button"
                     onClick={() => handleLandDetailsChange('landUse', use)}
                     className={`px-4 py-2 border-2 border-brand-black dark:border-zinc-700 text-xs font-black uppercase tracking-widest transition-all ${formData.landDetails.landUse === use ? 'bg-brand-black text-white dark:bg-zinc-200 dark:text-brand-black' : 'bg-zinc-50 dark:bg-zinc-800 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'}`}
                   >
                     {use}
                   </button>
                 ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Topography / Condition</label>
              <textarea
                className="brutalist-input min-h-[100px] resize-y"
                placeholder="Describe the land condition, terrain, drainage, perimeter fence status, road frontage..."
                value={formData.landDetails.topography}
                onChange={e => handleLandDetailsChange('topography', e.target.value)}
                minLength={60}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">Location Pin *</label>
              <LeafletMap 
                 defaultLocation="Lagos, Nigeria"
                 onLocationSelect={({ lat, lng }) => {
                    handleLandDetailsChange('locationPin', `${lat},${lng}`);
                 }}
              />
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="brutalist-button-teal w-full py-4 text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isStep1Valid}
                onClick={handleNext}
              >
                NEXT STEP →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <DocumentUpload 
              label="Title Document"
              required
              onFileSelect={file => setFormData({ ...formData, titleDocumentFile: file })}
            />

            <DocumentUpload 
              label="Survey Plan"
              required
              accept="application/pdf,image/jpeg,image/png"
              onFileSelect={file => {
                 setFormData({ ...formData, surveyPlanFile: file });
                 handleLandDetailsChange('surveyPlanFileName', file?.name || '');
              }}
            />

            <PhotoUpload 
              label="Property Photos (Min 3)"
              required
              onPhotosSelect={handlePhotosUpload}
            />

            <div className="mt-8 pt-8 border-t-4 border-brand-black dark:border-zinc-700">
               <h3 className="text-xl font-display font-black uppercase tracking-tight mb-4 dark:text-white">Listing Summary</h3>
               <div className="bg-brand-gray dark:bg-zinc-800 border-4 border-brand-black dark:border-zinc-700 p-6 flex flex-col gap-3 shadow-brutal-sm">
                  <div className="font-display font-black text-lg dark:text-white">{formData.title}</div>
                  <div className="font-black text-brand-teal text-xl">₦{formData.price}</div>
                  <div className="text-xs font-bold uppercase text-zinc-500">{formData.landDetails.landSize} {formData.landDetails.landSizeUnit} • {formData.landDetails.landUse}</div>
               </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handlePrev}
                className="brutalist-button-black flex-1 py-4 text-xs"
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
          </div>
        )}
      </form>
    </div>
  );
}
