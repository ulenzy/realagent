export interface AvatarCosmetic {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  seed: string;
  options?: {
    hairStyle?: string;
    hairColor?: string;
    headwear?: string;
  };
  style: 'avataaars' | 'bottts' | 'personas';
  lore: string;
  visualEffects: string[];
}

export interface FrameCosmetic {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  className: string; // Tailwind class description for border/glow
  glowColor?: string;
}

export interface TitleCosmetic {
  id: string;
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  price: number;
  description: string;
  className: string; // color styles for text
}

export const AVATAR_COSMETICS: AvatarCosmetic[] = [
  // --- COMMON (3) ---
  {
    id: 'common_1',
    name: 'The Scout',
    rarity: 'Common',
    price: 0,
    description: 'Minimalist professional aesthetic: A vigilant starter surveyor specialized in early-stage residential markets.',
    seed: 'TheScout',
    style: 'avataaars',
    lore: 'Trained to spot property potential from miles away. Grounded, focused, and ready to list.',
    visualEffects: ['Original 2D Layout']
  },
  {
    id: 'common_2',
    name: 'Asset Scout',
    rarity: 'Common',
    price: 0,
    description: 'Minimalist professional aesthetic: Thorough land inspector analyzer mapping basic land parcels.',
    seed: 'AssetScout',
    style: 'avataaars',
    lore: 'His analytical clipboard never misses a detail in property documentation.',
    visualEffects: ['Original 2D Layout']
  },
  {
    id: 'common_3',
    name: 'District Speculator',
    rarity: 'Common',
    price: 0,
    description: 'Minimalist professional aesthetic: Junior research specialist studying local zoning codes.',
    seed: 'DistrictSpec',
    style: 'avataaars',
    lore: 'Navigates local municipality maps with patient accuracy.',
    visualEffects: ['Original 2D Layout']
  },

  // --- UNCOMMON (4) ---
  {
    id: 'uncommon_1',
    name: 'Portfolio Builder',
    rarity: 'Uncommon',
    price: 150,
    description: 'Clean professional aesthetic: Strategic investor structuring mid-term residential positions.',
    seed: 'PortfolioBuild',
    style: 'avataaars',
    lore: 'Enjoys mapping structural layout templates and tracking steady interest rates.',
    visualEffects: ['Eco-Green Soft Glow']
  },
  {
    id: 'uncommon_2',
    name: 'Deed Verifier',
    rarity: 'Uncommon',
    price: 150,
    description: 'Clean professional aesthetic: Keen auditor reviewing title deeds and registrar seals.',
    seed: 'DeedVerify',
    style: 'avataaars',
    lore: 'An authority on cadastral certificates. He reads the fine print before anyone else can blink.',
    visualEffects: ['Eco-Green Soft Glow']
  },
  {
    id: 'uncommon_3',
    name: 'Property Broker',
    rarity: 'Uncommon',
    price: 150,
    description: 'Clean professional aesthetic: Vibrant negotiator connecting land buyers to vetted sellers.',
    seed: 'PropBroker',
    style: 'avataaars',
    lore: 'A friendly agent whose handshake seals absolute trust. Known around the neighborhood.',
    visualEffects: ['Eco-Green Soft Glow']
  },
  {
    id: 'uncommon_4',
    name: 'Yield Optimizer',
    rarity: 'Uncommon',
    price: 150,
    description: 'Clean professional aesthetic: Financial analyst auditing yield ratios in high-density districts.',
    seed: 'YieldOptim',
    style: 'avataaars',
    lore: 'Formulas, metrics, and percentages. He compiles complex tables in his head.',
    visualEffects: ['Eco-Green Soft Glow']
  },

  // --- RARE (4) ---
  {
    id: 'rare_1',
    name: 'Prism Architect',
    rarity: 'Rare',
    price: 300,
    description: 'Elite digital identity aesthetic: CAD designer structuring pristine glass-walled penthouses.',
    seed: 'PrismArch',
    style: 'avataaars',
    lore: 'Treats steel, concrete, and neon as paints on an infinite modern design canvas.',
    visualEffects: ['Elite Blueprint Aura', 'Digital Identity Badge']
  },
  {
    id: 'rare_2',
    name: 'Escrow Custodian',
    rarity: 'Rare',
    price: 300,
    description: 'Elite digital identity aesthetic: Cryptographic vault manager guarding transaction ledgers.',
    seed: 'EscrowCust',
    style: 'avataaars',
    lore: 'Oversees safety keys. His cold-storage verification secures assets and prevents breaches.',
    visualEffects: ['Elite Blueprint Aura', 'Digital Identity Badge']
  },
  {
    id: 'rare_3',
    name: 'Land Syndicate',
    rarity: 'Rare',
    price: 300,
    description: 'Elite digital identity aesthetic: Elite acquisition fund manager running private real estate pools.',
    seed: 'LandSynd',
    style: 'avataaars',
    lore: 'Coordinates luxury real estate blocks, syndicating massive commercial expansion plots.',
    visualEffects: ['Elite Blueprint Aura', 'Digital Identity Badge']
  },
  {
    id: 'rare_4',
    name: 'Metropolitan Surveyor',
    rarity: 'Rare',
    price: 300,
    description: 'Elite digital identity aesthetic: Advanced surveyor employing GIS mapping and geospatial telemetry.',
    seed: 'MetroSurvey',
    style: 'avataaars',
    lore: 'Traces zoning coordinates with high-precision instruments to prevent overlap disputes.',
    visualEffects: ['Elite Blueprint Aura', 'Digital Identity Badge']
  },

  // --- EPIC (4) ---
  {
    id: 'epic_1',
    name: 'Nova Developer',
    rarity: 'Epic',
    price: 600,
    description: 'Elite digital identity with glowing components: Master developer structuring neon skylines.',
    seed: 'NovaDev',
    style: 'bottts',
    lore: 'Tethers high-rises directly to cloud networks. The neon on her coat reflects cybernetic progress.',
    visualEffects: ['Pulsing Cyber Glow', 'Energy Ring Overlay', 'Epic Banner Reveal']
  },
  {
    id: 'epic_2',
    name: 'Cyber Broker',
    rarity: 'Epic',
    price: 600,
    description: 'Elite digital identity with glowing components: Smart-contract dealer running instant listings.',
    seed: 'CyberBrok',
    style: 'bottts',
    lore: 'Bypasses slow registries with direct multi-signature contracts. Runs entirely on-grid.',
    visualEffects: ['Pulsing Cyber Glow', 'Energy Ring Overlay', 'Epic Banner Reveal']
  },
  {
    id: 'epic_3',
    name: 'Deed Cipher',
    rarity: 'Epic',
    price: 600,
    description: 'Elite digital identity with glowing components: Cryptographic auditor of high-value land certificates.',
    seed: 'DeedCiph',
    style: 'bottts',
    lore: 'Decrypts fraudulent files instantly. His custom-compiled secure hashes shield property records.',
    visualEffects: ['Pulsing Cyber Glow', 'Energy Ring Overlay', 'Epic Banner Reveal']
  },
  {
    id: 'epic_4',
    name: 'Quantum Arbitrator',
    rarity: 'Epic',
    price: 600,
    description: 'Elite digital identity with glowing components: Escrow judge settling high-net-worth real estate claims.',
    seed: 'QuantArb',
    style: 'bottts',
    lore: 'Acts on digital proof of state. Settles claims with finality and immediate token release.',
    visualEffects: ['Pulsing Cyber Glow', 'Energy Ring Overlay', 'Epic Banner Reveal']
  },

  // --- LEGENDARY (5) ---
  {
    id: 'legendary_1',
    name: 'Solomon Prime',
    rarity: 'Legendary',
    price: 1200,
    description: 'Luxury exclusivity: The legendary supreme architect of absolute smart-city masterplans.',
    seed: 'SolomonPrime',
    style: 'personas',
    lore: 'Reimagines urban landscapes. Entire metropolises are born from his gold-embossed notebooks.',
    visualEffects: ['Gold Floating Sparkles', 'Imperial Aura Field', 'Animated Shimmering Border', 'Legendary Profile Light', 'Exclusive Chat Text Flare']
  },
  {
    id: 'legendary_2',
    name: 'Escrow Sovereign',
    rarity: 'Legendary',
    price: 1200,
    description: 'Luxury exclusivity: Uncompromising secure trustee protecting high-profile escrow pools.',
    seed: 'EscrowSov',
    style: 'personas',
    lore: 'He holds the absolute master lock of the RealAgents legal ledger. Immutable, pristine, legendary.',
    visualEffects: ['Gold Floating Sparkles', 'Imperial Aura Field', 'Animated Shimmering Border', 'Legendary Profile Light', 'Exclusive Chat Text Flare']
  },
  {
    id: 'legendary_3',
    name: 'Apex Tycoon',
    rarity: 'Legendary',
    price: 1200,
    description: 'Luxury exclusivity: Sovereign of syndicates, dominating global real estate portfolios.',
    seed: 'ApexTyco',
    style: 'personas',
    lore: 'His daily transactions sway entire land markets. His word is the gold standard of real estate.',
    visualEffects: ['Gold Floating Sparkles', 'Imperial Aura Field', 'Animated Shimmering Border', 'Legendary Profile Light', 'Exclusive Chat Text Flare']
  },
  {
    id: 'legendary_4',
    name: 'Horizon Archon',
    rarity: 'Legendary',
    price: 1200,
    description: 'Luxury exclusivity: Solar and terrain surveyor mapping massive horizontal luxury zones.',
    seed: 'HorizonArch',
    style: 'personas',
    lore: 'His quantum compass scales mountain ranges and deep sea beds for high-end resorts. Unmatched vision.',
    visualEffects: ['Gold Floating Sparkles', 'Imperial Aura Field', 'Animated Shimmering Border', 'Legendary Profile Light', 'Exclusive Chat Text Flare']
  },
  {
    id: 'legendary_5',
    name: 'Chronos Sentinel',
    rarity: 'Legendary',
    price: 1200,
    description: 'Luxury exclusivity: Prime guardian guarding the legal records of ancient estates.',
    seed: 'ChronosSent',
    style: 'personas',
    lore: 'The supreme elder who witnessed the first plot listed on this platform. An immortal authority.',
    visualEffects: ['Gold Floating Sparkles', 'Imperial Aura Field', 'Animated Shimmering Border', 'Legendary Profile Light', 'Exclusive Chat Text Flare']
  }
];

