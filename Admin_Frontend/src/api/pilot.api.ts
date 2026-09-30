/** Pilot API */

import { api } from './client';

// ==================== TYPE DEFINITIONS ====================

export type PilotStatus = 'AVAILABLE' | 'ON_MISSION' | 'ON_BREAK' | 'OFFLINE' | 'SUSPENDED';

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  mobile: string;
}

export interface Pilot {
  pilotId: string;
  fullName: string;
  mobile: string;
  email: string;
  firebaseUid?: string;
  assignedFleetManagerId: string | null;
  currentDroneId: string | null;
  currentBookingId: string | null;
  status: PilotStatus;
  
  // License Information
  licenseNumber: string;
  licenseType: string;
  licenseCategory: string;
  licenseIssueDate: string;
  licenseExpiry: string;
  medicalCertificateNumber: string;
  medicalCertificateExpiry: string;
  
  // Performance Metrics
  rating: number;
  flightHours: number;
  missions: number;
  completedMissions: number;
  totalFlightDistance: number;
  onTimePercentage: number;
  safetyScore: number;
  customerRating: number;
  
  // Personal Information
  age: number;
  experience: string;
  serviceTypes: string[];
  certifications: string[];
  
  // Location
  state: string;
  district: string;
  address: string;
  pincode: string;
  
  // Identity & Banking
  aadhaarNumber: string;
  panNumber: string;
  bankDetails: BankDetails;
  
  // Work Preferences
  preferredShifts: string[];
  maxFlightHoursPerDay: number;
  emergencyContact: EmergencyContact;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface PilotRequest {
  requestId: string;
  fullName: string;
  mobile: string;
  email: string;
  age: number;
  experience: string;
  flightHours: number;
  licenseNumber: string | null;
  hasLicense: boolean;
  preferredLocation: string;
  aadhaarNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  assignedFleetManagerId?: string | null;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  formData?: Record<string, any>;
  documents?: any[];
}

export interface PilotBooking {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerName?: string;
  farmId: string;
  serviceType: string;
  serviceSubType: string;
  cropType: string;
  area: number;
  unit: string;
  bookingStatus: string;
  missionStatus: string;
  scheduledStart: string;
  scheduledEnd: string;
  completedAt?: string;
  price: {
    total: number;
  };
  location: {
    state: string;
    district: string;
    village: string;
  };
}

export interface PilotSupportTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  bookingId: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  customerSatisfactionRating?: number;
}

export interface PilotStats {
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  averageRating: number;
  completionRate: number;
  onTimeRate: number;
  totalFlightHours: number;
  totalFlightDistance: number;
}

export interface FleetManager {
  fleetManagerId: string;
  fullName: string;
  mobile: string;
  email: string;
  state: string;
  district: string;
}

export interface PilotListFilters {
  status?: PilotStatus;
  state?: string;
  district?: string;
  fleetManagerId?: string;
  minRating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface MaintenanceTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  droneId: string;
  fleetManagerId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo?: string;
  assignedTechnician?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resolution?: string;
}

// ==================== API ENDPOINTS ====================

export const pilotApi = {
  // Pilot Management
  getAll: (filters?: PilotListFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return api.get<PaginatedResponse<Pilot>>(`/admin/pilots${queryString ? `?${queryString}` : ''}`);
  },

  getById: (pilotId: string) =>
    api.get<Pilot>(`/admin/pilots/${pilotId}`),

  update: (pilotId: string, data: Partial<Pilot>) =>
    api.patch<Pilot>(`/admin/pilots/${pilotId}`, data),

  updateStatus: (pilotId: string, status: PilotStatus) =>
    api.patch<Pilot>(`/admin/pilots/${pilotId}/status`, { status }),

  remove: (pilotId: string) =>
    api.delete(`/admin/pilots/${pilotId}`),

  // Pilot Performance & Stats
  getStats: (pilotId: string) =>
    api.get<PilotStats>(`/admin/pilots/${pilotId}/stats`),

  getBookings: (pilotId: string, filters?: { status?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return api.get<PilotBooking[]>(`/admin/pilots/${pilotId}/bookings${queryString ? `?${queryString}` : ''}`);
  },

  getSupportTickets: (pilotId: string) =>
    api.get<PilotSupportTicket[]>(`/admin/pilots/${pilotId}/support-tickets`),

  getMaintenanceTickets: (pilotId: string) =>
    api.get<MaintenanceTicket[]>(`/admin/pilots/${pilotId}/maintenance-tickets`),

  getFleetManager: (pilotId: string) =>
    api.get<FleetManager>(`/admin/pilots/${pilotId}/fleet-manager`),

  getEarnings: (pilotId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return api.get<{ total: number; breakdown: any[] }>(`/admin/pilots/${pilotId}/earnings${queryString ? `?${queryString}` : ''}`);
  },

  // Pilot Requests Management
  getAllRequests: (status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const params = status ? `?status=${status}` : '';
    return api.get<PilotRequest[]>(`/admin/pilots/requests${params}`);
  },

  getRequestById: (requestId: string) =>
    api.get<PilotRequest>(`/admin/pilots/requests/${requestId}`),

  approveRequest: (requestId: string, data: { assignedFleetManagerId?: string; approvedBy: string }) =>
    api.post<{ pilot: Pilot; request: PilotRequest }>(`/admin/pilots/requests/${requestId}/approve`, data),

  rejectRequest: (requestId: string, data: { rejectedBy: string; rejectionReason: string }) =>
    api.post<PilotRequest>(`/admin/pilots/requests/${requestId}/reject`, data),

  // Dashboard Queries
  getActivePilotsToday: () =>
    api.get<Pilot[]>(`/admin/pilots/dashboard/active-today`),

  getExpiringLicenses: (days: number = 30) =>
    api.get<Pilot[]>(`/admin/pilots/dashboard/expiring-licenses?days=${days}`),

  getTopPerformers: (period: 'week' | 'month' | 'year' = 'month', limit: number = 10) =>
    api.get<Pilot[]>(`/admin/pilots/dashboard/top-performers?period=${period}&limit=${limit}`),
};
