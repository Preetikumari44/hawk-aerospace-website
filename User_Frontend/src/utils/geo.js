export const MAX_SERVICE_DISTANCE_KM = 100;

const toRad = (value) => (Number(value) * Math.PI) / 180;

// Haversine distance in kilometres between two { lat, lng } points.
export const haversineKm = (a, b) => {
  if (!a || !b) return null;
  const aLat = Number(a.lat ?? a.latitude);
  const aLng = Number(a.lng ?? a.longitude);
  const bLat = Number(b.lat ?? b.latitude);
  const bLng = Number(b.lng ?? b.longitude);

  if (
    !Number.isFinite(aLat) || !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) || !Number.isFinite(bLng)
  ) {
    return null;
  }

  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const isWithinRadiusKm = (point, center, radiusKm = MAX_SERVICE_DISTANCE_KM) => {
  const distance = haversineKm(point, center);
  return distance === null ? true : distance <= radiusKm;
};

// Mapping & surveillance bookings allow the event location anywhere in the
// user's country; videography & spraying stay within the 100km radius.
export const COUNTRY_WIDE_SERVICE_TYPES = ['mapping', 'surveillance'];

export const isCountryWideService = (serviceType) =>
  COUNTRY_WIDE_SERVICE_TYPES.includes(String(serviceType || '').toLowerCase());

// Extract { code, name } of the country from reverse-geocode address components.
export const extractCountryFromComponents = (addressComponents) => {
  const list = Array.isArray(addressComponents) ? addressComponents : [];
  const country = list.find((c) => Array.isArray(c?.types) && c.types.includes('country'));
  const code = String(country?.short_name || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return { code, name: country?.long_name || code };
};