export const FRAME_COSMETICS: FrameCosmetic[] = [
  {
    id: 'frame_none',
    name: 'Minimal Border (Default)',
    rarity: 'Common',
    price: 0,
    description: 'The classic clean border frame.',
    className: 'border-2 border-zinc-200 dark:border-zinc-700'
  },
  {
    id: 'frame_slate',
    name: 'Classic Slate Matte',
    rarity: 'Common',
    price: 50,
    description: 'Sleek, modern gray border styling.',
    className: 'border-4 border-zinc-600 dark:border-zinc-400 shadow-brutal-xs'
  },
  {
    id: 'frame_uncommon_green',
    name: 'Emerald Neon Rim',
    rarity: 'Uncommon',
    price: 100,
    description: 'Crisp neon-green border styling for an active asset builder.',
    className: 'border-4 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
  },
  {
    id: 'frame_rare_blue',
    name: 'Cobalt Shield Frame',
    rarity: 'Rare',
    price: 250,
    description: 'Elite blue tech professional border illustrating cybernetic security.',
    className: 'border-4 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse'
  },
  {
    id: 'frame_epic_purple',
    name: 'Cyberpunk Overload Outline',
    rarity: 'Epic',
    price: 500,
    description: 'Interactive pulsing purple shadow frame for premium brokers.',
    className: 'border-4 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.8)]'
  },
  {
    id: 'frame_legendary_gold',
    name: 'Imperial Sovereign Aura',
    rarity: 'Legendary',
    price: 1000,
    description: 'Premium animated crown border styled with dynamic golden gradients and light rays.',
    className: 'border-4 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.9)] animate-bounce-slow contrast-125'
  }
];

