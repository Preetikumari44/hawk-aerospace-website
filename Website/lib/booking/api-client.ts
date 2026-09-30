"use client";

// ---------------------------------------------------------------------------
// Backend API client for the Hawk customer-service booking flow.
// Base URL: NEXT_PUBLIC_API_BASE_URL (deployed backend, e.g.
// http://<EC2-IP>:3000/api). Attaches the JWT from the Firebase-backed
// session (see lib/booking/auth-context.tsx) as `Authorization: Bearer`.
// Mirrors the endpoint contract of User_Frontend/src/utils/api.js.
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

// Second backend tried ONLY when the primary is unreachable at the network
// level (connection refused / timed out) — never on HTTP errors, so a JWT
// issued by one backend is never replayed against the other.
const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_API_FALLBACK_URL ?? "";

function baseUrls(): string[] {
  const urls = [API_BASE_URL, FALLBACK_BASE_URL]
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...new Set(urls)];
}

const REQUEST_TIMEOUT_MS = 15000;

function isNetworkFailure(err: unknown): boolean {
  // fetch() rejects with TypeError on refused connections/DNS; AbortError on timeout.
  return err instanceof TypeError || (err instanceof DOMException && err.name === "AbortError");
}

const TOKEN_KEY = "hawk_auth_token_v1";
const REFRESH_KEY = "hawk_auth_refresh_v1";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(accessToken: string | null, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken);
    else window.localStorage.removeItem(TOKEN_KEY);
    if (refreshToken === null) window.localStorage.removeItem(REFRESH_KEY);
    else if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch {
    /* ignore storage errors */
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const payload = body === undefined ? undefined : JSON.stringify(body);
  let lastNetworkError: unknown = null;
  for (const baseUrl of baseUrls()) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: payload,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Backend down/unreachable — try the next base URL. HTTP statuses
      // (401/404/…) are answered, not thrown, so they never fall through.
      if (isNetworkFailure(err)) {
        lastNetworkError = err;
        continue;
      }
      throw err;
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
          : `Request failed (${res.status})`;
      throw new ApiError(res.status, message, data);
    }
    // The NestJS backend wraps every response via its global interceptor:
    // { success: true, data: <payload>, timestamp }. Unwrap once so callers
    // always see the payload. Untouched when the shape is anything else.
    if (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data) &&
      (data as { success?: unknown }).success === true &&
      "data" in data
    ) {
      return (data as { data: T }).data;
    }
    return data as T;
  }
  throw new ApiError(
    0,
    "Backend unreachable — start the API server and try again.",
    lastNetworkError,
  );
}

// --- Auth ---------------------------------------------------------------

export interface BackendAuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: { uid?: string; phone?: string; role?: string; name?: string };
  _devOtp?: boolean;
}

export const authApi = {
  requestOtp: (phone: string) =>
    apiRequest<{
      _devOtp?: boolean;
      developmentBypassEnabled?: boolean;
      delivery?: string;
    }>("/auth/request-otp", {
      method: "POST",
      body: { phone },
      auth: false,
    }),
  verifyOtp: (payload: {
    phone: string;
    otpCode?: string;
    firebaseIdToken?: string;
    role?: string;
    name?: string;
  }) =>
    apiRequest<BackendAuthResponse>("/auth/verify-otp", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  refresh: (refreshToken: string) =>
    apiRequest<BackendAuthResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),
  switchRole: (role: string) =>
    apiRequest<BackendAuthResponse>("/auth/switch-role", {
      method: "POST",
      body: { role },
    }),
  logout: (refreshToken?: string | null) =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    }),
};

// --- Pricing ------------------------------------------------------------

export interface PriceEstimateResult {
  serviceType?: string;
  serviceLabel?: string;
  baseAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  estimatedAmount?: number;
  totalAmount?: number;
  discount?: number;
  couponDiscount?: number;
  travelCharges?: number;
  additionalCharges?: number;
  lineItems?: Array<{ label: string; amount: number }>;
  factors?: Array<{ label: string; amount: number }>;
  [key: string]: unknown;
}

export const pricingApi = {
  estimateBooking: (payload: Record<string, unknown>) =>
    apiRequest<PriceEstimateResult>("/pricing/estimate-booking", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  estimateService: (payload: Record<string, unknown>) =>
    apiRequest<PriceEstimateResult>("/pricing/estimate-service", {
      method: "POST",
      body: payload,
      auth: false,
    }),
  getCropRates: () => apiRequest<unknown>("/pricing/crop-rates", { auth: false }),
};

// --- Maps ---------------------------------------------------------------

export interface AutocompleteSuggestion {
  label: string;
  latitude: number | null;
  longitude: number | null;
  placeId?: string;
}

export const mapsApi = {
  autocomplete: async (
    input: string,
    opts: { latitude?: number; longitude?: number; radiusKm?: number } = {},
  ): Promise<AutocompleteSuggestion[]> => {
    const params = new URLSearchParams({ input });
    if (opts.latitude != null) params.set("latitude", String(opts.latitude));
    if (opts.longitude != null) params.set("longitude", String(opts.longitude));
    if (opts.radiusKm != null) params.set("radiusKm", String(opts.radiusKm));
    // Backend maps endpoints require a JWT (JwtAuthGuard) — guests go
    // straight to the keyless fallback instead of producing 401 noise.
    if (!getAuthToken()) {
      throw new Error("auth-required");
    }
    const data = await apiRequest<unknown>(`/maps/autocomplete?${params.toString()}`, {
      auth: true,
    });
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { predictions?: unknown })?.predictions)
        ? ((data as { predictions: unknown[] }).predictions as unknown[])
        : [];
    return list.slice(0, 4).map((item) => {
      const o = item as Record<string, unknown>;
      const label =
        (o.label as string) ??
        (o.description as string) ??
        (o.formatted_address as string) ??
        "";
      return {
        label: String(label),
        latitude: typeof o.latitude === "number" ? o.latitude : typeof o.lat === "number" ? o.lat : null,
        longitude:
          typeof o.longitude === "number" ? o.longitude : typeof o.lng === "number" ? o.lng : null,
        placeId: typeof o.place_id === "string" ? o.place_id : undefined,
      };
    });
  },
};

