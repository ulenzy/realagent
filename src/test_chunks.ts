import fs from 'fs';

let content = fs.readFileSync('src/components/ListingForm.tsx', 'utf8');
const lines = content.split('\n');

const step4Indices = [];
lines.forEach((l, i) => {
  if (l.includes('{step === 4 && (')) {
    step4Indices.push(i);
  }
});

console.log('step4Indices:', step4Indices);

// First amenities end
const amenitiesIdx = lines.findIndex(l => l.includes('Type to Add Other'));
console.log('Amenities Add Other at:', amenitiesIdx);

// Title doc
const titleDocIdx = lines.findIndex(l => l.includes('Section 1 — Title Document'));
console.log('Title doc at:', titleDocIdx);

// Nav buttons at end of old step 4
const firstNavIdx = lines.findIndex(l => l.includes('Identify Entity'));
console.log('First nav button at:', firstNavIdx);

