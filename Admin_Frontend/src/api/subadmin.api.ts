import { api as apiClient } from './client';

// ==================== TYPES ====================

export interface SubAdminPermissions {
  manage_pilots: boolean;
  manage_vendors: boolean;
  manage_customers: boolean;
  manage_aggregators: boolean;
  manage_bookings: boolean;
  manage_incidents: boolean;
  manage_service_centre: boolean;
  manage_fleet: boolean;
  manage_revenue: boolean;
  view_analytics: boolean;
  approve_documents: boolean;
  manage_notifications: boolean;
}

export interface SubAdmin {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  status: 'active' | 'inactive' | 'suspended';
  assignedRegion: string | null;
  assignedDepartment: string | null;
  permissions: SubAdminPermissions;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SubAdminFilterParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'suspended';
  assignedRegion?: string;
  assignedDepartment?: string;
  search?: string;
}

export interface SubAdminListResponse {
  items: SubAdmin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSubAdminDto {
  name: string;
  email: string;
  mobile: string;
  password: string;
  assignedRegion?: string;
  assignedDepartment?: string;
  permissions: Record<string, boolean>;
}

export interface UpdateSubAdminDto {
  name?: string;
  email?: string;
  mobile?: string;
  status?: 'active' | 'inactive' | 'suspended';
  assignedRegion?: string;
  assignedDepartment?: string;
  permissions?: Record<string, boolean>;
}

export interface UpdateSubAdminScopeDto {
  assignedRegion?: string | null;
  assignedDepartment?: string | null;
}

export interface ManagedEntities {
  uid: string;
  name: string;
  scope: {
    assignedRegion: string | null;
    assignedDepartment: string | null;
  };
  managed: {
    pilots: number;
    vendors: number;
    customers: number;
    aggregators: number;
    bookings: number;
    incidents: number;
    serviceTickets: number;
    fleetAssets: number;
  };
}

export interface SubAdminActivity {
  uid: string;
  name: string;
  recentActivity: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

export interface PermissionMatrix {
  [key: string]: {
    label: string;
    description: string;
    category: string;
  };
}

// ==================== INDIAN STATES & REGIONS ====================

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const STATE_REGIONS: Record<string, string[]> = {
  'Maharashtra': ['Western', 'Vidarbha', 'Marathwada', 'Khandesh'],
  'Karnataka': ['Coastal', 'North', 'South', 'Central'],
  'Tamil Nadu': ['North', 'South', 'West', 'Central', 'Delta'],
  'Gujarat': ['North', 'South', 'Central', 'Saurashtra', 'Kutch'],
  'Rajasthan': ['North', 'South', 'East', 'West', 'Central'],
  'Uttar Pradesh': ['Western', 'Eastern', 'Central', 'Bundelkhand'],
  'Punjab': ['Majha', 'Doaba', 'Malwa'],
  'Haryana': ['North', 'South', 'East', 'West'],
  'Madhya Pradesh': ['Central', 'North', 'South', 'East', 'West'],
  'West Bengal': ['North', 'South', 'Central'],
  'Andhra Pradesh': ['Coastal', 'Rayalaseema', 'North'],
  'Telangana': ['North', 'South', 'Central'],
  'Kerala': ['North', 'Central', 'South'],
  'Odisha': ['Coastal', 'North', 'South', 'Western'],
  'Bihar': ['North', 'South', 'Central'],
  'Assam': ['Upper', 'Lower', 'Central'],
  'Jharkhand': ['North', 'South', 'Central'],
  'Chhattisgarh': ['North', 'South', 'Central'],
  'Uttarakhand': ['Garhwal', 'Kumaon'],
  'Himachal Pradesh': ['Shimla', 'Kangra', 'Mandi', 'Kullu'],
  'Goa': ['North Goa', 'South Goa'],
  'Arunachal Pradesh': ['East', 'West', 'Central'],
  'Manipur': ['Valley', 'Hills'],
  'Meghalaya': ['East', 'West', 'South'],
  'Mizoram': ['North', 'South', 'Central'],
  'Nagaland': ['Eastern', 'Western'],
  'Sikkim': ['East', 'West', 'North', 'South'],
  'Tripura': ['North', 'South', 'West'],
};

export const DEPARTMENTS = [
  'Operations',
  'Fleet Management',
  'Customer Support',
  'Sales',
  'Technical',
  'Finance',
  'HR',
];

// ==================== API CLASS ====================

class SubAdminAPI {
  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }

  /**
   * Get all sub-admins with filters and pagination
   */
  async list(params?: SubAdminFilterParams): Promise<SubAdminListResponse> {
    const queryString = this.buildQueryString(params);
    const response = await apiClient.get<any>(`/subadmins${queryString}`);
    const result = response.data?.data || response.data;
    return result;
  }

  /**
   * Get sub-admin by ID
   */
  async get(id: string): Promise<SubAdmin> {
    const response = await apiClient.get<any>(`/subadmins/${id}`);
    return response.data?.data || response.data;
  }

  /**
   * Create new sub-admin
   */
  async create(data: CreateSubAdminDto): Promise<SubAdmin> {
    const response = await apiClient.post<any>('/subadmins', data);
    return response.data?.data || response.data;
  }

  /**
   * Update sub-admin
   */
  async update(id: string, data: UpdateSubAdminDto): Promise<SubAdmin> {
    const response = await apiClient.patch<any>(`/subadmins/${id}`, data);
    return response.data?.data || response.data;
  }

  /**
   * Delete/Remove sub-admin
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/subadmins/${id}`);
  }

  /**
   * Get sub-admin permissions
   */
  async getPermissions(id: string): Promise<{ uid: string; permissions: SubAdminPermissions }> {
    const response = await apiClient.get<any>(`/subadmins/${id}/permissions`);
    return response.data?.data || response.data;
  }

  /**
   * Update sub-admin permissions
   */
  async updatePermissions(id: string, permissions: Record<string, boolean>): Promise<SubAdmin> {
    const response = await apiClient.patch<any>(`/subadmins/${id}/permissions`, { permissions });
    return response.data?.data || response.data;
  }

  /**
   * Update sub-admin scope (region/department)
   */
  async updateScope(id: string, scope: UpdateSubAdminScopeDto): Promise<SubAdmin> {
    const response = await apiClient.patch<any>(`/subadmins/${id}/scope`, scope);
    return response.data?.data || response.data;
  }

  /**
   * Get sub-admin managed entities (users, bookings, etc.)
   */
  async getManagedEntities(id: string): Promise<ManagedEntities> {
    const response = await apiClient.get<any>(`/subadmins/${id}/managed-entities`);
    return response.data?.data || response.data;
  }

  /**
   * Get sub-admin activity
   */
  async getActivity(id: string): Promise<SubAdminActivity> {
    const response = await apiClient.get<any>(`/subadmins/${id}/activity`);
    return response.data?.data || response.data;
  }

  /**
   * Get permission matrix (all available permissions)
   */
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const response = await apiClient.get<any>('/subadmins/permissions/matrix');
    return response.data?.data || response.data;
  }

  /**
   * Get regions for a specific state
   */
  getRegionsForState(state: string): string[] {
    return STATE_REGIONS[state] || [];
  }

  /**
   * Get all states
   */
  getStates(): string[] {
    return INDIAN_STATES;
  }

  /**
   * Get all departments
   */
  getDepartments(): string[] {
    return DEPARTMENTS;
  }
}

export const subAdminAPI = new SubAdminAPI();
