import { Platform } from 'react-native';
import { Storage } from './storage';
import { extractReferralCode } from './referral';

const ACCESS_TOKEN_KEY = '@hawk_access_token';
const REFRESH_TOKEN_KEY = '@hawk_refresh_token';
const USER_KEY = '@hawk_current_user';
const USER_ROLE_KEY = '@user_role';
const API_BASE_URL_KEY = '@hawk_api_base_url';

const DEFAULT_WEB_BASE = 'http://43.205.190.95:3000/api';
//const DEFAULT_WEB_BASE = 'http://192.168.1.7:3000/api';
const DEFAULT_ANDROID_BASE = 'http://43.205.190.95:3000/api';
//const DEFAULT_ANDROID_BASE = 'http://192.168.1.7:3000/api';
//const DEFAULT_ANDROID_BASE = 'http://10.20.75.147:3000/api';
const DEFAULT_NATIVE_BASE = 'http://43.205.190.95:3000/api';

const sanitizeForLog = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (/token|authorization/i.test(key)) {
          return [key, '[redacted]'];
        }

        return [key, sanitizeForLog(nestedValue)];
      }),
    );
  }

  if (typeof value === 'string' && value.length > 300) {
    return `${value.slice(0, 120)}...[truncated]`;
  }

  return value;
};

const parseBodyForLog = (body) => {
  if (!body) {
    return undefined;
  }

  if (typeof body !== 'string') {
    return sanitizeForLog(body);
  }

  try {
    return sanitizeForLog(JSON.parse(body));
  } catch {
    return sanitizeForLog(body);
  }
};

const getDefaultBaseUrl = () => {
  // Production override from .env (never committed)
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  // Development defaults
  if (Platform.OS === 'web') return DEFAULT_WEB_BASE;
  if (Platform.OS === 'android') return DEFAULT_ANDROID_BASE;
  return DEFAULT_NATIVE_BASE;
};

export const getApiBaseUrl = async () => {
  const saved = await Storage.getItem(API_BASE_URL_KEY);
  return saved || getDefaultBaseUrl();
};

export const setApiBaseUrl = async (value) => {
  if (!value) {
    await Storage.removeItem(API_BASE_URL_KEY);
    return;
  }
  await Storage.setItem(API_BASE_URL_KEY, value.replace(/\/+$/, ''));
};

