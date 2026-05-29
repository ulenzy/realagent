import fs from 'fs';

let content = fs.readFileSync('src/components/ListingForm.tsx', 'utf-8');

// 1. Remove Physical Condition Requirement from `coreReqsMet`
content = content.replace(
  'reqs.physicalConditionDescription.length >= 100',
  'true // condition removed'
);

// 2. Adjust Indicator
content = content.replace('[1, 2, 3, 4, 5].map((s)', '[1, 2, 3, 4].map((s)');
content = content.replace('Step {step} of 5', 'Step {step} of 4');
content = content.replace(
  '{step === 3 && "Core Specifics"}\n            {step === 4 && "Listing Requirements"}\n            {step === 5 && "Contact Identity"}',
  '{step === 3 && "Media & Location"}\n            {step === 4 && "Contact Identity"}'
);

// 3. Move Location Map (Lines ~1761 to 2011) to replace Google Pin Link
const locationMapStart = content.indexOf('{/* Section 4 — Location Pin with Two-Option Tab Picker */}');
const interactiveMapModalEnd = content.indexOf('{/* Step Navigation Controls - Gated Next Button */}', locationMapStart);

const mapComponent = content.substring(locationMapStart, interactiveMapModalEnd);

// Remove map component from its old place
content = content.replace(mapComponent, '');

// Place map component exactly where Google Pin Link was
const textInputStart = content.indexOf('<div className="flex flex-col gap-1.5">\n                  <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">\n                    <span className="flex items-center gap-1">\n                      Google Pin Link / Coordinates');
const textInputEnd = content.indexOf('</div>\n              </div>\n\n              {/* Functional Attributes */}');

const textInputBlock = content.substring(textInputStart, textInputEnd);
content = content.replace(textInputBlock, mapComponent);

// 4. Remove duplicate Amenities (Step 3)
const amenitiesStart = content.indexOf('<div className="flex flex-col gap-1.5 col-span-full">\n                    <label className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">\n                      <span>Amenities</span>');
const amenitiesEnd = content.indexOf('</div>\n                </div>\n              </div>\n            </div>\n\n            <div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">');

if (amenitiesStart !== -1 && amenitiesEnd !== -1) {
  const diff = amenitiesEnd - amenitiesStart;
  if (diff < 3000) {
    content = content.replace(content.substring(amenitiesStart, amenitiesEnd), '');
  }
}

// 5. Remove Physical Condition Description (Step 4)
const physicalConditionStart = content.indexOf('{/* Section 2 — Physical Condition Description */}');
const physicalConditionEnd = content.indexOf('{/* Section 3 — Property Photos */}');

content = content.replace(content.substring(physicalConditionStart, physicalConditionEnd), '');

// 6. Consolidate Step 3 & 4 Navigation
// Now that step 4's contents (Title Docs + Photos) are basically what's left, 
// let's just merge all remaining contents of step 4 into step 3.
// The end of step 3 has a Navigation block.
const step3NavStart = content.indexOf('<div className="flex gap-4 mt-8 pt-4 border-t-2 border-brand-black/5">\n              <button \n                onClick={handlePrev} \n                className="brutalist-button-gray flex-1 group"\n              >\n                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />\n                Back\n              </button>\n              <button \n                onClick={handleNext} \n                disabled={!formData.state || !formData.lga || !formData.address || !formData.googlePinLink}\n                className="brutalist-button-black flex-[2] disabled:opacity-50 group"\n              >\n                Continue Verification\n                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />\n              </button>\n            </div>\n          </motion.div>\n        )}\n\n        {step === 4 && (\n          <motion.div \n            key="step3"\n            initial={{ opacity: 0, x: 20 }}\n            animate={{ opacity: 1, x: 0 }}\n            exit={{ opacity: 0, x: -20 }}\n            className="flex flex-col gap-6"\n          >\n            <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter flex items-center gap-2">\n              Listing <span className="text-brand-teal">Requirements</span>\n            </h2>\n\n            <div className="space-y-6">');

const step3NavEnd = content.indexOf('<div className="brutalist-card-flat p-4 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">', step3NavStart + 100);

if (step3NavStart !== -1 && step3NavEnd !== -1) {
    content = content.replace(content.substring(step3NavStart, step3NavEnd), '');
}


// 7. Make step 5 into step 4
content = content.replace('{step === 5 && (', '{step === 4 && (');
content = content.replace('key="step5"', 'key="step4"');

fs.writeFileSync('src/components/ListingForm.tsx', content);
console.log('Refactor complete!');
