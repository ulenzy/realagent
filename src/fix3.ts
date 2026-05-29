import fs from 'fs';

let content = fs.readFileSync('src/components/ListingForm.tsx', 'utf8');

const amenitiesStart = content.indexOf('<div className="flex flex-col gap-1.5 col-span-full">\n                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">\n                      <span>Amenities</span>');

const firstStep4Start = content.indexOf('{step === 4 && (');

if (firstStep4Start !== -1 && amenitiesStart !== -1) {
  // We want to replace from amenitiesStart up to firstStep4Start
  const replacement = `                  </div>
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
                disabled={
                  !formData.propertySubType ||
                  !formData.sizeSqm ||
                  (formData.propertyType !== 'Land' && Number(formData.bedrooms || 0) < 0) ||
                  (formData.propertyType !== 'Land' && Number(formData.bathrooms || 0) < 0) ||
                  !formData.estateName ||
                  formData.amenities.length === 0
                }
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
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter flex items-center gap-2">
              Media & <span className="text-brand-teal">Location</span>
            </h2>

            {/* Address */}
            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>State <span className="text-red-500">*</span></span>
                    </label>
                    <select 
                      className="brutalist-input-large h-[58px]"
                      value={formData.state}
                      onChange={e => setFormData({...formData, state: e.target.value, lga: ''})}
                      required
                    >
                      <option value="" disabled>Select State</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>LGA / Area <span className="text-red-500">*</span></span>
                    </label>
                    <select 
                      className="brutalist-input-large h-[58px]"
                      value={formData.lga}
                      onChange={e => setFormData({...formData, lga: e.target.value})}
                      disabled={!formData.state}
                      required
                    >
                      <option value="" disabled>Select LGA</option>
                      {formData.state && STATE_LGAS[formData.state]?.map((l: string) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                    <span>Full Address <span className="text-red-500">*</span></span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 14 Awolowo Road, Ikoyi"
                    className="brutalist-input-large"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>
            </div>

            <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-full">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Condition</span>
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
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Year Built (Optional)</span>
                    </label>
                    <input 
                      type="number" 
                      className="brutalist-input-large"
                      value={formData.yearBuilt}
                      onChange={e => setFormData({...formData, yearBuilt: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Parking Spaces</span>
                    </label>
                    <input 
                      type="number" 
                      className="brutalist-input-large"
                      value={formData.parkingSpaces}
                      onChange={e => setFormData({...formData, parkingSpaces: e.target.value})}
                    />
                  </div>
                </div>
             </div>

             <div className="p-4 bg-brand-black text-white border-2 border-brand-teal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none">
              <h3 className="text-xs font-display font-black uppercase text-brand-teal tracking-widest leading-none mb-3 flex items-center gap-2">
                <ShieldCheck className="text-brand-teal shrink-0" size={16} /> LISTING REQUIREMENTS TRACKER
              </h3>
              <ul className="space-y-2">
                {[
                  ...(formData.listingType === 'Sale' ? [{
                    text: "Title Document — upload C of O, R of O, or equivalent",
                    met: !!formData.titleDocumentFile
                  }] : []),
                  {
                    text: "Property Photos — minimum 3 photos required",
                    met: formData.listingRequirements.photos.length >= 3
                  },
                  {
                    text: "Location Pin — valid link or Pinned Location",
                    met: !!(formData.listingRequirements.locationPin && (
                      formData.listingRequirements.locationPin.startsWith('pin:') || 
                      formData.listingRequirements.locationPin.includes('maps.google') || 
                      formData.listingRequirements.locationPin.includes('goo.gl')
                    ))
                  }
                ].map((req, i) => (
                  <li key={i} className="flex gap-2 items-start opacity-90 text-[10px] sm:text-xs font-bold font-mono">
                    {req.met ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500 shrink-0 mt-0.5" />
                    )}
                    <span className={req.met ? "text-zinc-200" : "text-zinc-400"}>{req.text}</span>
                  </li>
                ))}
              </ul>
            </div>

`;
  
  // Note: we replace FIRST occurence of firstStep4Start (which is the actual Listing Requirements block START).
  // Wait, I am REMOVING the firstStep4Start? No, I want to keep the Title Doc and Photos!
  // I only want to replace from amenitiesStart up to `firstStep4Start + 600`?
  // Let me just replace the broken chunk, and then I will KEEP Title Doc & photos!
  
  // To keep it simple, let's replace from amenitiesStart to the START of `firstStep4Start`, 
  // and insert Step 2 End + Step 3 Start.
  // Then the next block (which was step 4: Listing Requirements) we'll just rename to NOT step 4?
  // Wait, I put `step === 3 && (` in BOTH `replacement` AND the upcoming `Listing Requirements` block (which has `step === 4` originally).

}
