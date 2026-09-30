import { api } from './client';

export interface FleetManager {
  fleetManagerId: string;
  fullName: string;
  mobile: string;
  email: string;
  firebaseUid?: string;
  status: 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedPilots: number;
  assignedDrones: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  region: string;
  state: string;
  district: string;
  coverageRadius: number;
  licenseNumber: string;
  licenseType: string;
  licenseIssueDate: string;
  licenseExpiry: string;
  panNumber?: string;
  gstNumber?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  rating: number;
  responseTime: number;
  alternatePhone?: string;
  address: string;
  pincode: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface Pilot {
  pilotId: string;
  fullName: string;
  mobile: string;
  email: string;
  assignedFleetManagerId: string;
  currentDroneId?: string;
  currentBookingId?: string;
  status: 'AVAILABLE' | 'ON_MISSION' | 'ON_BREAK' | 'OFFLINE';
  licenseNumber: string;
  licenseExpiry: string;
  rating: number;
  flightHours: number;
  missions: number;
  completedMissions: number;
  state: string;
  district: string;
  createdAt: string;
  lastActiveAt?: string;
}

export interface Drone {
  droneId: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  assignedFleetManagerId: string;
  currentPilotId?: string;
  currentBookingId?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  serviceCapabilities: string[];
  batteryHealth: number;
  flightHours: number;
  missions: number;
  completedMissions: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  registrationNumber: string;
  createdAt: string;
  lastFlightAt?: string;
}

export interface Booking {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  fleetManagerId?: string;
  pilotId?: string;
  droneId?: string;
  serviceType: string;
  cropType: string;
  area: number;
  scheduledStart?: string;
  bookingStatus: string;
  price: {
    total: number;
  };
  location: {
    state: string;
    district: string;
    village: string;
  };
  createdAt: string;
}

export interface MaintenanceTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  droneId: string;
  fleetManagerId: string;
  title: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
}

export interface SupportTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  customerId: string;
  bookingId?: string;
  subject: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  resolvedAt?: string;
  customerSatisfactionRating?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FleetManagerListResponse {
  data: FleetManager[];
  pagination: Pagination;
}

export interface FleetManagerDashboard {
  fleetManager: FleetManager;
  summary: {
    totalPilots: number;
    totalDrones: number;
    totalBookings: number;
    completedBookings: number;
    totalRevenue: number;
    averageCustomerRating: number;
  };
  pilots: {
    total: number;
    byStatus: {
      AVAILABLE: number;
      ON_MISSION: number;
      ON_BREAK: number;
      OFFLINE: number;
    };
  };
  drones: {
    total: number;
    byStatus: {
      AVAILABLE: number;
      IN_USE: number;
      MAINTENANCE: number;
      OUT_OF_SERVICE: number;
    };
  };
  bookings: {
    total: number;
    byStatus: {
      PENDING: number;
      CONFIRMED: number;
      IN_PROGRESS: number;
      COMPLETED: number;
      CANCELLED: number;
    };
  };
  maintenance: {
    total: number;
    byStatus: {
      OPEN: number;
      IN_PROGRESS: number;
      COMPLETED: number;
    };
    byPriority: {
      URGENT: number;
      HIGH: number;
      NORMAL: number;
      LOW: number;
    };
  };
  support: {
    total: number;
    byStatus: {
      PENDING: number;
      IN_PROGRESS: number;
      RESOLVED: number;
      CLOSED: number;
    };
    averageRating: number;
  };
}

// API Functions

/**
 * Get list of fleet managers with filters and pagination
 */
