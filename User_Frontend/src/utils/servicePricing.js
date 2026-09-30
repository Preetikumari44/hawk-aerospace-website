/**
 * Shared service catalog + price calculator for the customer booking flow.
 *
 * Mirrors the authoritative source `Backend/src/modules/pricing/data/service-catalog.ts`,
 * which in turn mirrors `Drone_Services_Pricing_List (1).xlsx` (Price List sheet).
 * All base prices are INR and EXCLUDE 18% GST. Delivery services are not included.
 *
 * The backend is the source of truth for final pricing; this module mirrors the
 * catalog so the UI can display per-unit prices instantly as the user makes
 * selections. Keep the values in sync with the backend file.
 */

export const GST_RATE = 0.18;

export const SERVICE_CATALOG = [
  {
    serviceType: 'videography',
    key: 'event_photography',
    label: 'Event Photography',
    units: [
      {
        unit: 'min',
        label: 'min',
        basePrice: 5000,
        durationPricing: [
          { minutes: 30, price: 5000 },
          { minutes: 60, price: 10000 },
        ],
      },
    ],
    defaultUnit: 'min',
    defaultQuantity: 30,
  },
  {
    serviceType: 'videography',
    key: 'property_360_tour',
    label: '360° Property Tour',
    units: [{ unit: 'per_property', label: 'Per property', basePrice: 15000 }],
    defaultUnit: 'per_property',
    defaultQuantity: 1,
  },
  {
    serviceType: 'videography',
    key: 'real_estate_photography',
    label: 'Real Estate Photography/Videography',
    units: [
      {
        unit: 'min',
        label: 'min',
        basePrice: 4000,
        durationPricing: [
          { minutes: 30, price: 4000 },
          { minutes: 60, price: 8500 },
        ],
      },
    ],
    defaultUnit: 'min',
    defaultQuantity: 30,
  },
  
  {
    serviceType: 'monitoring',
    key: 'crop_health_monitoring',
    label: 'Crop Health Monitoring (NDVI)',
    units: [{ unit: 'per_acre', label: 'Per acre', basePrice: 450 }],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'spraying',
    key: 'precision_spraying',
    label: 'Precision Spraying',
    units: [{ unit: 'per_acre', label: 'Per acre', basePrice: 225 }],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'mapping',
    key: 'basic_aerial_mapping',
    label: 'Basic Aerial Mapping',
    units: [{ unit: 'per_acre', label: 'Per acre', basePrice: 750 }],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'mapping',
    key: 'advanced_mapping',
    label: 'Advanced Mapping (DTM/DSM + contours)',
    units: [{ unit: 'per_acre', label: 'Per acre', basePrice: 1800 }],
    defaultUnit: 'per_acre',
  },
  {
    serviceType: 'surveillance',
    key: 'mining_site_inspection',
    label: 'Mining Site Inspection',
    units: [{ unit: 'per_visit', label: 'Per visit', basePrice: 42000 }],
    defaultUnit: 'per_visit',
  },
  {
    serviceType: 'surveillance',
    key: 'traffic_management_monitoring',
    label: 'Traffic Management Monitoring',
    units: [{ unit: 'per_hour', label: 'Per hour', basePrice: 6500 }],
    defaultUnit: 'per_hour',
  },
  {
    serviceType: 'surveillance',
    key: 'road_highway_inspection',
    label: 'Road & Highway Inspection',
    units: [{ unit: 'per_km', label: 'Per km', basePrice: 2200 }],
    defaultUnit: 'per_km',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC PRICING FACTORS (must match backend service-catalog.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICE_FACTOR_SPEC = {
  weekend: { code: 'weekend', label: 'Weekend surcharge', rate: 0.15 },
  holiday: { code: 'holiday', label: 'Public holiday surcharge', rate: 0.15 },
  wedding_season: { code: 'wedding_season', label: 'Wedding/event season surcharge', rate: 0.2 },
  crop_peak_season: { code: 'crop_peak_season', label: 'Crop peak-season surcharge', rate: 0.1 },
  peak_hour: { code: 'peak_hour', label: 'Peak hours surcharge', rate: 0.15 },
};

// Times and dates "where applicable" per service (mirrors backend service-catalog.ts)
const FACTOR_BY_SERVICE = {
  videography: ['weekend', 'holiday', 'wedding_season', 'peak_hour'],
  monitoring: ['crop_peak_season'],
  spraying: ['crop_peak_season'],
  mapping: ['crop_peak_season'],
  surveillance: {
    mining_site_inspection: [],
    traffic_management_monitoring: ['peak_hour'],
    road_highway_inspection: [],
  },
};

const FACTOR_WEEKEND_DAYS = [0, 6]; // Sat, Sun
const FACTOR_WEDDING_SEASON_MONTHS = [9, 10, 11, 0, 1]; // Oct-Feb (0-indexed)
const FACTOR_CROP_PEAK_MONTHS = [3, 4, 9, 10]; // Apr, May, Oct, Nov
const FACTOR_PEAK_HOUR_RANGES = [
  { start: 6, end: 10 },
  { start: 16, end: 19 },
];
const FACTOR_HOLIDAYS = [
  { month: 0, day: 26 }, // Republic Day
  { month: 7, day: 15 }, // Independence Day
  { month: 9, day: 2 }, // Gandhi Jayanti
];

export const findServiceEntryByLabel = (label) => {
  if (!label) return undefined;
  const needle = String(label).trim().toLowerCase();
  return SERVICE_CATALOG.find((entry) => entry.label.toLowerCase() === needle);
};

export const findServiceEntry = (serviceType, key) => {
  if (!key) return undefined;
  const normalized = String(key).trim().toLowerCase().replace(/\s+/g, '_');
  return SERVICE_CATALOG.find(
    (entry) =>
      entry.serviceType === serviceType &&
      (entry.key === normalized || entry.label.toLowerCase() === String(key).trim().toLowerCase()),
  );
};

export const getServiceUnits = (serviceType, key) => {
  const entry = findServiceEntry(serviceType, key);
  return entry ? entry.units : [];
};

export const getServiceUnitOptions = (serviceType, key) => {
  const entry = findServiceEntry(serviceType, key);
  if (!entry) return [];
  return entry.units.map((u) => ({ value: u.unit, label: u.label, basePrice: u.basePrice }));
};

export const getUnitRate = (serviceType, key, unit) => {
  const entry = findServiceEntry(serviceType, key);
  if (!entry) return null;
  const option = entry.units.find((u) => u.unit === unit) || entry.units[0];
  return option ? option.basePrice : null;
};

const resolveUnitOption = (serviceType, key, unit) => {
  const entry = findServiceEntry(serviceType, key);
  if (!entry) return null;
  const option = entry.units.find((u) => u.unit === unit) || entry.units[0];
  return { ...option, defaultUnit: entry.defaultUnit, defaultQuantity: entry.defaultQuantity };
};

const roundCurrency = (value) => Math.round(value * 100) / 100;

/**
 * Price by duration for duration-based services (videography).
 * Linearly interpolates between the source package points; extrapolates past the
 * last point using the final segment slope. `minutes` is clamped to >= 1.
 */
export const priceForDuration = (points, minutes) => {
  if (!points || points.length === 0) return 0;
  const pts = [...points].sort((a, b) => a.minutes - b.minutes);
  const m = Math.max(Number(minutes) || 0, 1);

  if (m <= pts[0].minutes) return pts[0].price;

  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    if (m <= b.minutes) {
      return roundCurrency(a.price + ((b.price - a.price) * (m - a.minutes)) / (b.minutes - a.minutes));
    }
  }

  const a = pts[pts.length - 2] ?? pts[pts.length - 1];
  const b = pts[pts.length - 1];
  if (a === b) return b.price;
  return roundCurrency(b.price + ((b.price - a.price) * (m - b.minutes)) / (b.minutes - a.minutes));
};

const hourOf = (scheduledDate, preferredTime) => {
  if (preferredTime && /^\d{1,2}(:\d{2})?$/.test(String(preferredTime))) {
    return parseInt(String(preferredTime).split(':')[0], 10);
  }
  if (scheduledDate) {
    const date = new Date(scheduledDate);
    if (!Number.isNaN(date.getTime())) return date.getHours();
  }
  return NaN;
};

/**
 * Compute applicable factors for a service on a given date/time.
 * Returns [{ code, label, rate }].
 */
export const computeServiceFactors = (serviceType, key, scheduledDate, preferredTime) => {
  const factors = (() => {
    if (serviceType === 'surveillance') {
      const entry = findServiceEntry(serviceType, key);
      return entry ? FACTOR_BY_SERVICE.surveillance[key] || [] : [];
    }
    return FACTOR_BY_SERVICE[serviceType] || [];
  })();

  const date = scheduledDate ? new Date(scheduledDate) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
  const hour = hourOf(scheduledDate, preferredTime);

  const applied = [];
  const addIf = (cond, code) => {
    if (!cond || !factors.includes(code)) return;
    if (!applied.some((f) => f.code === code)) applied.push(SERVICE_FACTOR_SPEC[code]);
  };

  addIf(validDate !== null && FACTOR_WEEKEND_DAYS.includes(validDate.getDay()), 'weekend');
  addIf(
    validDate !== null &&
      FACTOR_HOLIDAYS.some((h) => h.month === validDate.getMonth() && h.day === validDate.getDate()),
    'holiday',
  );
  addIf(validDate !== null && FACTOR_WEDDING_SEASON_MONTHS.includes(validDate.getMonth()), 'wedding_season');
  addIf(validDate !== null && FACTOR_CROP_PEAK_MONTHS.includes(validDate.getMonth()), 'crop_peak_season');
  addIf(!Number.isNaN(hour) && FACTOR_PEAK_HOUR_RANGES.some((p) => hour >= p.start && hour < p.end), 'peak_hour');

  return applied;
};

/**
 * Pure estimate for a catalog service — identical result to the backend
 * `PricingService.calculateServiceEstimate`.
 * Returns null when the service/unit is unknown.
 */
export const calculateServicePrice = ({ serviceType, key, unit, quantity, scheduledDate, preferredTime }) => {
  const unitOption = resolveUnitOption(serviceType, key, unit);
  if (!unitOption) return null;

  const isDuration = Array.isArray(unitOption.durationPricing) && unitOption.durationPricing.length > 0;
  const defaultQty = unitOption.defaultQuantity ?? (isDuration ? 30 : 1);
  const qty = quantity && quantity > 0 ? quantity : defaultQty;
  const baseAmount = isDuration
    ? roundCurrency(priceForDuration(unitOption.durationPricing, qty))
    : roundCurrency((unitOption.basePrice ?? 0) * qty);
  const factors = computeServiceFactors(serviceType, key, scheduledDate, preferredTime);
  const surchargeAmount = roundCurrency(
    factors.reduce((total, factor) => total + baseAmount * factor.rate, 0),
  );
  const subtotal = roundCurrency(baseAmount + surchargeAmount);
  const taxAmount = roundCurrency(subtotal * GST_RATE);
  const estimatedAmount = roundCurrency(subtotal + taxAmount);

  const factorRateTotal = factors.reduce((total, factor) => total + factor.rate, 0);
  const unitBase = isDuration ? baseAmount : (unitOption.basePrice ?? 0);
  const unitPrice = roundCurrency(unitBase * (1 + factorRateTotal));

  return {
    serviceType,
    serviceKey: key,
    unit: unitOption.unit,
    unitLabel: isDuration ? 'min' : unitOption.label,
    quantity: qty,
    baseUnitPrice: roundCurrency(unitBase),
    unitPrice,
    factors: factors.map((f) => ({ ...f, amount: roundCurrency(baseAmount * f.rate) })),
    lineItems: [
      { label: key, amount: baseAmount },
      ...factors.map((f) => ({ label: f.label, amount: roundCurrency(baseAmount * f.rate) })),
      { label: `GST (${Math.round(GST_RATE * 100)}%)`, amount: taxAmount },
    ],
    baseAmount,
    subtotal,
    taxAmount,
    estimatedAmount,
  };
};

export const formatPrice = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};