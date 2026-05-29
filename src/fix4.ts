import fs from 'fs';

let content = fs.readFileSync('src/components/ListingForm.tsx', 'utf8');

// The marker for the end of the good amenities in Step 2:
const step2AmenitiesEnd = content.indexOf('</button>\n                      );\n                    })}\n                  </div>\n                </div>');

let partA = content.substring(0, step2AmenitiesEnd + 119); 
// 119 roughly covers `</button>\n                      );\n                    })}\n                  </div>\n                </div>`.

// Step 3 Content (From original step 4)
const step3TitleDocStart = content.indexOf('{/* Section 1 — Title Document */}');
const step3MapModalEnd = content.indexOf('</motion.div>\n                </motion.div>\n              )}\n            </AnimatePresence>');
let partB = content.substring(step3TitleDocStart, step3MapModalEnd + 93);

// Step 4 (Contact Identity)
const step4Start = content.lastIndexOf('{step === 4 && (');
let partC = content.substring(step4Start);

const step2End = `
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
`;

const step3NewStart = `
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

const step3End = `
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

`;

const newFileContent = partA + step2End + step3NewStart + partB + step3End + partC;

// Quick patch: Make sure there's exactly 1 closing tag for step4
// The original file ended properly, partC has the rest.

// Also apply `coreReqsMet` fix to `content` string inside `partA` ? No, `partA` contains the `useEffect`.
// Let's replace it in `partA`:
partA = partA.replace(/reqs\.physicalConditionDescription\.length >= 100/g, "true /* condition removed */");
// And remove `googlePinLink` reference if there is any in `partA` that errors.

fs.writeFileSync('src/components/ListingForm.tsx', partA + step2End + step3NewStart + "\n            <div className=\"space-y-6\">\n" + partB  + "\n            </div>\n" + step3End + partC);
console.log('Fixed');
