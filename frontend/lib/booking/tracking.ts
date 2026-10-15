// ---------------------------------------------------------------------------
// Pure geo/telemetry math shared by the demo simulation engine
// (drone-simulation.ts) and the fleet map. No React, no Leaflet — safe to
// unit test and safe to reuse once real telemetry replaces the simulation.
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance between two points, in km. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Initial compass bearing (0-360, 0 = north) travelling from a -> b. */
export function bearingDeg(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Linear interpolation along the great-circle path a -> b at fraction t (0..1). */
export function lerpPosition(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  t: number,
): { latitude: number; longitude: number } {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * clamped,
    longitude: a.longitude + (b.longitude - a.longitude) * clamped,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Offsets a lat/lng point by a given distance (km) and bearing (degrees).
 * Shared by the booking route generator and the WORKING-phase service
 * jitter (§4) — small controlled movement around a fixed operation area,
 * never a random walk away from it. */
export function offsetKm(
  point: { latitude: number; longitude: number },
  distanceKm: number,
  bearingDegValue: number,
): { latitude: number; longitude: number } {
  const bearing = toRad(bearingDegValue);
  const lat1 = toRad(point.latitude);
  const lng1 = toRad(point.longitude);
  const d = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
  const lng2 =
    lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

  return { latitude: toDeg(lat2), longitude: (((toDeg(lng2) + 540) % 360) - 180) };
}

export function formatEtaMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatHeading(heading: number): string {
  return `${Math.round(heading).toString().padStart(3, "0")}°`;
}

export function timeAgoLabel(fromMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (seconds < 1) return "just now";
  if (seconds === 1) return "1 sec ago";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 min ago" : `${minutes} min ago`;
}
