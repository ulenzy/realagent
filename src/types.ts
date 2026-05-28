export type ROILevel = 'Low' | 'Medium' | 'High' | 'Extreme' | 'Maximised' | 'World-Class' | 'Stable' | 'Mature' | 'Peak' | 'Expanding';
export type AreaTrend = 'Expanding' | 'Stable' | 'Emerging Hot Zone' | 'Elite Hub' | 'Commercial Surge' | 'Commercial Hotspot' | 'Global Hub' | 'Ultra-Private' | 'Vertical Growth' | 'Commercial transition' | 'New Lagos Hub' | 'Emerging Residential' | 'Established Luxury' | 'Ultra-Elite' | 'Verticalization' | 'Cosmopolitan' | 'Exclusive' | 'Static Elite' | 'Luxury Residential' | 'Elite Resurgence' | 'Industrial Peak' | 'Rapid Development' | 'Established Elite';
export type PropertyType = 'Land' | 'House';

export type ListingType = 'Sale' | 'Rent';

export type AgentTier = 'Verified Professional' | 'Platform Agent';

export interface Agent {
  id: string;
  name: string;
  verified: boolean;
  avatar?: string;
  trustScore: number;
  rating?: number; // 0-6 star rating
  totalReviews?: number;
  specialization: string;
  responseTime: string;
  propertiesSold: number;
  bio?: string;
  linkedin?: string;
  onlineHours?: string;
  specializationArea?: string;
  agentTier?: AgentTier;
}

export interface EstateIntelligence {
  infrastructureScore: number;
  securityRating: number;
  powerReliability: number;
  roadAccessibility: number;
  internetCoverage: number;
  waterAvailability: number;
  appreciationTrend: number; // percentage
  rentalDemand: number; // 1-10
  livabilityScore: number;
}

export interface DevelopmentInsight {
  infrastructureGrowth: ROILevel;
  areaTrend: AreaTrend;
  nearbyKeyAdditions: string[];
  expectedAppreciation: string;
  aiSummary: string;
  score: number; // 0-100 Location Development Score
}

export interface AICard {
  title: string;
  description: string;
  impact: 'Positive' | 'Critical' | 'Stable';
}

export interface Property {
  id: string;
  title: string;
  type: string; // Changed from PropertyType to string to allow 'Duplex', 'Terrace' etc.
  listingType: ListingType;
  price: number;
  sizeSqm: number;
  bedrooms: number;
  bathrooms: number;
  estateName: string;
  location: {
    state: string;
    city: string;
    area: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
      };
    };
  image: string;
  gallery: string[];
  satelliteImage?: string;
  agent: Agent;
  roiPotential: ROILevel;
  developmentInsight: DevelopmentInsight;
  estateIntelligence: EstateIntelligence;
  aiInsights: AICard[];
  amenities: string[];
  isHotDeal?: boolean;
  isBoosted?: boolean;
  isSubscriber?: boolean;
  expiresAt: string;
  isDistressDeal?: boolean;
  furnishing?: 'Unfurnished' | 'Semi-furnished' | 'Fully-furnished';
  condition?: 'New' | 'Renovated' | 'Old';
  tags?: string[];
  createdAt: string;
  description: string;
  keyHighlights?: string[];
  appreciationScore: number;
  rentalYieldEstimate: number;
  commission?: number; // percentage
  acceptsDownPayment?: boolean;
  listingRequirements?: ListingRequirements;
  listingRequestId?: string;
  verificationFeePaid?: boolean;
}

export interface TokenBundle {
  id: string;
  tokens: number;
  priceNaira: number;
  label: string;
  popular?: boolean;
}

export interface TokenPurchase {
  bundleId: string;
  tokens: number;
  nairaAmount: number;
  purchasedAt: string;
  reference: string;
}

export type ListingFeeStatus = 'Verification Unpaid' | 'Verification Paid' | 'Monthly Unpaid' | 'Monthly Paid' | 'Inactive' | 'Unpaid' | 'Paid' | 'Waived';

export type ListingStatus = 'Pending' | 'Agent Bidding' | 'Inspection Scheduled' | 'Under Review' | 'Approved' | 'Rejected' | 'Archived' | 'Inactive';

