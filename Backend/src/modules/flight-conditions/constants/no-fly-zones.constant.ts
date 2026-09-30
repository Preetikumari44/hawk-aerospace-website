/**
 * Seed dataset of restricted airspace zones used by the AirspaceService when no
 * external airspace provider is configured.
 *
 * Each zone is a circle: within `restrictedRadiusKm` is a no-fly core (RED); the
 * ring out to `restrictedRadiusKm + bufferKm` is a caution zone (YELLOW).
 *
 * This is intentionally a small, representative list (major Indian airports and a
 * couple of sensitive areas). It is meant to be EXTENDED, not exhaustive — custom
 * zones can be added at runtime via the Firestore `airspace_zones` collection
 * without a code change, and a real provider (DGCA Digital Sky, etc.) can be wired
 * in via the AIRSPACE_API_URL env var.
 */

export interface NoFlyZone {
  id: string;
  name: string;
  type: 'airport' | 'military' | 'restricted';
  lat: number;
  lng: number;
  /** No-fly core radius in km (RED inside this). */
  restrictedRadiusKm: number;
  /** Caution ring width beyond the core in km (YELLOW inside this ring). */
  bufferKm: number;
}

export const DEFAULT_NO_FLY_ZONES: NoFlyZone[] = [
  // --- Major airports (5 km statutory no-fly core + 4 km caution ring) ---
  { id: 'apt-del', name: 'Indira Gandhi Intl Airport (Delhi)', type: 'airport', lat: 28.5562, lng: 77.1, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-bom', name: 'Chhatrapati Shivaji Intl Airport (Mumbai)', type: 'airport', lat: 19.0896, lng: 72.8656, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-blr', name: 'Kempegowda Intl Airport (Bengaluru)', type: 'airport', lat: 13.1986, lng: 77.7066, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-maa', name: 'Chennai Intl Airport', type: 'airport', lat: 12.99, lng: 80.1693, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-hyd', name: 'Rajiv Gandhi Intl Airport (Hyderabad)', type: 'airport', lat: 17.2403, lng: 78.4294, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-ccu', name: 'Netaji Subhas Chandra Bose Intl Airport (Kolkata)', type: 'airport', lat: 22.6547, lng: 88.4467, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-amd', name: 'Sardar Vallabhbhai Patel Intl Airport (Ahmedabad)', type: 'airport', lat: 23.0772, lng: 72.6347, restrictedRadiusKm: 5, bufferKm: 4 },
  { id: 'apt-pnq', name: 'Pune Airport', type: 'airport', lat: 18.5822, lng: 73.9197, restrictedRadiusKm: 5, bufferKm: 4 },
  // --- Sensitive / strategic areas (wider buffers) ---
  { id: 'mil-rashtrapati', name: 'Rashtrapati Bhavan / Central Delhi (VVIP)', type: 'restricted', lat: 28.6143, lng: 77.1995, restrictedRadiusKm: 3, bufferKm: 3 },
];