export const getSession = async () => {
  const [accessToken, refreshToken, userJson] = await Promise.all([
    Storage.getItem(ACCESS_TOKEN_KEY),
    Storage.getItem(REFRESH_TOKEN_KEY),
    Storage.getItem(USER_KEY),
  ]);

  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {
      await Storage.removeItem(USER_KEY);
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
};

export const setSession = async ({ accessToken, refreshToken, user }) => {
  const writes = [];

  if (accessToken) writes.push(Storage.setItem(ACCESS_TOKEN_KEY, accessToken));
  if (refreshToken) writes.push(Storage.setItem(REFRESH_TOKEN_KEY, refreshToken));
  if (user) {
    writes.push(Storage.setItem(USER_KEY, JSON.stringify(user)));
    const userRole = normalizeFrontendRole(user.primaryRole || user.role);
    if (userRole) {
      writes.push(Storage.setItem(USER_ROLE_KEY, userRole));
    }
  }

  await Promise.all(writes);
};

export const updateStoredUser = async (user) => {
  if (!user) {
    await Storage.removeItem(USER_KEY);
    return null;
  }

  await Storage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const clearSession = async () => {
  await Promise.all([
    Storage.removeItem(ACCESS_TOKEN_KEY),
    Storage.removeItem(REFRESH_TOKEN_KEY),
    Storage.removeItem(USER_KEY),
  ]);
};

export const normalizeBackendRole = (role) => {
  if (!role) return role;

  const normalized = String(role).toLowerCase();
  if (normalized === 'sales') return 'aggregator';
  if (normalized === 'fleet') return 'fleet_manager';
  return normalized;
};

export const normalizeFrontendRole = (role) => {
  if (!role) return role;

  const normalized = String(role).toLowerCase();
  if (normalized === 'aggregator') return 'sales';
  if (normalized === 'fleet_manager' || normalized === 'vendor') return 'fleet';
  return normalized;
};

const buildQuerySuffix = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const unwrapResponse = async (response) => {
  const json = await response.json().catch(() => ({}));

  if (!response.ok || json?.success === false) {
    const message =
      json?.message ||
      json?.error ||
      json?.data?.message ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = json;
    throw error;
  }

  return Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
};

const refreshAccessToken = async () => {
  const { refreshToken } = await getSession();

  if (!refreshToken) {
    return null;
  }

  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await unwrapResponse(response);
  await setSession(data);
  return data.accessToken;
};

export const apiRequest = async (path, options = {}, retry = true) => {
  const { accessToken } = await getSession();
  const baseUrl = await getApiBaseUrl();
  const method = options.method || 'GET';
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (isFormData) {
    delete headers['Content-Type'];
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  console.log('[API Request]', {
    method,
    url: `${baseUrl}${path}`,
    headers: sanitizeForLog(headers),
    body: parseBodyForLog(options.body),
  });

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const responsePayload = await response
    .clone()
    .json()
    .catch(() => null);

  console.log('[API Response]', {
    method,
    url: `${baseUrl}${path}`,
    status: response.status,
    ok: response.ok,
    body: sanitizeForLog(responsePayload),
  });

  if (response.status === 401 && retry) {
    const nextToken = await refreshAccessToken().catch(() => null);

    if (nextToken) {
      return apiRequest(path, options, false);
    }

    await clearSession();
  }

  return unwrapResponse(response);
};

export const authApi = {
  requestOtp: (phone) =>
    apiRequest('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: async ({ phone, otpCode, firebaseIdToken, role, name, referralCode }) => {
    // Refer & Earn: auto-attach a deep-link code stashed pre-auth (APK flow)
    // unless the caller passed one explicitly. Consumed on success.
    // The deep-link capture can race cold start, so re-check the OS link with
    // a short timeout before falling back to whatever was stashed earlier.
    let effectiveReferral = extractReferralCode(referralCode) ?? null;
    if (!effectiveReferral) {
      try {
        const fresh = await Promise.race([
          (async () => {
            try {
              const { Linking } = require('react-native');
              const initial = await Linking.getInitialURL();
              return extractReferralCode(initial);
            } catch {
              return null;
            }
          })(),
          new Promise((resolve) => setTimeout(() => resolve(null), 800)),
        ]);
        if (fresh) {
          await Storage.setItem('@pending_referral_code', fresh).catch(() => {});
          effectiveReferral = fresh;
        }
      } catch {
        // linking unavailable — fall through to stashed code
      }
    }
    if (!effectiveReferral) {
      try {
        const pending = await Storage.getItem('@pending_referral_code');
        effectiveReferral = extractReferralCode(pending);
      } catch {
        // storage unavailable — proceed without a code
      }
    }
    const data = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        otpCode,
        firebaseIdToken,
        ...(role ? { role: normalizeBackendRole(role) } : {}),
        name,
        ...(effectiveReferral
          ? { referralCode: String(effectiveReferral).toUpperCase().trim() }
          : {}),
      }),
    });
    if (effectiveReferral) {
      await Storage.removeItem('@pending_referral_code').catch(() => {});
    }

    await setSession(data);
    return data;
  },

  logout: async () => {
    const { refreshToken } = await getSession();

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      await clearSession();
    }
  },

  switchRole: async (role) => {
    const data = await apiRequest('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role: normalizeBackendRole(role) }),
    });

    await setSession(data);
    return data;
  },
};

