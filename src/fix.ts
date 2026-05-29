import fs from 'fs';

let content = fs.readFileSync('src/components/ListingForm.tsx', 'utf8');

// We are replacing from the end of the first amenities mapping (line 970-ish) 
// all the way down to where step 4 starts (Contact Identity) at line 1274.

const startDel = content.indexOf('<div className="flex flex-col gap-1.5 col-span-full">\n                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">\n                      <span>Amenities</span>');

const endDel = content.indexOf('{step === 4 && (');

if (startDel !== -1 && endDel !== -1) {
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
            key="step3-media"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">
              Media & <span className="text-brand-teal">Location</span>
            </h2>

            <div className="space-y-6">
              {/* Address and Geography */}
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

              {/* Extras */}
              <div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-full">
                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
                      <span>Condition <span className="text-red-500">*</span></span>
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

            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">
              <button onClick={handlePrev} className="brutalist-button-gray flex-1 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back
              </button>
              <button 
                onClick={handleNext} 
                disabled={!formData.address || !formData.state || !formData.lga || !formData.condition}
                className="brutalist-button-black flex-[2] disabled:opacity-50 group"
              >
                Go to Verification
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        `;

  content = content.replace(content.substring(startDel, endDel), replacement);
  fs.writeFileSync('src/components/ListingForm.tsx', content);
  console.log('Fixed listing form components');
} else {
  console.log('Could not find boundaries: startDel=' + startDel + ', endDel=' + endDel);
}

