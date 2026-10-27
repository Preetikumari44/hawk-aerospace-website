"use client";

// Service-area helpers — port of User_Frontend/src/utils/geo.js.
// Spraying & videography stay within 100km of the user's location;
// mapping & surveillance are country-wide (anywhere in the user's country).

export const MAX_SERVICE_DISTANCE_KM = 100;

const toRad = (value: number): number => (Number(value) * Math.PI) / 180;

export function haversineKm(
  a: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null,
  b: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null,
): number | null {
  if (!a || !b) return null;
  const aLat = Number(a.lat ?? a.latitude);
  const aLng = Number(a.lng ?? a.longitude);
  const bLat = Number(b.lat ?? b.latitude);
  const bLng = Number(b.lng ?? b.longitude);
  if (!Number.isFinite(aLat) || !Number.isFinite(aLng) || !Number.isFinite(bLat) || !Number.isFinite(bLng)) {
    return null;
  }
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinRadiusKm(
  point: { lat: number; lng: number } | null,
  center: { lat: number; lng: number } | { latitude: number | null; longitude: number | null } | null,
  radiusKm = MAX_SERVICE_DISTANCE_KM,
): boolean {
  if (!point || !center) return true;
  const c =
    "latitude" in center
      ? { lat: center.latitude ?? NaN, lng: center.longitude ?? NaN }
      : (center as { lat: number; lng: number });
  const distance = haversineKm(point, c);
  return distance === null ? true : distance <= radiusKm;
}

export const COUNTRY_WIDE_SERVICE_TYPES = ["mapping", "surveillance"];

export function isCountryWideService(serviceType: unknown): boolean {
  return COUNTRY_WIDE_SERVICE_TYPES.includes(String(serviceType ?? "").toLowerCase());
}
