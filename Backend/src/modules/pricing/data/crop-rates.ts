export type DroneTier = 'basic' | 'standard' | 'premium';
export type AreaUnit = 'acre' | 'sq_m' | 'hectare' | 'sqkm' | 'sqmi';

export interface CropRate {
  cropType: string;
  baseRatePerAcre: number;
  chemicalSurcharge: number;
}

export const DEFAULT_CROP_RATES: CropRate[] = [
  { cropType: 'wheat', baseRatePerAcre: 500, chemicalSurcharge: 50 },
  { cropType: 'cotton', baseRatePerAcre: 700, chemicalSurcharge: 100 },
  { cropType: 'rice', baseRatePerAcre: 600, chemicalSurcharge: 75 },
  { cropType: 'vegetables', baseRatePerAcre: 800, chemicalSurcharge: 100 },
  { cropType: 'sugarcane', baseRatePerAcre: 650, chemicalSurcharge: 80 },
  { cropType: 'soybean', baseRatePerAcre: 550, chemicalSurcharge: 60 },
  { cropType: 'maize', baseRatePerAcre: 580, chemicalSurcharge: 70 },
  { cropType: 'pulses', baseRatePerAcre: 520, chemicalSurcharge: 55 },
  { cropType: 'groundnut', baseRatePerAcre: 600, chemicalSurcharge: 65 },
  { cropType: 'mustard', baseRatePerAcre: 500, chemicalSurcharge: 50 },
  { cropType: 'other', baseRatePerAcre: 550, chemicalSurcharge: 75 },
];

export const DRONE_TIER_RATE_PER_HOUR: Record<DroneTier, number> = {
  basic: 200,
  standard: 300,
  premium: 400,
};

export const AREA_UNITS: AreaUnit[] = ['acre', 'sq_m', 'hectare', 'sqkm', 'sqmi'];
export const DRONE_TIERS: DroneTier[] = ['basic', 'standard', 'premium'];

export const SQ_M_PER_ACRE = 4046.8564224;
export const ACRES_PER_HECTARE = 2.4710538147;
export const ACRES_PER_SQKM = 247.105;
export const ACRES_PER_SQMI = 640;
export const FREE_DISTANCE_KM = 10;
export const DISTANCE_RATE_PER_KM = 10;
export const MIN_FINAL_PRICE = 250;

// Area-based tier pricing discounts (from spec)
export const AREA_TIER_DISCOUNTS = [
  { maxAcres: 5, discount: 0 },       // 0-5 acres: no discount
  { maxAcres: 25, discount: 0.10 },   // 5-25 acres: 10% discount
  { maxAcres: 100, discount: 0.15 },  // 25-100 acres: 15% discount
  { maxAcres: Infinity, discount: 0.20 }, // 100+ acres: 20% discount
];

// Time-of-day surcharges (peak hours)
export const PEAK_HOUR_SURCHARGE = 0.15; // 15% surcharge
export const PEAK_HOURS = [
  { start: 6, end: 10 },   // Morning peak: 6 AM - 10 AM
  { start: 16, end: 19 },  // Evening peak: 4 PM - 7 PM
];

// Seasonal surcharges (harvest seasons by month)
export const HARVEST_SEASON_SURCHARGE = 0.10; // 10% surcharge
export const HARVEST_MONTHS = [3, 4, 5, 10, 11]; // Apr, May, Jun, Nov, Dec (0-indexed: Mar, Apr, May, Oct, Nov)

// GST (Tax) rate
export const GST_RATE = 0.18; // 18% GST

// Crop-specific multipliers (additional to base rate)
export const CROP_MULTIPLIERS: Record<string, number> = {
  cotton: 1.15,      // 15% higher for cotton (intensive)
  vegetables: 1.20,  // 20% higher for vegetables (delicate)
  sugarcane: 1.10,   // 10% higher for sugarcane
  rice: 1.05,        // 5% higher for rice
  // Others use 1.0 (no multiplier)
};

// Cancellation Policy (from spec)
export interface CancellationPolicy {
  hoursBeforeService: number;
  refundPercentage: number;
  penaltyPercentage: number;
}

export const CANCELLATION_POLICIES: CancellationPolicy[] = [
  { hoursBeforeService: 24, refundPercentage: 1.00, penaltyPercentage: 0 },      // > 24 hours: 100% refund
  { hoursBeforeService: 12, refundPercentage: 0.75, penaltyPercentage: 0.25 },  // 12-24 hours: 75% refund
  { hoursBeforeService: 6, refundPercentage: 0.50, penaltyPercentage: 0.50 },   // 6-12 hours: 50% refund
  { hoursBeforeService: 0, refundPercentage: 0, penaltyPercentage: 1.00 },      // < 6 hours: 0% refund
];
