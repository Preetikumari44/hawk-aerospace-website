/**
 * Shared types for the Flight Conditions module (weather + airspace pre-flight checks).
 *
 * Both checks resolve to a tri-state traffic-light status used across the
 * customer, aggregator, pilot and fleet booking flows (Figma: GREEN/YELLOW/RED).
 */

export enum ConditionStatus {
  /** Clear — safe to proceed. */
  GREEN = 'GREEN',
  /** Marginal — proceed with caution, warning shown to the user. */
  YELLOW = 'YELLOW',
  /** Unsafe / no-fly — booking should be blocked or postponed. */
  RED = 'RED',
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Raw weather metrics for the requested location + time. */
export interface WeatherMetrics {
  temperatureC: number;
  windSpeedKmh: number;
  windGustKmh: number;
  precipitationMm: number;
  precipitationProbability: number;
  visibilityM: number;
  cloudCoverPct: number;
}

export interface WeatherCheckResult {
  status: ConditionStatus;
  summary: string;
  /** Human-readable reasons that drove the status (empty when GREEN). */
  reasons: string[];
  metrics: WeatherMetrics;
  /** ISO timestamp the forecast is valid for. */
  forecastFor: string;
  /** ISO timestamp the check was computed. */
  checkedAt: string;
  provider: string;
  location: LatLng;
}

/** A restricted-airspace zone the location falls within or near. */
export interface AirspaceZoneHit {
  id: string;
  name: string;
  type: string; // airport | military | restricted | custom
  /** RED when inside the restricted core, YELLOW when inside the buffer. */
  zone: ConditionStatus;
  distanceKm: number;
  restrictedRadiusKm: number;
}

export interface AirspaceCheckResult {
  status: ConditionStatus;
  summary: string;
  reasons: string[];
  /** Closest restricted zone regardless of whether it triggered a hit. */
  nearestZone: AirspaceZoneHit | null;
  /** All zones that produced a RED or YELLOW hit, worst first. */
  zones: AirspaceZoneHit[];
  checkedAt: string;
  provider: string;
  /** For a single-point check: the site. For a route check: the source/pickup. */
  location: LatLng;
  /** Present only for route (delivery) checks: the destination/drop-off. */
  destination?: LatLng | null;
  /** Present only for route checks: how many points along the route were sampled. */
  sampledPoints?: number;
}

export interface FlightConditionsResult {
  weather: WeatherCheckResult;
  airspace: AirspaceCheckResult;
  /** Combined worst-of-both status: RED if either is RED, etc. */
  overall: ConditionStatus;
  /** True only when overall is GREEN or YELLOW (RED blocks booking). */
  canProceed: boolean;
}
