import fs from 'fs';

let content = fs.readFileSync('src/components/BuildingListingForm.tsx', 'utf8');

// replace name
content = content.replace(/ListingForm/g, 'BuildingListingForm');

// imports
content = content.replace(
  'export default function BuildingListingForm', 
  'import DocumentUpload from \'../shared/DocumentUpload\';\nimport PhotoUpload from \'../shared/PhotoUpload\';\n\nexport default function BuildingListingForm'
);

// fix submit category
content = content.replace(
  'if (onSubmit) onSubmit(formData);',
  'if (onSubmit) onSubmit({ ...formData, propertyCategory: \'Building\' });'
);

fs.writeFileSync('src/components/BuildingListingForm.tsx', content);
