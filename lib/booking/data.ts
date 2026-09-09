import type { DroneService, Operator } from "./types";

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
      { key: "event-photography", label: "Event Photography" },
      { key: "360-property-tour", label: "360° Property Tour" },
      { key: "real-estate-photography-videography", label: "Real Estate Photography/Videography" },
    ],
  },
  {
    key: "spraying",
    label: "Spraying",
    subServiceHeading: "Select Sub-Service",
    subServicePlaceholder: "Select Sub-Service",
    subServices: [{ key: "agrisure", label: "AgriSure" }],
  },
  {
    key: "mapping",
    label: "Mapping",
    subServiceHeading: "Select Sub-Service",
    subServicePlaceholder: "Select Sub-Service",
    subServices: [{ key: "site-progress", label: "Site Progress" }],
  },
  {
    key: "surveillance",
    label: "Surveillance",
    subServiceHeading: "Select Sub-Service",
    subServicePlaceholder: "Select Sub-Service",
    subServices: [
      { key: "mining-site-inspection", label: "Mining Site Inspection" },
      { key: "traffic-management-monitoring", label: "Traffic Management Monitoring" },
      { key: "road-highway-inspection", label: "Road & Highway Inspection" },
    ],
  },
];

// Back-compat alias — some call sites read better as "droneServices".
export const droneServices = SERVICE_CATALOG;

const OPERATOR_NAMES = ["Pilot 1", "Pilot 2", "Pilot 3", "Pilot 4", "Pilot 5", "Pilot 6"];
const CALLSIGN_NUMBERS = [3, 7, 9, 12, 18, 24, 31, 42];
const EARTH_RADIUS_MILES = 3958.8;

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
): Operator[] {
  const shuffledNames = [...OPERATOR_NAMES].sort(() => Math.random() - 0.5);
  const shuffledCallsigns = [...CALLSIGN_NUMBERS].sort(() => Math.random() - 0.5);
  return shuffledNames.slice(0, count).map((name, i) => {
    const busy = i > 0 && Math.random() < 0.22;
    const distanceMiles = 18 + Math.floor(Math.random() * 170);
    const position = center
      ? offsetCoordinate(center.latitude, center.longitude, distanceMiles, Math.random() * 360)
      : null;
    return {
      id: `op-${name.replace(/\s+/g, "-").toLowerCase()}-${i}`,
      name,
      callsign: `RAIDER-${String(shuffledCallsigns[i % shuffledCallsigns.length]).padStart(2, "0")}`,
      estimatedTakeoffMinutes: 28 + Math.floor(Math.random() * 24),
      distanceMiles,
      status: busy ? "busy" : "available",
      ...(position ? { latitude: position.latitude, longitude: position.longitude } : {}),
    };
  });
}
