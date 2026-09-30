/** Dashboard + Booking API */

import { api } from './client';

// ── Booking types ─────────────────────────────────────

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface BookingAnalyticsStats {
  total: number;
  completed: number;
  upcoming: number;
  active: number;
  cancelled: number;
}

export interface BookingAnalytics {
  stats: BookingAnalyticsStats;
  byState: { state: string; count: number }[];
  byService: { service: string; count: number }[];
  timeline: ({ month: string } & Record<string, number | string>)[];
}

export interface BookingAnalyticsFilter {
  year?: number;
  quarter?: number;
  serviceType?: string;
  state?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Area {
  unit: string;
  value: number;
}

export interface BookingLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface BookingAddress {
  state: string;
  district: string;
  taluka: string;
  village: string;
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  customerUid: string;
  customerName?: string;
  createdBy: string;
  aggregatorId?: string | null;
  vendorId?: string | null;
  fleetManagerUid?: string | null;
  assignedPilot?: string | null;
  assignedPilotName?: string | null;
  assignedDrone?: string | null;
  address: string | BookingAddress;  // Can be string or structured object
  area: Area;
  cropType: string;
  serviceType: string;
  droneTier?: string;
  location: GeoPoint | BookingAddress;  // Can be simple GeoPoint or full address object
  couponCode?: string | null;
  priceEstimation?: number | null;
  finalPrice?: number | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  status: string;
  adminApprovalStatus?: string;
  autoAssign?: boolean;
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedBooking extends Booking {
  customer?: {
    uid: string;
    name: string;
    email?: string;
    phone?: string;
  };
  pilot?: {
    pilotId: string;
    fullName: string;
    mobile: string;
    email: string;
  };
  fleetManager?: {
    fleetManagerId: string;
    fullName: string;
    mobile: string;
    email: string;
  };
  drone?: {
    id: string;
    model: string;
    serialNumber: string;
    status: string;
  };
}

export interface CreateBookingDto {
  serviceType: string;
  cropType: string;
  areaValue: number;
  areaUnit: string;
  location: { lat: number; lng: number };
  address: string;
  scheduledDate?: string;
  customerUid?: string;
  droneTier?: string;
  couponCode?: string;
}

export interface BookingFilters {
  status?: string;
  adminApprovalStatus?: string;
  customerUid?: string;
  vendorId?: string;
  pilotId?: string;
  aggregatorId?: string;
  cropType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface PaginatedBookings {
  items: Booking[];
  meta: {
    limit: number;
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// ── API calls ─────────────────────────────────────────

export const bookingApi = {
  getStats: () =>
    api.get<BookingStats>('/bookings/stats'),

  getAnalytics: (filter?: BookingAnalyticsFilter) => {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return api.get<BookingAnalytics>(`/bookings/analytics${qs ? `?${qs}` : ''}`);
  },

  getAll: (filters?: BookingFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return api.get<PaginatedBookings>(`/bookings${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id: string) =>
    api.get<Booking>(`/bookings/${id}`),

  getEnrichedById: (id: string) =>
    api.get<EnrichedBooking>(`/bookings/${id}/enriched`),

  create: (dto: CreateBookingDto) =>
    api.post<Booking>('/bookings', dto),

  assign: (id: string, vendorId: string, pilotId: string) =>
    api.patch<Booking>(`/bookings/${id}/assign`, { vendorId, pilotId }),

  updateStatus: (id: string, status: string) =>
    api.patch<Booking>(`/bookings/${id}/status`, { status }),

  cancel: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/cancel`, { reason }),

  // Admin approval
  adminApprove: (id: string, autoAssign?: boolean) =>
    api.post<Booking>(`/bookings/${id}/admin-approve`, { autoAssign: autoAssign ?? true }),

  adminReject: (id: string, reason?: string) =>
    api.post<Booking>(`/bookings/${id}/admin-reject`, { reason }),

  adminAssign: (id: string, payload: { fleetManagerUid?: string; assignedPilot?: string; assignedDrone?: string }) =>
    api.patch<Booking>(`/bookings/${id}/admin-assign`, payload),

  // Get booking metadata
  getProgress: (id: string) =>
    api.get<any>(`/bookings/${id}/progress`),

  getWeather: (id: string) =>
    api.get<any>(`/bookings/${id}/weather`),

  getRestrictions: (id: string) =>
    api.get<any>(`/bookings/${id}/restrictions`),

  getMetadata: (id: string) =>
    api.get<{ progress: any; weather: any; restrictions: any }>(`/bookings/${id}/metadata`),
};
