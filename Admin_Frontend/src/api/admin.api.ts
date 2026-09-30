import { api as apiClient } from './client';

export interface AdminScope {
  country: string;
  states: string[];
  districts: string[];
  regions: string[];
  cities: string[];
}

export interface ManagedUsers {
  admins: number;
  fleetManagers: number;
  pilots: number;
  salesAggregators: number;
  customers: number;
}

export interface Admin {
  adminId: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  photoUrl: string;
  email: string;
  phone: string;
  designation: string;
  role: 'SUPER_ADMIN' | 'STATE_ADMIN' | 'DEPARTMENT_ADMIN' | 'DISTRICT_ADMIN';
  department: string;
  reportingTo: string | null;
  scope: AdminScope;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  onlineStatus: 'ONLINE' | 'OFFLINE';
  lastLogin: string;
  joinedAt: string;
  permissionsProfile: string;
  managedUsers: ManagedUsers;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListResponse {
  data: Admin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminStats {
  totalAdmins: number;
  superAdmins: number;
  stateAdmins: number;
  departmentAdmins: number;
  districtAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
}

export interface AdminQueryParams {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  state?: string;
  district?: string;
  reportingTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  role: string;
  department: string;
  reportingTo?: string;
  scope: AdminScope;
  permissionsProfile: string;
  photoUrl?: string;
  employeeCode?: string;
}

export interface UpdateAdminRequest {
  fullName?: string;
  phone?: string;
  designation?: string;
  role?: string;
  department?: string;
  reportingTo?: string;
  scope?: AdminScope;
  permissionsProfile?: string;
  photoUrl?: string;
  status?: string;
}

export interface Department {
  departmentId: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface State {
  stateId: string;
  name: string;
  code: string;
  country: string;
  isActive: boolean;
  adminId: string | null;
}

export interface PermissionProfile {
  profileId: string;
  name: string;
  description: string;
  permissions: string[];
}

class AdminAPI {
  /**
   * Build query string from params object
   */
  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }

  /**
   * Get all admins with filters and pagination
   */
  async getAdmins(params?: AdminQueryParams): Promise<AdminListResponse> {
    const queryString = this.buildQueryString(params);
    const response = await apiClient.get<any>(`/admins${queryString}`);
    // Backend returns: {success: true, data: {data: [...], total, page, limit, totalPages}}
    // API client wraps it: {data: {success: true, data: {...}}}
    // So we need: response.data.data (gets the {data: [...], total...} object)
    const result = response.data?.data || response.data;
    return result;
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<Admin> {
    const response = await apiClient.get<any>(`/admins/${adminId}`);
    return response.data.data || response.data;
  }

  /**
   * Get subordinates (admins reporting to this admin)
   */
  async getSubordinates(adminId: string, params?: AdminQueryParams): Promise<AdminListResponse> {
    const queryString = this.buildQueryString(params);
    const response = await apiClient.get<any>(`/admins/${adminId}/subordinates${queryString}`);
    return response.data.data || response.data;
  }

  /**
   * Get department admins
   */
  async getDepartmentAdmins(adminId: string, department: string): Promise<Admin[]> {
    const response = await apiClient.get<any>(`/admins/${adminId}/department-admins/${department}`);
    return response.data.data || response.data;
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    const response = await apiClient.get<any>('/admins/stats');
    return response.data.data || response.data;
  }

  /**
   * Create new admin
   */
  async createAdmin(data: CreateAdminRequest): Promise<Admin> {
    const response = await apiClient.post<any>('/admins', data);
    return response.data.data || response.data;
  }

  /**
   * Update admin
   */
  async updateAdmin(adminId: string, data: UpdateAdminRequest): Promise<Admin> {
    const response = await apiClient.put<any>(`/admins/${adminId}`, data);
    return response.data.data || response.data;
  }

  /**
   * Delete admin (soft delete)
   */
  async deleteAdmin(adminId: string): Promise<void> {
    console.log('deleteAdmin API called for:', adminId);
    try {
      const result = await apiClient.delete(`/admins/${adminId}`);
      console.log('Delete admin result:', result);
    } catch (error) {
      console.error('Delete admin API error:', error);
      throw error;
    }
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get<any>('/admins/departments');
    return response.data.data || response.data;
  }

  /**
   * Get all states
   */
  async getStates(): Promise<State[]> {
    const response = await apiClient.get<any>('/admins/states');
    return response.data.data || response.data;
  }

  /**
   * Get all permission profiles
   */
  async getPermissionProfiles(): Promise<PermissionProfile[]> {
    const response = await apiClient.get<any>('/admins/permission-profiles');
    return response.data.data || response.data;
  }
}

export const adminAPI = new AdminAPI();
