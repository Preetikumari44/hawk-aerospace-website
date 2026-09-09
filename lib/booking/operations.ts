import type {
  BookingDispatchDetails,
  OperationalCenter,
  OperationalSnapshot,
} from "./types";

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
