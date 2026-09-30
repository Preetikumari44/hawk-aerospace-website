const COUNTRIES = ['India', 'IN', 'Bharat'];

const COORD_PAIR_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

/**
 * True when the text is a raw "lat, lng" coordinate pair (e.g. stored by
 * older permission-grant flows) rather than a human-readable place name.
 */
export const isCoordinateString = (value = '') =>
  COORD_PAIR_RE.test(String(value || '').trim());

/**
 * Extracts structured city, district, town/sublocality from Google Maps address components
 */
export const parseAddressComponents = (addressComponents = []) => {
  if (!Array.isArray(addressComponents) || addressComponents.length === 0) {
    return null;
  }

  let sublocality = '';
  let city = '';
  let district = '';
  let state = '';

  for (const comp of addressComponents) {
    const types = comp.types || [];
    if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
      if (!sublocality) sublocality = comp.long_name;
    } else if (types.includes('locality')) {
      if (!city) city = comp.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      if (!district) district = comp.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      if (!state) state = comp.long_name;
    }
  }

  // 1. Town - City (Sublocality, City) e.g., "Panchavati, Nashik"
  if (sublocality && city && sublocality.toLowerCase() !== city.toLowerCase()) {
    return `${sublocality}, ${city}`;
  }

  // 2. City - District e.g., "Chakan, Pune"
  if (city && district && city.toLowerCase() !== district.toLowerCase()) {
    return `${city}, ${district}`;
  }

  // 3. City - State / District - State e.g., "Nashik, Maharashtra"
  if (city && state && city.toLowerCase() !== state.toLowerCase()) {
    return `${city}, ${state}`;
  }
  if (district && state && district.toLowerCase() !== state.toLowerCase()) {
    return `${district}, ${state}`;
  }

  return city || district || sublocality || state || null;
};

/**
 * Formats a location address to a clean "City, District" or "Town, City" display label
 */
export const getCityDistrictLocation = (formattedAddress = '', addressComponents = []) => {
  // If structured address components exist, use them
  const parsedFromComponents = parseAddressComponents(addressComponents);
  if (parsedFromComponents) {
    return parsedFromComponents;
  }

  const text = String(formattedAddress || '').trim();
  if (!text) return '';

  // Never surface raw coordinates — callers treat '' as "needs resolution"
  // (reverse-geocode from stored lat/lng) or fall back to a placeholder.
  if (isCoordinateString(text)) {
    return '';
  }

  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return text;

  // Filter out country name, 6-digit pincode, and street numbers
  const filtered = parts.filter(
    (p) =>
      !COUNTRIES.includes(p) &&
      !/^\d{6}$/.test(p) &&
      !/^\d+.*$/.test(p) // Skip house numbers/building numbers
  );

  if (!filtered.length) return text;

  if (filtered.length >= 3) {
    // e.g. ["Panchavati", "Nashik", "Maharashtra"] -> "Panchavati, Nashik" (Town, City)
    return `${filtered[0]}, ${filtered[1]}`;
  }
  if (filtered.length === 2) {
    if (filtered[0].toLowerCase() !== filtered[1].toLowerCase()) {
      return `${filtered[0]}, ${filtered[1]}`;
    }
    return filtered[0];
  }

  return filtered[0];
};

/**
 * Computes the expected delivery date 7 days from the given order date (or now)
 */
export const getExpectedDeliveryDate = (orderDate = null, locale = 'en-US') => {
  const baseDate = orderDate ? new Date(orderDate) : new Date();
  const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const targetDate = new Date(validDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return targetDate.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