export const customerApi = {
  getCurrentUser: () => apiRequest('/users/me'),
  updateCurrentUser: (payload) =>
    apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  setLanguage: (language) =>
    apiRequest('/users/language', {
      method: 'POST',
      body: JSON.stringify({ language }),
    }),
  deleteAccount: (reason) =>
    apiRequest('/customers/me', {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  getCustomerProfile: () => apiRequest('/customers/me'),
  updateCustomerProfile: (payload) =>
    apiRequest('/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getCustomerStats: () => apiRequest('/customers/me/stats'),
  getBookings: (params = {}) => apiRequest(`/bookings${buildQuerySuffix(params)}`),
  getBooking: (id) => apiRequest(`/bookings/${id}`),
  getBookingProgress: (id) => apiRequest(`/bookings/${id}/progress`),
  getBookingTracking: (id) => apiRequest(`/bookings/${id}/tracking`),
  getBookingMetadata: (id) => apiRequest(`/bookings/${id}/metadata`),
  getBookingWeather: (id) => apiRequest(`/bookings/${id}/weather`),
  getBookingRestrictions: (id) => apiRequest(`/bookings/${id}/restrictions`),
  createBooking: (payload) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelBooking: (id, reason) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  completePayment: (id, payload = {}) =>
    apiRequest(`/bookings/${id}/complete-payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rateBooking: (id, rating, feedback) =>
    apiRequest(`/bookings/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    }),
  getFarms: () => apiRequest('/customers/me/farms'),
  createFarm: (payload) =>
    apiRequest('/customers/me/farms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateFarm: (farmId, payload) =>
    apiRequest(`/customers/me/farms/${farmId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getNotificationSettings: () => apiRequest('/customers/me/notification-settings'),
  updateNotificationSettings: (payload) =>
    apiRequest('/customers/me/notification-settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getNotifications: () => apiRequest('/customers/me/notifications'),
  getComplaints: (params = {}) => apiRequest(`/complaints/my${buildQuerySuffix(params)}`),
  getComplaint: (id) => apiRequest(`/complaints/${id}`),
  createComplaint: (payload) =>
    apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrders: (params = {}) => apiRequest(`/marketplace/orders${buildQuerySuffix(params)}`),
  getOrder: (id) => apiRequest(`/marketplace/orders/${id}`),
  createOrder: (payload) =>
    apiRequest('/marketplace/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getProducts: (vendorId) =>
    apiRequest(`/marketplace/products${vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : ''}`),
  getServiceDiscovery: (params) => {
    return apiRequest(`/customers/me/services${buildQuerySuffix(params || {})}`);
  },
  estimateServicePrice: (payload) =>
    apiRequest('/customers/me/services/pricing', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  estimateBookingPrice: (payload) =>
    apiRequest('/pricing/estimate-booking', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCropRates: () => apiRequest('/pricing/crop-rates'),
  checkWeather: (payload) =>
    apiRequest('/customers/me/bookings/weather-check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkRestrictions: (payload) =>
    apiRequest('/customers/me/bookings/flying-restriction-check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const couponApi = {
  validate: (code, baseAmount) =>
    apiRequest('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, baseAmount }),
    }),
  available: () => apiRequest('/coupons/available'),
};

export const referralApi = {
  /** Get-or-create my shareable code for a target role. */
  getOrCreateCode: (targetRole) =>
    apiRequest('/referrals/code', {
      method: 'POST',
      body: JSON.stringify({ targetRole }),
    }),
  /** Share via phone numbers (Case 1: restricted roles). */
  invites: ({ code, phones, targetRole, channel }) =>
    apiRequest('/referrals/invites', {
      method: 'POST',
      body: JSON.stringify({ code, phones, targetRole, channel }),
    }),
  /** My codes + funnel stats + wallet balance. */
  my: () => apiRequest('/referrals/my'),
  /** Attach a code after signup (before first reward). */
  attach: (code) =>
    apiRequest('/referrals/attach', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  /** Public resolver for hawkaerosystem.com/r/:code links. */
  resolve: (code) => apiRequest(`/referrals/resolve/${encodeURIComponent(code)}`),
};

export const walletApi = {
  balance: () => apiRequest('/wallet'),
  history: (limit = 50) => apiRequest(`/wallet/history?limit=${limit}`),
  /** Withdraw to a verified payout method → RazorpayX auto payout. Min ₹100. */
  withdraw: ({ amount, payoutMethodId }) =>
    apiRequest('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, payoutMethodId }),
    }),
};

export const paymentApi = {
  /** Creates a Razorpay order for a booking or marketplace orderIds. */
  createRazorpayOrder: (payload) =>
    apiRequest('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** Verifies a marketplace checkout result and marks the orders paid. */
  verifyMarketplacePayment: (payload) =>
    apiRequest('/payments/razorpay/verify-marketplace', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** Best-effort removal of unpaid pending gateway orders after a failed/cancelled checkout. */
  abandonMarketplaceOrders: (orderIds) =>
    apiRequest('/payments/razorpay/abandon-marketplace', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    }),
};

export const mapsApi = {
  geocode: (address) =>
    apiRequest(`/maps/geocode?address=${encodeURIComponent(address)}`),
  autocomplete: (input, { latitude, longitude, radiusKm = 100, worldwide = false, strictBounds, country } = {}) => {
    const params = new URLSearchParams({ input });
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      params.set('latitude', String(latitude));
      params.set('longitude', String(longitude));
    }
    if (Number.isFinite(Number(radiusKm))) {
      params.set('radiusKm', String(radiusKm));
    }
    // Country mode: anywhere in that ISO 3166-1 alpha-2 country, no radius limit.
    const normalizedCountry = /^[A-Za-z]{2}$/.test(String(country || '').trim())
      ? String(country).trim().toUpperCase()
      : null;
    if (normalizedCountry) {
      params.set('country', normalizedCountry);
    }
    // Worldwide mode: no boundary filtering (relevance order preserved).
    const isWorldwide = worldwide === true || strictBounds === false || !!normalizedCountry;
    if (isWorldwide) {
      params.set('worldwide', 'true');
    } else if (strictBounds === true) {
      params.set('strictBounds', 'true');
    }
    return apiRequest(`/maps/autocomplete?${params.toString()}`);
  },
  reverseGeocode: (latitude, longitude) =>
    apiRequest(`/maps/reverse-geocode?latitude=${latitude}&longitude=${longitude}`),
  getRoute: (origin, destination) =>
    apiRequest('/maps/route', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    }),
  getDistance: (origin, destination) =>
    apiRequest('/maps/distance', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    }),
  haversineDistance: (origin, destination) =>
    apiRequest('/maps/haversine-distance', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    }),
};

export const roleApi = {
  getCurrentUser: () => apiRequest('/users/me'),
  getCurrentSession: () => apiRequest('/auth/sessions/me'),
  getPilotRoles: () => apiRequest('/pilots/roles'),
  switchPilotRole: (role) =>
    apiRequest('/pilots/switch-role', {
      method: 'POST',
      body: JSON.stringify({
        role: normalizeBackendRole(role),
        targetRole: normalizeBackendRole(role),
      }),
    }),
  switchAggregatorRole: (role) =>
    apiRequest('/aggregators/switch-role', {
      method: 'POST',
      body: JSON.stringify({
        role: normalizeBackendRole(role),
        targetRole: normalizeBackendRole(role),
      }),
    }),
};

export const roleApplicationsApi = {
  submit: (payload) =>
    apiRequest('/role-applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** No-login submit for Refer & Earn invite links (requires referralCode + firebaseIdToken). */
  submitGuest: (payload) =>
    apiRequest('/role-applications/guest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyApplications: () => apiRequest('/role-applications/my'),
  getMyApplicationForRole: (role) =>
    apiRequest(`/role-applications/my?role=${encodeURIComponent(normalizeBackendRole(role))}`),
};

export const fleetApi = {
  getDashboard: () => apiRequest('/fleet/dashboard'),
  getIncomingRequests: (params = {}) => apiRequest(`/fleet/incoming-requests${buildQuerySuffix(params)}`),
  getMissions: (params = {}) => apiRequest(`/fleet/missions${buildQuerySuffix(params)}`),
  getIncomingMissions: (params = {}) => apiRequest(`/fleet/missions/incoming${buildQuerySuffix(params)}`),
  getRejectedMissions: (params = {}) => apiRequest(`/fleet/missions/rejected${buildQuerySuffix(params)}`),
  getMission: (id) => apiRequest(`/fleet/missions/${id}`),
  autoAssignMission: (id) =>
    apiRequest(`/fleet/missions/${id}/auto-assign`, {
      method: 'POST',
    }),
  assignPilot: (id, pilotId) =>
    apiRequest(`/fleet/missions/${id}/assign-pilot`, {
      method: 'POST',
      body: JSON.stringify({ pilotId }),
    }),
  assignDrone: (id, droneId) =>
    apiRequest(`/fleet/missions/${id}/assign-drone`, {
      method: 'POST',
      body: JSON.stringify({ droneId }),
    }),
  // ⭐ Fleet manager "incoming requests" (booking claim requests)
  getFleetManagerRequests: (params = {}) => apiRequest(`/fleet-manager-requests/pending${buildQuerySuffix(params)}`),
  getFleetManagerRequestHistory: (params = {}) => apiRequest(`/fleet-manager-requests/history${buildQuerySuffix(params)}`),
  acceptFleetManagerRequest: (requestId, bookingId) =>
    apiRequest('/fleet-manager-requests/accept', {
      method: 'POST',
      body: JSON.stringify({ requestId, bookingId }),
    }),
  rejectFleetManagerRequest: (requestId, bookingId, reason) =>
    apiRequest('/fleet-manager-requests/reject', {
      method: 'POST',
      body: JSON.stringify({ requestId, bookingId, reason }),
    }),
  // ⭐ Fleet manager manual assignment (own roster/inventory only)
  getPilotRecommendations: (bookingId) =>
    apiRequest(`/fleet-manager-requests/bookings/${bookingId}/pilot-recommendations`),
  getDroneRecommendations: (bookingId) =>
    apiRequest(`/fleet-manager-requests/bookings/${bookingId}/drone-recommendations`),
  assignFleetManagerPilot: (bookingId, pilotId) =>
    apiRequest(`/fleet-manager-requests/bookings/${bookingId}/assign-pilot`, {
      method: 'POST',
      body: JSON.stringify({ pilotId }),
    }),
  assignFleetManagerDrone: (bookingId, droneId) =>
    apiRequest(`/fleet-manager-requests/bookings/${bookingId}/assign-drone`, {
      method: 'POST',
      body: JSON.stringify({ droneId }),
    }),
  verifyDroneReturn: (bookingId, code) =>
    apiRequest(`/fleet-manager-requests/bookings/${bookingId}/verify-return`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  getPilots: (params = {}) => apiRequest(`/fleet/pilots${buildQuerySuffix(params)}`),
  getPilot: (id) => apiRequest(`/fleet/pilots/${id}`),
  createPilot: (payload) =>
    apiRequest('/fleet/pilots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePilot: (id, payload) =>
    apiRequest(`/fleet/pilots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updatePilotStatus: (id, payload) =>
    apiRequest(`/fleet/pilots/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getBookingWeather: (id) => apiRequest(`/bookings/${id}/weather`),
  getBookingRestrictions: (id) => apiRequest(`/bookings/${id}/restrictions`),
  getBookingTracking: (id) => apiRequest(`/bookings/${id}/tracking`),
  cancelBooking: (id, reason) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  getDrones: (params = {}) => apiRequest(`/fleet/drones${buildQuerySuffix(params)}`),
  getAvailableDrones: (params = {}) => apiRequest(`/fleet/drones/available${buildQuerySuffix(params)}`),
  getDrone: (id) => apiRequest(`/fleet/drones/${id}`),
  createDrone: (payload) =>
    apiRequest('/fleet/drones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDrone: (id, payload) =>
    apiRequest(`/fleet/drones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateDroneStatus: (id, payload) =>
    apiRequest(`/fleet/drones/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getResources: () => apiRequest('/fleet/resources'),
  createResource: (payload) =>
    apiRequest('/fleet/resources', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAnalytics: () => apiRequest('/fleet/analytics'),
  getCommission: () => apiRequest('/fleet/commission'),
  getEarnings: () => apiRequest('/fleet/commission'),
  getPendingCommission: () => apiRequest('/fleet/commission/pending'),
  getPendingEarnings: () => apiRequest('/fleet/commission/pending'),
  getCommissionHistory: (params = {}) => apiRequest(`/fleet/commission/history${buildQuerySuffix(params)}`),
  getProfile: () => apiRequest('/fleet/profile'),
  updateProfile: (payload) =>
    apiRequest('/fleet/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateAvailability: (payload) =>
    apiRequest('/fleet/availability', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  initiatePilotCreation: (payload) =>
    apiRequest('/fleet/pilots/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completePilotCreation: (payload) =>
    apiRequest('/fleet/pilots/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMaintenanceTickets: (params = {}) =>
    apiRequest(`/fleet/maintenance-tickets${buildQuerySuffix(params)}`),
  createMaintenanceTicket: (payload) =>
    apiRequest('/fleet/maintenance-tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEarningsSummary: () => apiRequest('/payouts/earnings'),
  addPayoutMethod: (data) =>
    apiRequest('/payouts/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayoutMethods: () => apiRequest('/payouts/methods'),
  verifyPayoutMethod: (id) =>
    apiRequest(`/payouts/methods/${id}/verify`, {
      method: 'POST',
    }),
  deletePayoutMethod: (id) =>
    apiRequest(`/payouts/methods/${id}`, {
      method: 'DELETE',
    }),
  createWithdrawal: (data) =>
    apiRequest('/payouts/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWithdrawalHistory: () => apiRequest('/payouts/withdrawals'),
  getMyRefunds: () => apiRequest('/refunds/me'),
  getRefundStatus: (bookingId) => apiRequest(`/refunds/booking/${bookingId}`),
};

export const pilotApi = {
  getProfile: () => apiRequest('/pilots/profile'),
  updateProfile: (payload) =>
    apiRequest('/pilots/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateAvailability: (payload) =>
    apiRequest('/pilots/availability', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAvailabilitySchedule: () => apiRequest('/pilots/availability/schedule'),
  updateAvailabilitySchedule: (payload) =>
    apiRequest('/pilots/availability/schedule', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getMissions: (params = {}) => apiRequest(`/pilots/missions${buildQuerySuffix(params)}`),
  getIncomingRequests: (params = {}) => apiRequest(`/pilots/incoming-requests${buildQuerySuffix(params)}`),
  getRejectedMissions: (params = {}) => apiRequest(`/pilots/rejected-missions${buildQuerySuffix(params)}`),
  getMission: (id) => apiRequest(`/pilots/missions/${id}`),
  acceptMission: (id) =>
    apiRequest(`/pilots/missions/${id}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ accepted: true }),
    }),
  rejectMission: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMissionStatus: (id, payload) =>
    apiRequest(`/pilots/missions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  startNavigation: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/start-navigation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  arriveMission: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/arrive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  preFlightCheck: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/pre-flight`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  startMission: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeMission: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelMission: (id, reason) =>
    apiRequest(`/pilots/missions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmCash: (bookingId) =>
    apiRequest(`/bookings/${bookingId}/confirm-cash`, {
      method: 'POST',
    }),
  postMissionProgress: (id, payload = {}) =>
    apiRequest(`/pilots/missions/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEarnings: () => apiRequest('/pilots/earnings'),
  getPendingEarnings: () => apiRequest('/pilots/earnings/pending'),
  getEarningHistory: (params = {}) => apiRequest(`/pilots/earnings/history${buildQuerySuffix(params)}`),
  updatePayoutMethod: (payload) =>
    apiRequest('/pilots/payout-method', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getRewards: () => apiRequest('/pilots/rewards'),
  getRewardHistory: () => apiRequest('/pilots/rewards/history'),
  getMaintenanceTickets: () => apiRequest('/pilots/maintenance-tickets'),
  createMaintenanceTicket: (payload) =>
    apiRequest('/pilots/maintenance-tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLocation: (payload) =>
    apiRequest('/pilots/location', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEarningsSummary: () => apiRequest('/payouts/earnings'),
  addPayoutMethod: (data) =>
    apiRequest('/payouts/methods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayoutMethods: () => apiRequest('/payouts/methods'),
  verifyPayoutMethod: (id) =>
    apiRequest(`/payouts/methods/${id}/verify`, {
      method: 'POST',
    }),
  deletePayoutMethod: (id) =>
    apiRequest(`/payouts/methods/${id}`, {
      method: 'DELETE',
    }),
  createWithdrawal: (data) =>
    apiRequest('/payouts/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWithdrawalHistory: () => apiRequest('/payouts/withdrawals'),
  getMyRefunds: () => apiRequest('/refunds/me'),
  getRefundStatus: (bookingId) => apiRequest(`/refunds/booking/${bookingId}`),
};

export const aggregatorApi = {
  getDashboard: () => apiRequest('/aggregators/dashboard'),
  getProfile: () => apiRequest('/aggregators/profile'),
  updateProfile: (payload) =>
    apiRequest('/aggregators/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getCustomers: (params = {}) => apiRequest(`/aggregators/customers${buildQuerySuffix(params)}`),
  getCustomer: (customerId) => apiRequest(`/aggregators/customers/${customerId}`),
  addCustomer: (payload) =>
    apiRequest('/aggregators/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCustomer: (customerId, payload) =>
    apiRequest(`/aggregators/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  sendCustomerOtp: (payload) =>
    apiRequest('/aggregators/customers/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCustomerOtp: (payload) =>
    apiRequest('/aggregators/customers/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBookings: (params = {}) => apiRequest(`/aggregators/bookings${buildQuerySuffix(params)}`),
  getBooking: (bookingId) => apiRequest(`/aggregators/bookings/${bookingId}`),
  createBooking: (payload) =>
    apiRequest('/aggregators/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelBooking: (id, reason) =>
    apiRequest(`/aggregators/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getCommission: () => apiRequest('/aggregators/commission'),
  getCommissionDashboard: () => apiRequest('/aggregators/commission/dashboard'),
  getPendingCommission: () => apiRequest('/aggregators/commission/pending'),
  getCommissionHistory: (params = {}) => apiRequest(`/aggregators/commission/history${buildQuerySuffix(params)}`),
  getAnalytics: () => apiRequest('/aggregators/analytics'),
  getNotifications: () => apiRequest('/aggregators/notifications'),
  getNotificationSettings: () => apiRequest('/aggregators/notification-settings'),
  updateNotificationSettings: (payload) =>
    apiRequest('/aggregators/notification-settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getComplaints: (params = {}) => apiRequest(`/aggregators/complaints${buildQuerySuffix(params)}`),
  createComplaint: (payload) =>
    apiRequest('/aggregators/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkRestrictions: ({ latitude, longitude, serviceType }) =>
    apiRequest('/aggregators/bookings/flying-restriction-check', {
      method: 'POST',
      body: JSON.stringify({ location: { lat: latitude, lng: longitude }, serviceType }),
    }),
  checkWeather: ({ latitude, longitude, targetDate }) =>
    apiRequest('/aggregators/bookings/weather-check', {
      method: 'POST',
      body: JSON.stringify({ location: { lat: latitude, lng: longitude }, date: targetDate }),
    }),
};

export const chatApi = {
  getConversations: () => apiRequest('/chat/conversations'),
  getConversation: (id) => apiRequest(`/chat/conversations/${id}`),
  createConversation: (payload) =>
    apiRequest('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMessages: (conversationId, cursor) =>
    apiRequest(`/chat/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (conversationId, payload) =>
    apiRequest(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markAsRead: (conversationId) =>
    apiRequest(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),
  initiateCall: (conversationId) =>
    apiRequest(`/chat/conversations/${conversationId}/call`, {
      method: 'POST',
    }),
  deleteConversation: (conversationId) =>
    apiRequest(`/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    }),
};

export const technicianApi = {
  getProfile: () => apiRequest('/technicians/me'),
  updateProfile: (payload) =>
    apiRequest('/technicians/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getIncomingTickets: (params = {}) => apiRequest(`/technicians/me/incoming-tickets${buildQuerySuffix(params)}`),
  getTickets: (params = {}) => apiRequest(`/technicians/me/tickets${buildQuerySuffix(params)}`),
  getRejectedTickets: (params = {}) => apiRequest(`/technicians/me/rejected-tickets${buildQuerySuffix(params)}`),
  getTicket: (id) => apiRequest(`/technicians/me/tickets/${id}`),
  acceptTicket: (id) =>
    apiRequest(`/technicians/me/tickets/${id}/accept`, {
      method: 'PATCH',
    }),
  rejectTicket: (id, payload = {}) =>
    apiRequest(`/technicians/me/tickets/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateTicketStage: (id, payload) =>
    apiRequest(`/technicians/me/tickets/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  completeTicket: (id, payload = {}) =>
    apiRequest(`/technicians/me/tickets/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addDiagnosis: (id, payload) =>
    apiRequest(`/technicians/me/tickets/${id}/diagnosis`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addAdditionalCharges: (id, payload) =>
    apiRequest(`/technicians/me/tickets/${id}/additional-charges`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdditionalCharges: (id) => apiRequest(`/technicians/me/tickets/${id}/additional-charges`),
  requestParts: (id, payload) =>
    apiRequest(`/technicians/me/tickets/${id}/parts-request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markPartsReceived: (id, payload = {}) =>
    apiRequest(`/technicians/me/tickets/${id}/parts-received`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getEarnings: () => apiRequest('/technicians/me/earnings'),
  getPendingEarnings: () => apiRequest('/technicians/me/earnings/pending'),
  getEarningHistory: (params = {}) => apiRequest(`/technicians/me/earnings/history${buildQuerySuffix(params)}`),
  updatePayoutMethod: (payload) =>
    apiRequest('/technicians/me/payout-method', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export const filesApi = {
  upload: async (formData) => {
    return apiRequest('/files/upload', {
      method: 'POST',
      body: formData,
    });
  },
  /** No-login upload for Refer & Earn guest applications (formData must include firebaseIdToken). */
  uploadGuest: async (formData) => {
    return apiRequest('/files/guest-upload', {
      method: 'POST',
      body: formData,
    });
  },
};

export const teamApi = {
  getUnassignedPilots: (search, opts = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (opts.lat != null) params.append('lat', String(opts.lat));
    if (opts.lng != null) params.append('lng', String(opts.lng));
    params.append('radiusKm', String(opts.radiusKm ?? 150));
    const qs = params.toString();
    return apiRequest(`/team/unassigned-pilots${qs ? `?${qs}` : ''}`);
  },
  getMyManager: () => apiRequest('/team/my-manager'),
  getMyManagers: () => apiRequest('/team/my-managers'),
  getSuggestedManagers: (limit = 5, opts = {}) => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (opts.lat != null) params.append('lat', String(opts.lat));
    if (opts.lng != null) params.append('lng', String(opts.lng));
    params.append('radiusKm', String(opts.radiusKm ?? 150));
    return apiRequest(`/team/suggested-managers?${params.toString()}`);
  },
  invitePilot: (payload) =>
    apiRequest('/team/invites', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestToJoin: (payload) =>
    apiRequest('/team/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  incoming: () => apiRequest('/team/incoming'),
  outgoing: () => apiRequest('/team/outgoing'),
  accept: (id) =>
    apiRequest(`/team/${id}/accept`, {
      method: 'POST',
    }),
  reject: (id) =>
    apiRequest(`/team/${id}/reject`, {
      method: 'POST',
    }),
  cancel: (id) =>
    apiRequest(`/team/${id}/cancel`, {
      method: 'POST',
    }),
};
