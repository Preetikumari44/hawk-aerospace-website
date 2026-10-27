// ---------------------------------------------------------------------------
// Dynamic resource assignment (§5/§6/§7 of the upgrade spec).
//
// Nothing here is random. Given a requested service and an operational
// center, these functions score the demo drone/pilot/technician pools on
// availability + distance + capability + battery and return the best
// currently-available match — deterministically, the same way every time
// for the same inputs. This is what replaces "pick any drone" with "pick the
// most SUITABLE drone", and what lets a drone be matched to any qualified
// pilot rather than a permanently-fixed one.
// ---------------------------------------------------------------------------

import { DEMO_PILOTS, DEMO_TECHNICIANS } from "./fleet-data";
import { haversineKm } from "./tracking";
import type {
  DroneIncident,
  FleetPilot,
  FleetTechnician,
  GeoPoint,
  Operator,
  ServiceKey,
} from "./types";

const KM_TO_MILES = 0.621371;

/** Small stable string hash — deterministic demo battery/jitter per Raider. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Composite 0-100 suitability score for a candidate Raider: closer, fuller
 * battery, and capable of the requested service all push the score up. A
 * drone that can't perform the requested service is scored 0 so it never
 * outranks a capable-but-farther one (§6).
 */
export function scoreDroneSuitability(params: {
  distanceMiles: number;
  battery: number;
  capabilities: ServiceKey[];
  requestedService: ServiceKey | null;
}): number {
  const { distanceMiles, battery, capabilities, requestedService } = params;
  if (requestedService && !capabilities.includes(requestedService)) return 0;

  // Distance: 0 mi -> 100, 200+ mi -> 0.
  const distanceScore = Math.max(0, 100 - (distanceMiles / 200) * 100);
  // Battery: linear, but drones under 20% are penalized hard — not safely
  // dispatchable for a full mission.
  const batteryScore = battery < 20 ? battery : 40 + (battery - 20) * 0.75;

  return Math.round(distanceScore * 0.55 + batteryScore * 0.45);
}

/**
 * Ranks a set of operators for a requested service — nearest + available +
 * capable + sufficient battery wins (§6/§7). Operators that can't perform the
 * requested service, or are marked busy, sort last regardless of distance.
 */
export function rankOperators(operators: Operator[]): Operator[] {
  return [...operators].sort((a, b) => {
    if (a.status !== b.status) return a.status === "available" ? -1 : 1;
    return b.suitabilityScore - a.suitabilityScore;
  });
}

/** Great-circle distance in km between two points — thin wrapper for callers
 * that only have plain {latitude, longitude} without the GeoPoint label. */
export function distanceKm(a: GeoPoint | { latitude: number; longitude: number }, b: GeoPoint | { latitude: number; longitude: number }): number {
  return haversineKm(a, b);
}

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

interface NearestPilotResult {
  pilot: FleetPilot;
  distanceKm: number;
}

/**
 * Nearest available pilot qualified for the requested service (§7) — pulled
 * from the whole independent pilot pool, never restricted to one vendor's
 * roster, per the "pilot does not need to belong to one drone" model (§5).
 */
export function findNearestAvailablePilot(
  origin: GeoPoint,
  requestedService: ServiceKey | null,
  pool: FleetPilot[] = DEMO_PILOTS,
): NearestPilotResult | null {
  const candidates = pool.filter(
    (p) => p.status === "available" && (!requestedService || p.qualifications.includes(requestedService)),
  );
  if (candidates.length === 0) return null;

  let best: NearestPilotResult | null = null;
  for (const pilot of candidates) {
    const km = haversineKm(origin, pilot.location);
    if (!best || km < best.distanceKm) best = { pilot, distanceKm: km };
  }
  return best;
}

interface NearestTechnicianResult {
  technician: FleetTechnician;
  distanceKm: number;
}

/** Nearest available technician for a breakdown (§7/§11). */
export function findNearestAvailableTechnician(
  origin: GeoPoint,
  pool: FleetTechnician[] = DEMO_TECHNICIANS,
): NearestTechnicianResult | null {
  const candidates = pool.filter((t) => t.status === "available");
  if (candidates.length === 0) return null;

  let best: NearestTechnicianResult | null = null;
  for (const technician of candidates) {
    const km = haversineKm(origin, technician.location);
    if (!best || km < best.distanceKm) best = { technician, distanceKm: km };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Demo breakdown / incident (§11/§13). RAIDER-18 (see fleet-data.ts) is
// permanently parked "under maintenance" for the demo — this derives the
// matching incident record (nearest technician already dispatched) so the
// map/resource panels have a real, deterministic breakdown scenario to show
// without needing a live fault-injection engine.
// ---------------------------------------------------------------------------
export function getDemoIncident(): DroneIncident {
  const droneLocation: GeoPoint = { latitude: 12.9141, longitude: 74.856, label: "Mangaluru Base" };
  const nearest = findNearestAvailableTechnician(droneLocation);
  const fallback = DEMO_TECHNICIANS[0];
  const technician = nearest?.technician ?? fallback;
  const km = nearest?.distanceKm ?? haversineKm(droneLocation, fallback.location);

  return {
    id: "incident-raider-18",
    droneId: "raider-18",
    droneCallsign: "RAIDER-18",
    location: droneLocation,
    faultLabel: "Motor Vibration Fault",
    technicianId: technician.id,
    technicianName: technician.name,
    technicianDistanceKm: km,
    status: "technician-dispatched",
  };
}

/** Deterministic demo battery reading for a callsign — stable across reloads. */
export function demoBatteryFor(id: string, min = 34, max = 96): number {
  const seed = hashString(id);
  return min + (seed % (max - min));
}
