import { scoreDroneSuitability } from "./resource-assignment";
import type { DroneService, Operator, ServiceKey } from "./types";

// ---------------------------------------------------------------------------
// Centralized service catalog surfaced in the Book a Raider panel.
//
// Mirrors the documented backend SERVICE_CATALOG taxonomy (service types:
// videography, spraying, monitoring, mapping, surveillance — see the
// Booking Module Documentation, "Pricing & Sub-Services Data") so this
// frontend list stays compatible with that single source of truth instead
// of inventing a parallel one. Pricing itself is out of scope here — this
// catalog only drives the Choose Service / sub-service selection UI.
// ---------------------------------------------------------------------------
export const SERVICE_CATALOG: DroneService[] = [
  {
    key: "videography",
    label: "Videography",
    subServiceHeading: "Select Event Type",
    subServicePlaceholder: "Select Event Type",
    subServices: [
      { key: "event-photography", label: "Event Photography", detailsKey: "videographySubType", detailsValue: "event_photography" },
      { key: "360-property-tour", label: "360° Property Tour", detailsKey: "videographySubType", detailsValue: "property_360_tour" },
      { key: "real-estate-photography-videography", label: "Real Estate Photography/Videography", detailsKey: "videographySubType", detailsValue: "real_estate_photography" },
    ],
  },
  {
    key: "spraying",
    label: "Spraying",
    subServiceHeading: "Select Sub-Service",
    subServicePlaceholder: "Select Sub-Service",
    subServices: [
      { key: "fertilizer-spraying", label: "Fertilizer Spraying", detailsKey: "sprayingSubType", detailsValue: "precision_spraying" },
      { key: "pesticides-spraying", label: "Pesticides Spraying", detailsKey: "sprayingSubType", detailsValue: "precision_spraying" },
      { key: "insecticides-spraying", label: "Insecticides Spraying", detailsKey: "sprayingSubType", detailsValue: "precision_spraying" },
      { key: "crop-health-monitoring-ndvi", label: "Crop Health Monitoring (NDVI)", detailsKey: "monitoringSubType", detailsValue: "crop_health_monitoring", estimateKey: "crop_health_monitoring", estimateServiceType: "monitoring" },
      { key: "precision-spraying", label: "Precision Spraying", detailsKey: "sprayingSubType", detailsValue: "precision_spraying" },
    ],
  },
  {
    key: "mapping",
    label: "Mapping",
    subServiceHeading: "Select Sub Service",
    subServicePlaceholder: "Select Sub Service",
    subServices: [
      { key: "basic-aerial-mapping", label: "Basic Aerial Mapping", detailsKey: "mappingSubType", detailsValue: "basic_aerial_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "advanced-mapping", label: "Advanced Mapping (DTM/DSM + contours)", detailsKey: "mappingSubType", detailsValue: "advanced_mapping", estimateKey: "advanced_mapping" },
      { key: "topographic-mapping", label: "Topographic Mapping", detailsKey: "mappingSubType", detailsValue: "topographic_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "orthomosaic-mapping", label: "Orthomosaic Mapping", detailsKey: "mappingSubType", detailsValue: "orthomosaic_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "3d-modeling", label: "3D Modeling & Reconstruction", detailsKey: "mappingSubType", detailsValue: "3d_modeling", estimateKey: "advanced_mapping" },
      { key: "agricultural-mapping", label: "Agricultural Mapping", detailsKey: "mappingSubType", detailsValue: "agricultural_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "construction-site-mapping", label: "Construction Site Mapping", detailsKey: "mappingSubType", detailsValue: "construction_site_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "forest-mapping", label: "Forest & Vegetation Mapping", detailsKey: "mappingSubType", detailsValue: "forest_vegetation_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "flood-mapping", label: "Flood Plain & Water Body Mapping", detailsKey: "mappingSubType", detailsValue: "flood_plain_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "infrastructure-mapping", label: "Infrastructure Mapping", detailsKey: "mappingSubType", detailsValue: "infrastructure_mapping", estimateKey: "basic_aerial_mapping" },
      { key: "mining-mapping", label: "Mining & Quarry Surveys", detailsKey: "mappingSubType", detailsValue: "mining_quarry_surveys", estimateKey: "basic_aerial_mapping" },
    ],
  },
  {
    key: "surveillance",
    label: "Surveillance",
    subServiceHeading: "Select Sub-Service",
    subServicePlaceholder: "Select Sub-Service",
    subServices: [
      { key: "mining-site-inspection", label: "Mining Site Inspection", detailsKey: "surveillanceSubType", detailsValue: "mining_site_inspection" },
      { key: "traffic-management-monitoring", label: "Traffic Management Monitoring", detailsKey: "surveillanceSubType", detailsValue: "traffic_management_monitoring" },
      { key: "road-highway-inspection", label: "Road & Highway Inspection", detailsKey: "surveillanceSubType", detailsValue: "road_highway_inspection" },
    ],
  },
];

// ── Mirrors User_Frontend ServiceBookingScreen ──────────────────────────────
export const SPRAYING_CROPS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Millets", "Pulses"];

export const MAPPING_INFRA_TYPES = [
  "Urban/Residential Area",
  "Agricultural Land",
  "Forest",
  "Industrial Zone",
  "Construction Site",
  "Mining/Quarry Surveys",
  "Coastal/WaterFront Area",
  "River/Lake/Water Body",
  "Highway/Road Network",
];

export const AREA_UNITS = [
  { value: "acre", label: "Acre" },
  { value: "hectare", label: "Hectare" },
  { value: "sq_m", label: "Sq. Meter" },
] as const;

// ── Per-sub-service billing units, mirroring mobile servicePricing catalog ──
// Videography: duration-based (min, step 30) except 360 tour (per property).
export const VIDEO_QUANTITY_META: Record<string, { unit: string; label: string; step: number; min: number; defaultQty: number }> = {
  "event-photography": { unit: "min", label: "min", step: 30, min: 30, defaultQty: 30 },
  "real-estate-photography-videography": { unit: "min", label: "min", step: 30, min: 30, defaultQty: 30 },
  "360-property-tour": { unit: "per_property", label: "property", step: 1, min: 1, defaultQty: 1 },
};

// Surveillance: per_visit / per_hour / per_km, step 1.
export const SURVEILLANCE_QUANTITY_META: Record<string, { unit: string; label: string }> = {
  "mining-site-inspection": { unit: "per_visit", label: "Per visit" },
  "traffic-management-monitoring": { unit: "per_hour", label: "Per hour" },
  "road-highway-inspection": { unit: "per_km", label: "Per km" },
};

// Back-compat alias — some call sites read better as "droneServices".
export const droneServices = SERVICE_CATALOG;

const OPERATOR_NAMES = ["Pilot 1", "Pilot 2", "Pilot 3", "Pilot 4", "Pilot 5", "Pilot 6"];
const CALLSIGN_NUMBERS = [3, 7, 9, 12, 18, 24, 31, 42];
const VENDOR_IDS = ["vendor-a", "vendor-b", "vendor-c"];
const ALL_SERVICES: ServiceKey[] = ["videography", "spraying", "mapping", "surveillance"];
const EARTH_RADIUS_MILES = 3958.8;

/** Small stable string hash — used to make dispatch results deterministic
 * per (service, index) instead of re-rolling random on every render (§16). */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Offsets a lat/lng pair by a given distance (miles) and bearing (degrees).
 * Used only to scatter demo Raider markers around an operational center on
 * the map — not a source of real fleet positions.
 */
function offsetCoordinate(
  latitude: number,
  longitude: number,
  distanceMiles: number,
  bearingDeg: number,
) {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (latitude * Math.PI) / 180;
  const lng1 = (longitude * Math.PI) / 180;
  const d = distanceMiles / EARTH_RADIUS_MILES;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { latitude: (lat2 * 180) / Math.PI, longitude: (((lng2 * 180) / Math.PI + 540) % 360) - 180 };
}

/**
 * Generates demo operator availability for the Raider dispatch view.
 *
 * NOTE: this is mock/demo data only — it is not connected to real drone
 * operators. Swap this function out for a real availability API when one
 * exists; every caller already treats the result as async-shaped data.
 *
 * Includes a mix of "available" and "busy" units so the map reads as a
 * live operational picture, not just a results list — only "available"
 * operators are selectable for dispatch (see components/booking/dispatch-panel.tsx).
 *
 * When a `center` is supplied, each operator also gets a synthetic
 * latitude/longitude scattered around it (at its `distanceMiles`) so the
 * Raider System's real India map (see india-map.tsx) has something real to
 * plot — purely a demo placement, not an exact fleet position.
 */
export function generateOperators(
  count = 4,
  center?: { latitude: number; longitude: number } | null,
  requestedService: ServiceKey | null = null,
): Operator[] {
  // Seeded off the operational center + requested service so the same
  // search always returns the same candidate set/ranking (§16 — "do NOT use
  // random drone movement/selection"), instead of re-rolling on every scan.
  const seedKey = `${center ? `${center.latitude.toFixed(2)},${center.longitude.toFixed(2)}` : "no-center"}:${requestedService ?? "any"}`;
  const baseSeed = hashString(seedKey);

  const results: Operator[] = OPERATOR_NAMES.slice(0, count).map((name, i) => {
    const seed = baseSeed + i * 97;
    const busy = i > 0 && seed % 5 === 0; // ~1 in 5, deterministic
    const distanceMiles = 4 + (seed % 60);
    const bearing = (seed * 53) % 360;
    const position = center ? offsetCoordinate(center.latitude, center.longitude, distanceMiles, bearing) : null;
    const battery = 38 + (seed % 62);
    // A capable operator can serve the requested service (if any) plus 0-2
    // extra services — a multi-role Raider, not a single-purpose one.
    const capabilities: ServiceKey[] = requestedService
      ? Array.from(new Set([requestedService, ALL_SERVICES[seed % ALL_SERVICES.length]]))
      : [ALL_SERVICES[seed % ALL_SERVICES.length]];
    const vendorId = VENDOR_IDS[seed % VENDOR_IDS.length];

    return {
      id: `op-${name.replace(/\s+/g, "-").toLowerCase()}-${i}`,
      name,
      callsign: `RAIDER-${String(CALLSIGN_NUMBERS[seed % CALLSIGN_NUMBERS.length]).padStart(2, "0")}`,
      estimatedTakeoffMinutes: 14 + (seed % 24),
      distanceMiles,
      status: busy ? "busy" : "available",
      battery,
      capabilities,
      vendorId,
      suitabilityScore: scoreDroneSuitability({ distanceMiles, battery, capabilities, requestedService }),
      ...(position ? { latitude: position.latitude, longitude: position.longitude } : {}),
    };
  });

  // Best-suited available Raider first (nearest + capable + sufficient
  // battery) — never a random pick (§6/§7).
  return results.sort((a, b) => {
    if (a.status !== b.status) return a.status === "available" ? -1 : 1;
    return b.suitabilityScore - a.suitabilityScore;
  });
}
