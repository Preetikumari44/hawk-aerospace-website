/**
 * Service catalog — the authoritative set of drone services and their base prices.
 *
 * Source of truth: `Drone_Services_Pricing_List (1).xlsx` (Price List sheet).
 * All `basePrice` values are INR and EXCLUDE 18% GST.
 *
 * Only services explicitly present in the pricing source are listed here.
 * Delivery services are intentionally excluded (not part of the booking scope).
 */
export type ServiceUnit =
  | 'min'
  | 'per_30min'
  | 'per_60min'
  | 'per_property'
  | 'per_acre'
  | 'per_visit'
  | 'per_hour'
  | 'per_km';

export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
  min: 'min',
  per_30min: '30 min',
  per_60min: '60 min',
  per_property: 'Per property',
  per_acre: 'Per acre',
  per_visit: 'Per visit',
  per_hour: 'Per hour',
  per_km: 'Per km',
};

export type ServiceFactorCode = 'weekend' | 'holiday' | 'wedding_season' | 'crop_peak_season' | 'peak_hour';

export interface DurationPoint {
  minutes: number;
  price: number;
}

export interface ServiceUnitOption {
  unit: ServiceUnit;
  basePrice?: number; // INR, GST excluded — required for quantity-based units
  /** For duration-based services (videography): price by duration in minutes. */
  durationPricing?: DurationPoint[];
}

export interface ServiceCatalogEntry {
  serviceType: 'videography' | 'spraying' | 'monitoring' | 'mapping' | 'surveillance';
  key: string; // canonical snake_case key
  label: string; // display label (matches pricing source)
  units: ServiceUnitOption[];
  factors: ServiceFactorCode[];
  defaultUnit: ServiceUnit;
  /** Default quantity when none provided (minutes for duration services, otherwise 1/area). */
  defaultQuantity?: number;
}

