// On-behalf booking helpers — Super App sales ServiceBooking flow parity:
// customer-attributed payload (customerUid), service estimate, slot mapping.

import { pricingApi } from '@/lib/booking/api-client';

export interface OnBehalfDraft {
  service: string;
  subService: string;
  areaValue: number;
  areaUnit: string;
  crop: string;
  date: string;
  slot: 'morning' | 'afternoon' | 'evening';
  location: string;
  coordinates: { lat: number; lng: number } | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  instructions: string;
}

export const SALES_SERVICES = [
  { key: 'spraying', label: 'Spraying', subs: ['Precision Spraying', 'Crop Health Monitoring (NDVI)', 'Pest Control Spray'] },
  { key: 'monitoring', label: 'Monitoring', subs: ['Crop Health Monitoring', 'Irrigation Check'] },
  { key: 'mapping', label: 'Mapping', subs: ['Basic Aerial Mapping', 'Detailed Survey Map'] },
  { key: 'surveillance', label: 'Surveillance', subs: ['Site Surveillance', 'Night Patrol'] },
  { key: 'videography', label: 'Videography', subs: ['Event Coverage', 'Real Estate Film'] },
] as const;

const SUB_DETAILS: Record<string, { key: string; value: string }> = {
  'Precision Spraying': { key: 'sprayingSubType', value: 'precision_spraying' },
  'Crop Health Monitoring (NDVI)': { key: 'sprayingSubType', value: 'crop_health_ndvi' },
  'Pest Control Spray': { key: 'sprayingSubType', value: 'pest_control' },
  'Crop Health Monitoring': { key: 'monitoringSubType', value: 'crop_health_monitoring' },
  'Irrigation Check': { key: 'monitoringSubType', value: 'irrigation_check' },
  'Basic Aerial Mapping': { key: 'mappingType', value: 'basic_mapping' },
  'Detailed Survey Map': { key: 'mappingType', value: 'detailed_survey' },
  'Site Surveillance': { key: 'surveillanceType', value: 'site_surveillance' },
  'Night Patrol': { key: 'surveillanceType', value: 'night_patrol' },
  'Event Coverage': { key: 'videographyType', value: 'event_coverage' },
  'Real Estate Film': { key: 'videographyType', value: 'real_estate' },
};

export function buildOnBehalfPayload(d: OnBehalfDraft, customerUid: string): Record<string, unknown> {
  const isNdvi = d.service === 'spraying' && d.subService === 'Crop Health Monitoring (NDVI)';
  const serviceType = isNdvi ? 'monitoring' : d.service;
  const sub = SUB_DETAILS[d.subService];
  const serviceDetails: Record<string, unknown> = {
    unit: 'per_acre',
    quantity: d.areaValue,
  };
  if (sub) serviceDetails[sub.key] = sub.value;
  if (d.instructions.trim()) serviceDetails.specialInstructions = d.instructions.trim();
  const address = [d.addressLine1, d.addressLine2, d.city, d.state, d.pincode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
  return {
    address: address || d.location || 'Selected booking location',
    detailedAddress: {
      ...(d.addressLine1.trim() ? { addressLine1: d.addressLine1.trim() } : {}),
      ...(d.addressLine2.trim() ? { addressLine2: d.addressLine2.trim() } : {}),
      ...(d.city.trim() ? { city: d.city.trim() } : {}),
      ...(d.state.trim() ? { state: d.state.trim() } : {}),
      ...(d.pincode.trim() ? { pincode: d.pincode.trim() } : {}),
    },
    areaValue: d.areaValue,
    areaUnit: d.areaUnit,
    cropType: d.crop.trim() || 'other',
    serviceType,
    serviceDetails,
    location: d.coordinates ?? { lat: 12.9716, lng: 77.5946 },
    scheduledDate: d.date,
    preferredTimeSlot: d.slot,
    customerUid,
  };
}

export async function estimateOnBehalf(d: OnBehalfDraft): Promise<number | null> {
  try {
    const res = await pricingApi.estimateService({
      serviceType: d.service,
      areaValue: d.areaValue,
      areaUnit: d.areaUnit,
    });
    const total =
      typeof res.totalAmount === 'number'
        ? res.totalAmount
        : typeof res.estimatedAmount === 'number'
          ? res.estimatedAmount
          : null;
    return total;
  } catch {
    return null;
  }
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}
