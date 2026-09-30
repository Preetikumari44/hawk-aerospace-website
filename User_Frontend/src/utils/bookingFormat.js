import { isActiveBooking } from './bookingLifecycle';

const PLACEHOLDER_LOCATIONS = [
  'current location',
  'selected location',
  'selected booking location',
  'location pending',
  'not available',
];

const isPlaceholder = (value) => {
  if (!value) return true;
  return PLACEHOLDER_LOCATIONS.includes(String(value).trim().toLowerCase());
};

const compactAddress = (raw) =>
  String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

export const isPlaceholderLocation = (value) => isPlaceholder(value);

export const resolveDetailedAddressLabel = (detailedAddress) => {
  if (!detailedAddress || typeof detailedAddress !== 'object') return null;
  const { addressLine1, addressLine2, city, state, pincode } = detailedAddress;
  const parts = [addressLine1, addressLine2, city, state, pincode]
    .map((p) => (p && String(p).trim()) || null)
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

export const resolveBookingLocationLabel = (booking) => {
  const detailedLabel = resolveDetailedAddressLabel(booking?.detailedAddress);
  if (detailedLabel) return detailedLabel;

  const farm = booking?.farmSnapshot;
  if (farm) {
    const parts = [farm.address, farm.village, farm.taluka, farm.district, farm.state]
      .map((p) => (p && String(p).trim()) || null)
      .filter(Boolean);
    if (parts.length) return parts.slice(0, 3).join(', ');
  }

  const rawAddress =
    booking?.address?.line1 ||
    booking?.address ||
    booking?.location?.address ||
    booking?.dropoffLocation?.address;

  if (rawAddress && !isPlaceholder(rawAddress)) {
    return compactAddress(rawAddress);
  }

  const loc = booking?.location || booking?.dropoffLocation;
  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
  }

  return 'Location pending';
};

export const formatBookingDate = (value, locale = 'en') => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatBookingTime = (value, locale = 'en') => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  const trimmed = String(value).trim();
  return trimmed || null;
};

export const formatBookingDateTime = (dateValue, timeValue, locale = 'en') => {
  const datePart = formatBookingDate(dateValue, locale);
  const timePart = formatBookingTime(timeValue, locale);
  return [datePart, timePart].filter(Boolean).join(', ') || null;
};

const titleCase = (value) =>
  String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const resolveBookingSubServiceTitle = (booking) => {
  const sd = booking?.serviceDetails;
  const raw =
    sd?.sprayingSubType ||
    sd?.mappingType ||
    sd?.mappingSubType ||
    sd?.seedingSubType ||
    sd?.monitoringSubType ||
    sd?.surveillanceType ||
    sd?.surveillanceSubType ||
    sd?.videographyType ||
    sd?.videographySubType ||
    sd?.eventType;
  if (!raw) return null;
  return titleCase(raw);
};

export const formatBookingServiceTitle = (booking, fallback = 'Drone Service') => {
  const raw = booking?.serviceType || booking?.serviceDetails?.sprayingSubType;
  if (!raw) return fallback;
  return titleCase(raw) || fallback;
};

/**
 * A booking is "upcoming" while it is not cancelled/completed and not active
 * today. This includes bookings waiting on (or denied) admin approval AND
 * approved bookings whose service date is not today (future dates).
 * Active = approved + service date is today (see bookingLifecycle.isActiveBooking).
 */
export const isUpcomingBooking = (booking, now = new Date()) => {
  const status = String(booking?.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'completed') return false;
  return !isActiveBooking(booking, now instanceof Date ? now : new Date());
};

export const resolveBookingApprovalLabel = (booking) => {
  const approval = String(booking?.adminApprovalStatus || '').toLowerCase();
  if (approval === 'rejected') return 'Rejected by admin';
  return 'Booking Submitted';
};

const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand',
  'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
  'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan',
  'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
  'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir', 'ladakh',
  'chandigarh', 'puducherry', 'andaman and nicobar islands',
  'dadra and nagar haveli', 'daman and diu', 'lakshadweep',
];

export const compactAddressOmitStatePincode = (address) => {
  if (!address) return '';
  const filtered = address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^\d{6}$/.test(part) && !INDIAN_STATES.includes(part.toLowerCase()))
    .join(', ');
  return filtered || address;
};

