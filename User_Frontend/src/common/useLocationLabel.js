import { useEffect, useState } from 'react';

import { mapsApi } from '../utils/api';
import { getCityDistrictLocation } from '../utils/locationFormat';

// Session-level cache so headers across modules don't re-geocode the same
// coordinates on every mount. Keyed by ~100m-rounded coordinate pairs.
const labelCache = new Map();
const inFlight = new Map();

const cacheKeyFor = (lat, lng) => `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;

/**
 * Resolve a "Town, City" style label (e.g. "Mumbra, Thane") for header display.
 *
 * - If `address` already holds a place name, it is formatted and returned with
 *   no network call.
 * - If `address` is empty, a raw "lat, lng" pair (stored by older app
 *   versions), or otherwise unusable — and `location` carries coordinates —
 *   the name is reverse-geocoded (cached per session) and returned once ready.
 * - Returns '' while resolving or when nothing can be resolved, so callers can
 *   show their own placeholder. Raw coordinates are NEVER returned.
 *
 * Shared by the customer and sales-aggregator headers (both render HomeHeader).
 */
export const useLocationLabel = ({ address = '', location = null } = {}) => {
  const direct = getCityDistrictLocation(address);
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const needsResolve = !direct && hasCoords;
  const [resolved, setResolved] = useState('');

  useEffect(() => {
    if (!needsResolve) return;
    const key = cacheKeyFor(lat, lng);
    if (labelCache.has(key)) {
      setResolved(labelCache.get(key));
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        let pending = inFlight.get(key);
        if (!pending) {
          pending = mapsApi.reverseGeocode(lat, lng).catch(() => null);
          inFlight.set(key, pending);
        }
        const result = await pending;
        const formatted =
          result?.data?.formattedAddress || result?.formattedAddress || '';
        const components =
          result?.data?.addressComponents || result?.addressComponents || [];
        const label = getCityDistrictLocation(formatted, components);
        labelCache.set(key, label);
        if (!cancelled && label) setResolved(label);
      } finally {
        inFlight.delete(key);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [needsResolve, lat, lng]);

  return direct || resolved;
};

export default useLocationLabel;