// --- Customer bookings ---------------------------------------------------

export interface CreateBookingPayload {
  address: string;
  detailedAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  areaValue: number;
  areaUnit: string;
  cropType: string;
  serviceType: string;
  serviceDetails?: Record<string, unknown>;
  location: { lat: number; lng: number };
  scheduledDate: string;
  preferredTimeSlot?: "morning" | "afternoon" | "evening";
  couponCode?: string;
}

export interface BackendBooking {
  id: string;
  bookingNumber?: string;
  status?: string;
  adminApprovalStatus?: string;
  stage?: number;
  serviceType?: string;
  address?: string;
  scheduledDate?: string;
  preferredTimeSlot?: string;
  priceBreakdown?: PriceEstimateResult | null;
  assignedPilot?: string | null;
  assignedDrone?: string | null;
  weather?: unknown;
  flyingRestriction?: unknown;
  [key: string]: unknown;
}

export const customerApi = {
  createBooking: (payload: CreateBookingPayload) =>
    apiRequest<{ booking?: BackendBooking } & BackendBooking>("/bookings", {
      method: "POST",
      body: payload,
    }),
  listBookings: () => apiRequest<BackendBooking[] | { bookings: BackendBooking[] }>("/bookings"),
  getBooking: (id: string) => apiRequest<BackendBooking>(`/bookings/${id}`),
  getPriceBreakdown: (id: string) =>
    apiRequest<PriceEstimateResult>(`/bookings/${id}/price-breakdown`),
  getWeather: (id: string) => apiRequest<unknown>(`/bookings/${id}/weather`),
  getRestrictions: (id: string) => apiRequest<unknown>(`/bookings/${id}/restrictions`),
  getMetadata: (id: string) => apiRequest<unknown>(`/bookings/${id}/metadata`),
  getTracking: (id: string) => apiRequest<unknown>(`/bookings/${id}/tracking`),
  completePayment: (
    id: string,
    payload: {
      method: "cash" | "gateway";
      couponCode?: string;
      billingAddress?: Record<string, unknown>;
      payment?: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string };
    },
  ) => apiRequest<unknown>(`/bookings/${id}/complete-payment`, { method: "POST", body: payload }),
  checkWeather: (payload: { latitude: number; longitude: number; targetDate?: string }) =>
    apiRequest<unknown>("/customers/me/bookings/weather-check", { method: "POST", body: payload }),
  checkRestrictions: (payload: {
    latitude: number;
    longitude: number;
    serviceType?: string;
  }) =>
    apiRequest<unknown>("/customers/me/bookings/flying-restriction-check", {
      method: "POST",
      body: payload,
    }),
  estimateServicePrice: (payload: Record<string, unknown>) =>
    apiRequest<PriceEstimateResult>("/customers/me/services/pricing", {
      method: "POST",
      body: payload,
    }),
};

// --- Nearby pilots (new backend endpoint; falls back to services discovery) ---

export interface NearbyPilot {
  pilotUid?: string;
  id?: string;
  name: string;
  distanceKm?: number;
  distanceMiles?: number;
  rating?: number;
  qualified?: boolean;
  latitude?: number;
  longitude?: number;
}

export const pilotsApi = {
  nearbyPilots: async (params: {
    latitude: number;
    longitude: number;
    serviceType?: string;
    radiusKm?: number;
    limit?: number;
  }): Promise<NearbyPilot[]> => {
    const query = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      ...(params.serviceType ? { serviceType: params.serviceType } : {}),
      ...(params.radiusKm != null ? { radiusKm: String(params.radiusKm) } : {}),
      limit: String(params.limit ?? 3),
    });
    // Customer-guarded endpoint — guests use the local preview instead of
    // producing 401 noise; logged-in users get real nearby pilots.
    if (!getAuthToken()) {
      throw new Error("auth-required");
    }
    try {
      const data = await apiRequest<NearbyPilot[] | { pilots: NearbyPilot[] }>(
        `/customers/me/nearby-pilots?${query.toString()}`,
      );
      const list = Array.isArray(data) ? data : (data.pilots ?? []);
      return list.slice(0, params.limit ?? 3);
    } catch (err) {
      // Endpoint may not be deployed yet — let callers fall back to mock data.
      throw err;
    }
  },
};

// --- Payments ------------------------------------------------------------

export interface RazorpayOrder {
  keyId: string;
  orderId: string;
  amount: number;
  currency?: string;
}

export const paymentApi = {
  createRazorpayOrder: (payload: { bookingId?: string; couponCode?: string }) =>
    apiRequest<RazorpayOrder>("/payments/razorpay/order", { method: "POST", body: payload }),
};

export const couponApi = {
  validate: (code: string, grossTotal?: number) =>
    apiRequest<unknown>("/coupons/validate", { method: "POST", body: { code, grossTotal } }),
  available: () => apiRequest<unknown>("/coupons/available"),
};
