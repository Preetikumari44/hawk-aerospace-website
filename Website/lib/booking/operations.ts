import type { BookingRoute } from "./drone-simulation";
import type {
  BookingDispatchDetails,
  OperationalCenter,
  OperationalSnapshot,
} from "./types";
import type { Booking } from "./types";

// ---------------------------------------------------------------------------
// Shared operational data layer for the Raider / live operations feature.
//
// There is no live fleet backend yet, so every number here is DEMO data —
// deterministically derived from the operational center's label so the same
// location always produces the same approximate snapshot (homepage, login,
// and booking stay in sync instead of showing unrelated numbers on every
// render). Swap the body of getOperationalSnapshot()/getBookingDispatchDetails()
// for real API calls later; every caller already treats these as the single
// source of truth for operational context.
//
// SECURITY: this layer intentionally only ever returns aggregated ranges and
// approximate counts, never exact fleet positions or exact headcounts, per
// the public-facing coverage requirement.
// ---------------------------------------------------------------------------

const PRIMARY_COVERAGE_MILES = 100;
const EXTENDED_COVERAGE_MILES = 200;

/** Small stable string hash — good enough to seed deterministic demo ranges. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function rangeFromSeed(seed: number, base: number, spread: number, width: number): [number, number] {
  const low = base + (seed % spread);
  return [low, low + width];
}

const PILOT_NAMES = ["Pilot 1", "Pilot 2", "Pilot 3", "Pilot 4"];
const DRONE_PREFIXES = ["HA-02", "HA-04", "HA-05", "HA-07", "HA-09", "HA-11"];

/**
 * The operational "key" used to seed deterministic demo data for a location.
 * Rounding lat/lng keeps the snapshot stable for nearby GPS reads while still
 * varying by manual location label when no coordinates are available.
 */
function operationalKey(center: OperationalCenter): string {
  if (center.latitude != null && center.longitude != null) {
    return `${center.latitude.toFixed(1)},${center.longitude.toFixed(1)}`;
  }
  return center.label.trim().toLowerCase();
}

/**
 * Returns an aggregated, approximate operational snapshot for a location.
 * Never exposes exact counts or exact positions — only ranges.
 */
export function getOperationalSnapshot(center: OperationalCenter): OperationalSnapshot {
  const seed = hashString(operationalKey(center));

  const pilotsRange = rangeFromSeed(seed, 5, 10, 4);
  const dronesRange = rangeFromSeed(seed >> 2, 7, 10, 5);
  const flightsRange = rangeFromSeed(seed >> 4, 2, 8, 3);
  const dispatchRangeMinutes = rangeFromSeed(seed >> 6, 15, 20, 15);

  const status = pilotsRange[0] === 0 ? "none" : pilotsRange[1] < 6 ? "limited" : "operational";

  return {
    center,
    pilotsRange,
    dronesRange,
    flightsRange,
    dispatchRangeMinutes,
    primaryCoverageMiles: PRIMARY_COVERAGE_MILES,
    extendedCoverageMiles: EXTENDED_COVERAGE_MILES,
    status,
    updatedLabel: "Updated recently",
  };
}

/**
 * Deterministic demo pilot/drone assignment for a single confirmed booking.
 * Booking-specific only — never used to represent the wider public fleet.
 */
export function getBookingDispatchDetails(bookingId: string): BookingDispatchDetails {
  const seed = hashString(bookingId);
  const pilotName = PILOT_NAMES[seed % PILOT_NAMES.length];
  const droneId = DRONE_PREFIXES[(seed >> 3) % DRONE_PREFIXES.length];
  const estimatedTakeoffMinutes = 18 + (seed % 24);
  return { pilotName, droneId, estimatedTakeoffMinutes };
}

// ---------------------------------------------------------------------------
// Raider System live tracking — a dedicated demo flight route for one
// confirmed booking (§5/§21/§31). The drone departs from a point a few km
// out from the customer's own project location (not a distant fixed hub),
// so demo flights stay a realistic length regardless of how far the actual
// project site is from Hawk Aerospace's operational bases, and always
// "arrives" at exactly the location the customer entered.
// ---------------------------------------------------------------------------

const BOOKING_FALLBACK_DESTINATION = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru
const APPROACH_DISTANCE_KM = [3, 4.5, 6, 7.5, 9];
const EARTH_RADIUS_KM = 6371;

function offsetKm(latitude: number, longitude: number, distanceKm: number, bearingDeg: number) {
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (latitude * Math.PI) / 180;
  const lng1 = (longitude * Math.PI) / 180;
  const d = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
  const lng2 =
    lng1 +
    Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

  return { latitude: (lat2 * 180) / Math.PI, longitude: (((lng2 * 180) / Math.PI + 540) % 360) - 180 };
}

export function getBookingRoute(booking: Booking): BookingRoute {
  const seed = hashString(booking.id);
  const dispatch = getBookingDispatchDetails(booking.id);

  const launchPoint =
    booking.destinationLatitude != null && booking.destinationLongitude != null
      ? { latitude: booking.destinationLatitude, longitude: booking.destinationLongitude }
      : BOOKING_FALLBACK_DESTINATION;

  const approachDistance = APPROACH_DISTANCE_KM[seed % APPROACH_DISTANCE_KM.length];
  const approachBearing = (seed * 37) % 360;
  const dispatchPoint = offsetKm(launchPoint.latitude, launchPoint.longitude, approachDistance, approachBearing);

  // The actual on-site mission work extends a short distance beyond the
  // launch point itself (e.g. surveying further along the project site) —
  // deterministic per booking, always a different bearing than the approach.
  const missionDistance = 0.8 + (seed % 5) * 0.4;
  const missionBearing = (approachBearing + 150 + (seed % 60)) % 360;
  const missionDestination = offsetKm(launchPoint.latitude, launchPoint.longitude, missionDistance, missionBearing);

  // Departs immediately after booking — the customer sees live tracking
  // right away, independent of the actual admin approval timeline (see
  // booking-tracking-view.tsx, which keeps this simulation separate from
  // the real BookingStatusTimeline).
  const departureMs = new Date(booking.createdAt).getTime();

  return {
    droneId: dispatch.droneId,
    callsign: `RAIDER-${String(10 + (seed % 40)).padStart(2, "0")}`,
    pilot: dispatch.pilotName,
    mission: booking.subServiceLabel,
    serviceKey: booking.service,
    dispatchPoint: { ...dispatchPoint, label: "Dispatch Point" },
    launchPoint: { ...launchPoint, label: booking.location || "Launch Point" },
    missionDestination: { ...missionDestination, label: `${booking.location || "Project Site"} · Mission Area` },
    cruiseSpeedKmh: 34 + (seed % 20),
    cruiseAltitudeM: 90 + (seed % 60),
    departureMs,
  };
}
