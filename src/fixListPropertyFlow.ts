import fs from 'fs';

let content = fs.readFileSync('src/components/ListPropertyFlow.tsx', 'utf8');

// Replace imports
content = content.replace(
  'import ListingModal from \'./ListingModal\';\nimport ListingForm from \'./ListingForm\';',
  'import BuildingListingForm from \'./BuildingListingForm\';\nimport LandListingForm from \'./LandListingForm\';'
);
content = content.replace(
  'import { ArrowLeft, ShieldAlert, CheckCircle, CreditCard, Coins, Check, FileText } from \'lucide-react\';',
  'import { ArrowLeft, ShieldAlert, CheckCircle, CreditCard, Coins, Check, FileText, Building2, Map } from \'lucide-react\';'
);

// Replace state
content = content.replace(
  '  const [hasAgreed, setHasAgreed] = useState(false);',
  '  const [listingCategory, setListingCategory] = useState<\'Building\' | \'Land\' | null>(null);'
);

// Remove unused modal handlers
content = content.replace(
  /  const handleAgree = \(\) => \{\n    setHasAgreed\(true\);\n    setShowModal\(false\);\n  \};\n\n  const handleCloseModal = \(\) => \{\n    setShowModal\(false\);\n    if \(!hasAgreed\) \{\n      setIsListingFlow\(false\);\n    \}\n  \};\n/g,
  ''
);
// Also remove showModal state
content = content.replace('  const [showModal, setShowModal] = useState(true);', '');

// Update handleListingSubmit logic for Land
content = content.replace(
  '      const newRequest: ListingRequest = {',
  `      let finalRequest: ListingRequest;
      if (formData.propertyCategory === 'Land') {
        const generatedTitle = formData.title || \`\${formData.landDetails?.landSize || 0} \${formData.landDetails?.landSizeUnit || 'sqm'} \${formData.landDetails?.landUse || 'Land'}\`;
        setSubmittedRequestTitle(generatedTitle);
        finalRequest = {
          id: \`req-\${Date.now()}\`,
          title: generatedTitle,
          type: 'Land',
          propertyCategory: 'Land',
          price: cleanPrice,
          location: formData.location || '',
          status: 'Agent Bidding',
          submittedAt: now,
          lastUpdated: now,
          expiresAt: expires,
          commission: resolvedCommission,
          listingType: formData.listingType || 'Sale',
          propertySubType: 'Land',
          sizeSqm: formData.landDetails?.landSizeUnit === 'hectares' ? (parseFloat(formData.landDetails.landSize) * 10000) : parseFloat(formData.landDetails?.landSize || '0'),
          bedrooms: 0,
          bathrooms: 0,
          estateName: '',
          amenities: [],
          googlePinLink: formData.landDetails?.locationPin || '',
          listingFeeStatus: pendingPayment?.listingFeeStatus || 'Unpaid',
          listingFeePaidAt: pendingPayment?.monthlyFeePaidAt || '',
          verificationFeePaid: user.verifiedPropertySeller || false,
          verificationFeePaidAt: user.verificationFeePaidAt || '',
          monthlyFeePaidAt: pendingPayment?.monthlyFeePaidAt || '',
          monthlyFeeExpiresAt: pendingPayment?.monthlyFeeExpiresAt || '',
          dealStatus: 'Open',
          listingRequirements: {
            titleDocumentFileName: formData.titleDocumentFile ? formData.titleDocumentFile.name : '',
            titleDocumentFileType: formData.titleDocumentFile ? formData.titleDocumentFile.type : '',
            physicalConditionDescription: formData.landDetails?.topography || '',
            photos: formData.photos || [],
            locationPin: formData.landDetails?.locationPin || '',
          },
          landDetails: formData.landDetails,
          metrics: { views: 0, saves: 0, inquiries: 0 }
        };
      } else {
        finalRequest = {`
);

content = content.replace(
  /        id: `req-\$\{Date\.now\(\)\}`,/s,
  `        id: \`req-\${Date.now()}\`,
        propertyCategory: 'Building',`
);

content = content.replace(
  /        metrics: \{ views: 0, saves: 0, inquiries: 0 \}\n      \};\n\n      await addListingRequest\(newRequest\);/g,
  `        metrics: { views: 0, saves: 0, inquiries: 0 }\n      };\n      }\n\n      await addListingRequest(finalRequest);`
);


// Replace entire UI return starting from "// Both gates checked and paid successfully. Proceed to traditional terms modal / Listing Form"
const targetStart = "// Both gates checked and paid successfully. Proceed to traditional terms modal / Listing Form";
const uiReplacement = `  // Both gates checked and paid successfully.
  if (listingCategory === 'Building') {
    return <BuildingListingForm onSubmit={handleListingSubmit} />;
  }

  if (listingCategory === 'Land') {
    return <LandListingForm onSubmit={handleListingSubmit} />;
  }

  return (
    <div className="min-h-screen bg-brand-gray dark:bg-[#1c1c21] p-6 animate-fadeIn">
      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-sm p-6 mb-8">
        <button 
          onClick={onBack}
          className="p-2 border-2 border-brand-black dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-brutal-xs hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="text-2xl font-display font-black italic uppercase tracking-tighter">RealAgents</span>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-2 dark:text-white">WHAT ARE YOU LISTING?</h1>
        <p className="text-sm font-bold uppercase text-zinc-500 mb-8 tracking-tight">Choose a category to begin. Each listing type has its own verified submission process.</p>

        <div className="flex flex-col gap-6">
          <button 
            onClick={() => setListingCategory('Building')}
            className="flex flex-col text-left p-6 bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-md hover:translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-all"
          >
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-brand-black dark:border-zinc-700 mb-4">
              <Building2 size={24} className="text-brand-black dark:text-white" />
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2 dark:text-white">BUILDING</h2>
            <p className="text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-4">Houses, duplexes, apartments, bungalows, and commercial properties.</p>
            <div className="flex gap-2 flex-wrap">
               <span className="text-[10px] items-center font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-zinc-600 dark:text-zinc-400 border border-brand-black/20 dark:border-zinc-700">Sale · Rent · Fully-detached · Duplex · Apartment</span>
            </div>
          </button>

          <button 
            onClick={() => setListingCategory('Land')}
            className="flex flex-col text-left p-6 bg-white dark:bg-zinc-900 border-4 border-brand-black dark:border-zinc-700 shadow-brutal-md hover:translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition-all"
          >
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-brand-black dark:border-zinc-700 mb-4">
              <Map size={24} className="text-brand-black dark:text-white" />
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-2 dark:text-white">LAND</h2>
            <p className="text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-4">Plots, acres, and undeveloped land. Requires survey plan and size declaration.</p>
            <div className="flex gap-2 flex-wrap">
               <span className="text-[10px] items-center font-black uppercase tracking-widest bg-brand-teal/20 px-2 py-1 text-brand-black dark:text-brand-teal border border-brand-black/20 dark:border-zinc-700">Residential · Commercial · Mixed Use · Agricultural</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
`;

const startIndex = content.indexOf(targetStart);
if (startIndex !== -1) {
  content = content.substring(0, startIndex) + uiReplacement;
} else {
  console.log("Could not find target ui string");
}

fs.writeFileSync('src/components/ListPropertyFlow.tsx', content);
