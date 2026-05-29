export interface EstateIntelligenceResult {
  infrastructureScore: number;
  securityRating: number;
  powerReliability: number;
  roadAccessibility: number;
  internetCoverage: number;
  waterAvailability: number;
  appreciationTrend: number;
  rentalDemand: number;
  livabilityScore: number;
  areaTrend: 'Expanding' | 'Stable' | 'Emerging Hot Zone' | 'Elite Hub' | 'Established Luxury' | 'Rapid Development';
  expectedAppreciation: string;
  nearbyKeyAdditions: string[];
  aiSummary: string;
  roiPotential: 'Low' | 'Medium' | 'High' | 'Extreme';
  aiGenerated: boolean;
}

export async function generateEstateIntelligence(
  lat: number,
  lng: number,
  propertyType: string,
  listingType: string
): Promise<EstateIntelligenceResult> {
  try {
    const response = await fetch('/api/estate-intelligence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng, propertyType, listingType }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return {
      infrastructureScore: Number(data.infrastructureScore ?? 70),
      securityRating: Number(data.securityRating ?? 75),
      powerReliability: Number(data.powerReliability ?? 65),
      roadAccessibility: Number(data.roadAccessibility ?? 70),
      internetCoverage: Number(data.internetCoverage ?? 80),
      waterAvailability: Number(data.waterAvailability ?? 70),
      appreciationTrend: Number(data.appreciationTrend ?? 15),
      rentalDemand: Number(data.rentalDemand ?? 7),
      livabilityScore: Number(data.livabilityScore ?? 72),
      areaTrend: data.areaTrend ?? 'Stable',
      expectedAppreciation: data.expectedAppreciation ?? '12% Annually',
      nearbyKeyAdditions: Array.isArray(data.nearbyKeyAdditions) ? data.nearbyKeyAdditions : ['Paved Road Network', 'Local Shopping Complex', 'Community Security Post'],
      aiSummary: data.aiSummary ?? 'This location offers stable property appreciation potential with standard infrastructure and accessibility.',
      roiPotential: data.roiPotential ?? 'Medium',
      aiGenerated: data.aiGenerated !== false
    };
  } catch (error) {
    console.error('Error in generateEstateIntelligence, using fallback:', error);
    return {
      infrastructureScore: 70,
      securityRating: 75,
      powerReliability: 65,
      roadAccessibility: 70,
      internetCoverage: 80,
      waterAvailability: 70,
      appreciationTrend: 15,
      rentalDemand: 7,
      livabilityScore: 72,
      areaTrend: 'Stable',
      expectedAppreciation: '12% Annually',
      nearbyKeyAdditions: ['Paved Road Network', 'Local Shopping Complex', 'Community Security Post'],
      aiSummary: 'This location offers stable property appreciation potential with standard infrastructure and accessibility.',
      roiPotential: 'Medium',
      aiGenerated: false
    };
  }
}