export const TITLE_COSMETICS: TitleCosmetic[] = [
  {
    id: 'title_none',
    name: 'No Title (Default)',
    rarity: 'Common',
    price: 0,
    description: 'No active displayed title.',
    className: 'text-zinc-500'
  } ,
  {
    id: 'title_common_scout',
    name: 'Junior Associate',
    rarity: 'Common',
    price: 0,
    description: 'Starter title honoring entry in land trading.',
    className: 'text-zinc-400 font-mono text-[9px] uppercase font-bold tracking-widest'
  },
  {
    id: 'title_uncommon_speculator',
    name: 'Local Speculator',
    rarity: 'Uncommon',
    price: 75,
    description: 'Shows you understand neighborhood land trends.',
    className: 'text-green-500 font-mono text-[9px] uppercase font-extrabold tracking-widest bg-green-500/10 px-1 border border-green-500/30'
  },
  {
    id: 'title_uncommon_scout',
    name: 'Verified Scout',
    rarity: 'Uncommon',
    price: 150,
    description: 'Shows of verified track record of inspecting land allotments.',
    className: 'text-emerald-400 font-mono text-[9px] uppercase font-extrabold tracking-widest bg-emerald-500/20 px-1 border border-emerald-500/50'
  },
  {
    id: 'title_rare_partner',
    name: 'Syndicate Partner',
    rarity: 'Rare',
    price: 300,
    description: 'Reserved for coordinators of high-net-worth real estate partnerships.',
    className: 'text-blue-400 font-mono text-[9px] uppercase font-extrabold tracking-widest bg-blue-500/20 px-1 border border-blue-500/50 shadow-sm shadow-blue-500/20'
  },
  {
    id: 'title_epic_legend',
    name: 'Escrow Legend',
    rarity: 'Epic',
    price: 600,
    description: 'Speaks of absolute mastery of high-value safe trades and transactions.',
    className: 'text-purple-400 font-mono text-[9px] uppercase font-extrabold tracking-widest bg-purple-500/20 px-1 border border-purple-500/50 animate-pulse shadow-md shadow-purple-500/30'
  },
  {
    id: 'title_legendary_overlord',
    name: 'Metropolitan Overlord',
    rarity: 'Legendary',
    price: 1200,
    description: 'The supreme visual title for masters ruling real estate empires.',
    className: 'text-amber-400 font-mono text-[9px] uppercase font-black tracking-widest bg-amber-500/30 px-1.5 py-0.5 border-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] animate-pulse'
  }
];