export const getFleetManagers = async (params?: {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  state?: string;
  region?: string;
  search?: string;
}): Promise<FleetManagerListResponse> => {
  // Build query string manually
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.approvalStatus) queryParts.push(`approvalStatus=${params.approvalStatus}`);
  if (params?.state) queryParts.push(`state=${params.state}`);
  if (params?.region) queryParts.push(`region=${params.region}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const response = await api.get<FleetManagerListResponse>(`/fleet-managers${queryString}`);
  return response.data;
};

/**
 * Get detailed profile of a specific fleet manager
 */
export const getFleetManagerProfile = async (id: string): Promise<{ fleetManager: FleetManager }> => {
  const response = await api.get<{ fleetManager: FleetManager }>(`/fleet-managers/${id}`);
  return response.data;
};

/**
 * Get statistics for a fleet manager
 */
export const getFleetManagerStats = async (
  id: string,
  period?: 'week' | 'month' | 'year'
): Promise<any> => {
  const queryString = period ? `?period=${period}` : '?period=month';
  const response = await api.get<any>(`/fleet-managers/${id}/stats${queryString}`);
  return response.data;
};

/**
 * Get all pilots assigned to a fleet manager
 */
export const getFleetManagerPilots = async (
  id: string,
  params?: { page?: number; limit?: number; status?: string }
): Promise<{ data: Pilot[]; pagination: Pagination }> => {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  
  const response = await api.get<{ data: Pilot[]; pagination: Pagination }>(`/fleet-managers/${id}/pilots${queryString}`);
  return response.data;
};

/**
 * Get all drones assigned to a fleet manager
 */
export const getFleetManagerDrones = async (
  id: string,
  params?: { page?: number; limit?: number; status?: string }
): Promise<{ data: Drone[]; pagination: Pagination }> => {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  
  const response = await api.get<{ data: Drone[]; pagination: Pagination }>(`/fleet-managers/${id}/drones${queryString}`);
  return response.data;
};

/**
 * Get all bookings for a fleet manager
 */
export const getFleetManagerBookings = async (
  id: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: Booking[]; pagination: Pagination }> => {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.startDate) queryParts.push(`startDate=${params.startDate}`);
  if (params?.endDate) queryParts.push(`endDate=${params.endDate}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  
  const response = await api.get<{ data: Booking[]; pagination: Pagination }>(`/fleet-managers/${id}/bookings${queryString}`);
  return response.data;
};

/**
 * Get all maintenance tickets for fleet manager's drones
 */
export const getFleetManagerMaintenanceTickets = async (
  id: string,
  params?: { page?: number; limit?: number; status?: string; priority?: string }
): Promise<{ data: MaintenanceTicket[]; pagination: Pagination }> => {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.priority) queryParts.push(`priority=${params.priority}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  
  const response = await api.get<{ data: MaintenanceTicket[]; pagination: Pagination }>(`/fleet-managers/${id}/maintenance-tickets${queryString}`);
  return response.data;
};

/**
 * Get all support tickets related to fleet manager's bookings
 */
export const getFleetManagerSupportTickets = async (
  id: string,
  params?: { page?: number; limit?: number; status?: string; priority?: string }
): Promise<{ data: SupportTicket[]; pagination: Pagination }> => {
  const queryParts: string[] = [];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.priority) queryParts.push(`priority=${params.priority}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  
  const response = await api.get<{ data: SupportTicket[]; pagination: Pagination }>(`/fleet-managers/${id}/support-tickets${queryString}`);
  return response.data;
};

/**
 * Get comprehensive dashboard data for fleet manager
 */
export const getFleetManagerDashboard = async (id: string): Promise<FleetManagerDashboard> => {
  const response = await api.get<FleetManagerDashboard>(`/fleet-managers/${id}/dashboard`);
  return response.data;
};

/**
 * Get incoming/pending fleet manager requests
 */
export const getPendingFleetManagerRequests = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<FleetManagerListResponse> => {
  const queryParts: string[] = ['approvalStatus=PENDING'];
  if (params?.page) queryParts.push(`page=${params.page}`);
  if (params?.limit) queryParts.push(`limit=${params.limit}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  
  const queryString = `?${queryParts.join('&')}`;
  const response = await api.get<FleetManagerListResponse>(`/fleet-managers${queryString}`);
  return response.data;
};

/**
 * Remove/Delete a fleet manager
 */
export const removeFleetManager = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/fleet-managers/${id}`);
  return response.data;
};

/**
 * Remove/Unassign a drone from a fleet manager
 */
export const removeDroneFromFleetManager = async (
  fleetManagerId: string,
  droneId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/fleet-managers/${fleetManagerId}/drones/${droneId}`);
  return response.data;
};

/**
 * Approve a pending fleet manager request
 */
export const approveFleetManager = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch<{ success: boolean; message: string }>(`/fleet-managers/${id}/approve`);
  return response.data;
};

/**
 * Reject a pending fleet manager request
 */
export const rejectFleetManager = async (
  id: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch<{ success: boolean; message: string }>(`/fleet-managers/${id}/reject`, { reason });
  return response.data;
};