export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    serviceType: 'videography',
    key: 'event_photography',
    label: 'Event Photography',
    units: [
      {
        unit: 'min',
        basePrice: 5000,
        durationPricing: [
          { minutes: 30, price: 5000 },
          { minutes: 60, price: 10000 },
        ],
      },
    ],
    factors: ['weekend', 'holiday', 'wedding_season', 'peak_hour'],
    defaultUnit: 'min',
    defaultQuantity: 30,
  },
  {
    serviceType: 'videography',
    key: 'real_estate_photography',
    label: 'Real Estate Photography/Videography',
    units: [
      {
        unit: 'min',
        basePrice: 4000,
        durationPricing: [
          { minutes: 30, price: 4000 },
          { minutes: 60, price: 8500 },
        ],
      },
    ],
    factors: ['weekend', 'holiday', 'wedding_season', 'peak_hour'],
    defaultUnit: 'min',
    defaultQuantity: 30,
  },
  {
    serviceType: 'videography',
    key: 'property_360_tour',
    label: '360° Property Tour',
    units: [{ unit: 'per_property', basePrice: 15000 }],
    factors: ['weekend', 'holiday', 'wedding_season', 'peak_hour'],
    defaultUnit: 'per_property',
    defaultQuantity: 1,
  },
  {
    serviceType: 'monitoring',
    key: 'crop_health_monitoring',
    label: 'Crop Health Monitoring (NDVI)',
    units: [{ unit: 'per_acre', basePrice: 450 }],
    factors: ['crop_peak_season'],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'spraying',
    key: 'precision_spraying',
    label: 'Precision Spraying',
    units: [{ unit: 'per_acre', basePrice: 225 }],
    factors: ['crop_peak_season'],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'mapping',
    key: 'basic_aerial_mapping',
    label: 'Basic Aerial Mapping',
    units: [{ unit: 'per_acre', basePrice: 750 }],
    factors: ['crop_peak_season'],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'mapping',
    key: 'advanced_mapping',
    label: 'Advanced Mapping (DTM/DSM + contours)',
    units: [{ unit: 'per_acre', basePrice: 1800 }],
    factors: ['crop_peak_season'],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'surveillance',
    key: 'mining_site_inspection',
    label: 'Mining Site Inspection',
    units: [{ unit: 'per_visit', basePrice: 42000 }],
    factors: [],
    defaultUnit: 'per_visit',
  },
  {
    serviceType: 'surveillance',
    key: 'traffic_management_monitoring',
    label: 'Traffic Management Monitoring',
    units: [{ unit: 'per_hour', basePrice: 6500 }],
    factors: ['peak_hour'],
    defaultUnit: 'per_hour',
  },
  {
    serviceType: 'surveillance',
    key: 'road_highway_inspection',
    label: 'Road & Highway Inspection',
    units: [{ unit: 'per_km', basePrice: 2200 }],
    factors: [],
    defaultUnit: 'per_km',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC PRICING FACTORS
// Base prices are adjusted dynamically where applicable (weekends, holidays,
// wedding/event seasons, crop seasons, peak/off-peak periods).
// ─────────────────────────────────────────────────────────────────────────────

export interface FactorDefinition {
  code: ServiceFactorCode;
  label: string;
  rate: number; // applied to the base subtotal
}

export const SERVICE_FACTORS: Record<ServiceFactorCode, FactorDefinition> = {
  weekend: { code: 'weekend', label: 'Weekend surcharge', rate: 0.15 },
  holiday: { code: 'holiday', label: 'Public holiday surcharge', rate: 0.15 },
  wedding_season: { code: 'wedding_season', label: 'Wedding/event season surcharge', rate: 0.20 },
  crop_peak_season: { code: 'crop_peak_season', label: 'Crop peak-season surcharge', rate: 0.10 },
  peak_hour: { code: 'peak_hour', label: 'Peak hours surcharge', rate: 0.15 },
};

/** Weekend days (0 = Sunday, 6 = Saturday). */
export const FACTOR_WEEKEND_DAYS = [0, 6];

/** Wedding/event season months (0-indexed): Oct, Nov, Dec, Jan, Feb. */
export const FACTOR_WEDDING_SEASON_MONTHS = [9, 10, 11, 0, 1];

/** Crop peak-season months (0-indexed): Apr, May, Oct, Nov. */
export const FACTOR_CROP_PEAK_MONTHS = [3, 4, 9, 10];

/** Peak-hour windows (hour, 24h): morning 6-10, evening 16-19. */
export const FACTOR_PEAK_HOUR_RANGES: Array<{ start: number; end: number }> = [
  { start: 6, end: 10 },
  { start: 16, end: 19 },
];

/** Fixed-date Indian public holidays ({month 0-indexed, day}). */
export const FACTOR_HOLIDAYS: Array<{ month: number; day: number }> = [
  { month: 0, day: 26 }, // Republic Day
  { month: 7, day: 15 }, // Independence Day
  { month: 9, day: 2 }, // Gandhi Jayanti
];

export function findServiceEntry(
  serviceType: ServiceCatalogEntry['serviceType'],
  key: string,
): ServiceCatalogEntry | undefined {
  const normalized = key.trim().toLowerCase().replace(/\s+/g, '_');
  return SERVICE_CATALOG.find(
    (entry) =>
      entry.serviceType === serviceType &&
      (entry.key === normalized || entry.label.toLowerCase() === key.trim().toLowerCase()),
  );
}

export function findServiceEntryByLabel(label: string | undefined | null): ServiceCatalogEntry | undefined {
  if (!label) return undefined;
  const needle = label.trim().toLowerCase();
  return SERVICE_CATALOG.find((entry) => entry.label.toLowerCase() === needle);
}

export function getServiceUnitOption(
  entry: ServiceCatalogEntry,
  unit?: string,
): ServiceUnitOption {
  if (unit) {
    const found = entry.units.find((opt) => opt.unit === unit);
    if (found) return found;
  }
  return (
    entry.units.find((opt) => opt.unit === entry.defaultUnit) ??
    entry.units[0] ?? { unit: 'per_hour', basePrice: 0 }
  );
}

/**
 * Price by duration for duration-based services (videography).
 * Linearly interpolates between the source package points; extrapolates past the
 * last point using the final segment slope. `minutes` is clamped to >= 1.
 */
export function priceForDuration(points: DurationPoint[], minutes: number): number {
  if (!points || points.length === 0) return 0;
  const pts = [...points].sort((a, b) => a.minutes - b.minutes);
  const m = Math.max(Number(minutes) || 0, 1);

  if (m <= pts[0].minutes) return pts[0].price;

  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (m <= b.minutes) {
      return Math.round(a.price + ((b.price - a.price) * (m - a.minutes)) / (b.minutes - a.minutes));
    }
  }

  const a = pts[pts.length - 2] ?? pts[pts.length - 1];
  const b = pts[pts.length - 1];
  if (a === b) return b.price;
  return Math.round(b.price + ((b.price - a.price) * (m - b.minutes)) / (b.minutes - a.minutes));
}