export interface ListingRequirements {
  titleDocumentFileName: string;       // filename of uploaded title document
  titleDocumentFileType: string;       // mime type of uploaded file
  titleDocumentUrl?: string;           // download URL from Firebase Storage
  physicalConditionDescription: string; // min 100 chars — seller's own description
  photos: string[];                    // min 3 photo filenames/URLs
  locationPin: string;                 // Google Maps pin link — required
  inspectionNotes?: string;            // filled by agent post-inspection, not seller
  inspectionCompletedAt?: string;      // ISO timestamp — filled by agent
  inspectionCompletedBy?: string;      // agentId — filled by agent
}

export interface AgentBid {
  id: string;
  agentId: string;
  agentName: string;
  agentTier: AgentTier;                    // 'Verified Professional' or 'Platform Agent'
  agentTrustScore: number;
  agentVerified: boolean;                  // true only if Tier 1 and reg number confirmed
  agentRegNumber?: string;                 // present only for Tier 1 agents
  coverageNote: string;
  distanceKm?: number;
  submittedAt: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

export interface ListingRequest {
  id: string;
  title: string;
  type: string;
  price: number;
  location: string;
  status: ListingStatus;
  submittedAt: string;
  lastUpdated: string;
  expiresAt: string;
  isBoosted?: boolean;
  isSubscriber?: boolean;
  commission: number;
  acceptsDownPayment?: boolean;
  documents?: { name: string; fileType: string; fileName: string }[];
  googlePinLink?: string;
  metrics?: {
    views: number;
    saves: number;
    inquiries: number;
  };
  trustScore?: number;
  assignedAgentId?: string;
  assignedAgentTier?: AgentTier;
  listingRequirements: ListingRequirements;
  agentBids?: AgentBid[];
  listingType: 'Sale' | 'Rent';
  propertySubType: string;
  sizeSqm: number;
  bedrooms: number;
  bathrooms: number;
  estateName: string;
  amenities: string[];
  listingFeeStatus: ListingFeeStatus;
  listingFeePaidAt?: string;
  verificationFeePaid: boolean;
  verificationFeePaidAt?: string;
  monthlyFeePaidAt?: string;
  monthlyFeeExpiresAt?: string;
  listingFeeStub?: {
    amount: number;
    currency: string;
    provider: string;
    status: string;
    reference: string;
  };
  dealStatus: 'Open' | 'Inspection Paid' | 'Under Offer' | 'Closed' | 'Disputed';
  bidWindowOpensAt?: string;
  bidWindowExpiresAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  propertyId?: string;
}

export interface ChatSession {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar?: string;
  };
  propertyId: string;
  propertyName: string;
  lastMessage?: string;
  lastTimestamp?: string;
  unreadCount?: number;
}

export interface Transaction {
  id: string;
  type: 'Credit' | 'Debit';
  amount: number;
  description: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string; // The unique display name
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  avatarSeed?: string;
  avatarUrl?: string;
  avatarTier?: 'Standard' | 'Epic' | 'Legendary';
  avatarOptions?: {
    hairStyle: string;
    hairColor: string;
    headwear: string;
  };
  savedProperties: string[];
  isAgent: boolean;
  isSubscriber: boolean;
  kycStatus: 'None' | 'Pending' | 'Verified';
  kycDocuments: string[];
  profileScore: number;
  rating?: number; // 0-6 star rating
  totalReviews?: number;
  tokens: number;
  transactions?: Transaction[];
  role: 'Buyer' | 'Seller' | 'Agent' | 'Admin';
  agentTier?: AgentTier;
  agentRegNumber?: string;
  agentVerificationStatus?: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  preferredLocations?: string[];
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  linkedin?: string;
  onlineHours?: string;
  specializationArea?: string;
  isGuest?: boolean;
  avatarRolls?: {
    regular: number;
    epic: number;
    legendary: number;
    lastSubscriptionDate?: string;
  };
  onboardingCompleted?: boolean;
  welcomeToastShown?: boolean;
  tokenPurchases?: TokenPurchase[];
  verifiedPropertySeller?: boolean;
  accountStatus?: 'Active' | 'Suspended' | 'Banned';
  suspensionReason?: string;
  suspendedAt?: string;
  dealsClosedCount?: number;
  inspectionsCompletedCount?: number;
  commissionRate?: number;
}
