import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, useWindowDimensions, Modal } from 'react-native';
import { customerApi, Customer } from '../api/customer.api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { showAlert, showConfirm } from '../utils/dialog';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import LocationIcon from '../assets/icons/LocationIcon.svg';
import CallIcon from '../assets/icons/CallIcon.svg';
import EmailIcon from '../assets/icons/EmailIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';
import ActivityIcon from '../assets/icons/ActivityIcon.svg';
import ClockIcon from '../assets/icons/ClockIcon.svg';
import SMIcon from '../assets/icons/sm.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import SubAdminsIcon from '../assets/icons/sub-admin-icon.svg';
import BriefcaseIcon from '../assets/icons/BriefcaseIcon.svg';
import RupeeIcon from '../assets/icons/rupee-icon.svg';
import VectorIcon from '../assets/icons/Vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

// --- TS Type Definitions for Customer Objects ---
interface CustomerItem extends Customer {
  revenue: string;
  joiningDate: string;
  bookings: number;
  state: string;
  region: string;
  id?: string;
}

interface Booking {
  bookingId: string;
  bookingNumber: string;
  serviceType: string;
  cropType: string;
  bookingStatus: string;
  price: {
    total: number;
  };
  location: {
    village: string;
    state: string;
  };
  scheduledStart?: string;
  preferredDate: string;
  fleetManagerId?: string | null;
  pilotId?: string | null;
  droneId?: string | null;
}

interface Farm {
  farmId: string;
  farmName: string;
  crop: string;
  cropStage: string;
  area: number;
  unit: string;
  soilType: string;
  state: string;
  village: string;
  status: string;
  createdAt: string;
}

interface SupportTicket {
  ticketId: string;
  ticketNumber: string;
  category: string;
  subject: string;
  priority: string;
  status: string;
  bookingId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  customerSatisfactionRating?: number | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function CustomerManagementScreen() {
  const { user, logout } = useAuth();

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState<{
    states: string[];
    regions: string[];
    occupations: string[];
    regionsByState: Record<string, string[]>;
  }>({ states: [], regions: [], occupations: [], regionsByState: {} });
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedOccupation, setSelectedOccupation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Computed: Get regions for selected state
  const availableRegions = selectedState && filterOptions.regionsByState[selectedState]
    ? filterOptions.regionsByState[selectedState]
    : filterOptions.regions;
  
  // Dynamic Route Tracking: Switches between Master List view and Customer Profile view
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  
  // Tab selector state inside profile view
  const [activeProfileTab, setActiveProfileTab] = useState<'Bookings' | 'Tickets'>('Bookings');
  
  // Bookings state
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPagination, setBookingsPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  
  // Add pagination state for customers
  const [customersPagination, setCustomersPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Load customers from backend
  useEffect(() => {
    loadCustomers(customersPagination.page);
  }, [searchQuery, selectedState, selectedRegion, selectedOccupation, selectedStatus]);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Clear region when state changes
  useEffect(() => {
    if (selectedState) {
      // Check if current region is valid for the selected state
      const regionsForState = filterOptions.regionsByState[selectedState] || [];
      if (selectedRegion && !regionsForState.includes(selectedRegion)) {
        setSelectedRegion('');
      }
    }
  }, [selectedState]);

  // Load bookings when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerBookings(selectedCustomer.uid, 1); // Start from page 1
    } else {
      setCustomerBookings([]);
      setBookingsPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    }
  }, [selectedCustomer]);

  const loadFilterOptions = async () => {
    try {
      console.log('🔧 Loading filter options...');
      const response = await customerApi.getFilterOptions();
      console.log('✅ Filter options loaded:', response.data);
      
      const data: any = response.data;
      if (data && data.success && data.data) {
        setFilterOptions(data.data);
      } else if (data && data.states) {
        setFilterOptions(data);
      }
    } catch (err: any) {
      console.error('❌ Failed to load filter options:', err);
      // Don't show error to user, just use empty filters
      setFilterOptions({ states: [], regions: [], occupations: [], regionsByState: {} });
    }
  };

  const loadCustomers = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Loading customers... Page: ${page}, Limit: ${limit}, Search: ${searchQuery}`);

      // Build filters object
      const filters: any = {};
      if (selectedStatus) filters.status = selectedStatus;
      if (selectedState) filters.state = selectedState;
      if (selectedRegion) filters.region = selectedRegion;
      if (selectedOccupation) filters.occupation = selectedOccupation;

      const response = await customerApi.getAll(page, limit, searchQuery || undefined, filters);
      console.log('📡 API Response:', response);
      console.log('📊 Response data:', response.data);
      console.log('📈 Data type:', typeof response.data);
      console.log('🔍 Is array:', Array.isArray(response.data));
      
      // Handle different response structures
      let customerData: any[] = [];
      let paginationData: any = null;
      const responseData: any = response.data;
      
      if (Array.isArray(responseData)) {
        // Direct array response (legacy)
        customerData = responseData;
      } else if (responseData && responseData.success && responseData.data) {
        // Wrapped response with pagination: { success: true, data: { data: [...], pagination: {...} } }
        if (responseData.data.data && Array.isArray(responseData.data.data)) {
          customerData = responseData.data.data;
          paginationData = responseData.data.pagination;
          console.log('✅ Found paginated response:', customerData.length, 'customers');
          console.log('📄 Pagination:', paginationData);
        } else if (Array.isArray(responseData.data)) {
          // Wrapped response without nested data: { success: true, data: [...] }
          customerData = responseData.data;
        }
      } else if (responseData && Array.isArray(responseData.items)) {
        // Handle paginated response
        customerData = responseData.items;
      } else if (responseData && responseData.success === false) {
        // Handle error response
        throw new Error(responseData.error || 'API returned error');
      } else {
        console.warn('🟡 Unexpected response structure, using empty array');
        customerData = [];
      }
      
      // Transform backend data to match UI expectations
      const transformedCustomers: CustomerItem[] = customerData.map((customer: any) => ({
        ...customer,
        name: customer.profileData?.displayName || customer.name || 'Unknown',
        revenue: customer.totalRevenue ? `₹${customer.totalRevenue.toLocaleString('en-IN')}` : '₹0',
        joiningDate: new Date(customer.createdAt).toLocaleDateString('en-GB'),
        bookings: customer.totalBookings || 0,
        state: customer.profileData?.state || 'Unknown',
        region: customer.profileData?.region || 'Unknown',
        id: customer.uid,
      }));
      
      console.log('✅ Transformed customers:', transformedCustomers);
      setCustomers(transformedCustomers);
      
      // Update pagination state
      if (paginationData) {
        setCustomersPagination({
          page: paginationData.page || page,
          limit: paginationData.limit || limit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 0,
          hasNext: paginationData.hasNext || false,
          hasPrev: paginationData.hasPrev || false,
        });
      }
    } catch (err: any) {
      console.error('💥 Failed to load customers:', err);
      console.error('🔍 Error details:', {
        message: err.message,
        status: err.statusCode,
        response: err.response?.data
      });
      setError(err.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerBookings = async (customerUid: string, page: number = 1, limit: number = 10) => {
    try {
      setBookingsLoading(true);
      console.log(`📦 Loading bookings for: ${customerUid}, page: ${page}, limit: ${limit}`);
      
      const response = await customerApi.getBookings(customerUid, page, limit);
      console.log('📦 Bookings response:', response);
      
      // Handle the API response format from customer service
      let bookingsData: any[] = [];
      let paginationData: PaginationData = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      
      const responseData: any = response.data;
      
      // Expected format: {success: true, data: {data: [...], pagination: {...}}}
      if (responseData && responseData.success && responseData.data) {
        if (Array.isArray(responseData.data.data)) {
          bookingsData = responseData.data.data;
          const pagination = responseData.data.pagination;
          
          if (pagination) {
            paginationData = {
              page: pagination.page || page,
              limit: pagination.limit || limit,
              total: pagination.total || 0,
              totalPages: pagination.totalPages || 0,
              hasNext: pagination.hasNext || false,
              hasPrev: pagination.hasPrev || false,
            };
          }
        } else if (Array.isArray(responseData.data)) {
          // Fallback: direct array
          bookingsData = responseData.data;
        }
      } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
        // Alternative format: {data: [...], pagination: {...}}
        bookingsData = responseData.data;
        if (responseData.pagination) {
          const pagination = responseData.pagination;
          paginationData = {
            page: pagination.page || page,
            limit: pagination.limit || limit,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || 0,
            hasNext: pagination.hasNext || false,
            hasPrev: pagination.hasPrev || false,
          };
        }
      } else if (Array.isArray(responseData)) {
        // Legacy: direct array
        bookingsData = responseData;
      }
      
      console.log('✅ Loaded bookings:', bookingsData.length);
      console.log('📋 Pagination:', paginationData);
      if (bookingsData.length > 0) {
        console.log('📋 First booking:', bookingsData[0]);
      }
      
      setCustomerBookings(bookingsData);
      setBookingsPagination(paginationData);
    } catch (err: any) {
      console.error('❌ Failed to load bookings:', err);
      console.error('Error details:', err.response?.data);
      setCustomerBookings([]);
      setBookingsPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setBookingsLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedState('');
    setSelectedRegion('');
    setSelectedOccupation('');
    setSelectedStatus('');
    setSearchQuery('');
  };

  const handleBanCustomer = async (customer: CustomerItem) => {
    try {
      const isBanned = customer.status === 'blocked' || customer.status === 'BLOCKED';
      const action = isBanned ? 'unban' : 'ban';
      
      // Cross-platform confirm (web + native)
      const confirmed = await showConfirm(
        `Are you sure you want to ${action} ${customer.name}?`
      );
      
      if (!confirmed) {
        return;
      }

      try {
        await customerApi.banCustomer(customer.uid, !isBanned);
        
        // Update the customer status immediately in the UI
        // Backend returns ACTIVE/BLOCKED in uppercase, but UI uses lowercase
        const newStatus: 'active' | 'blocked' | 'inactive' | 'pending' = isBanned ? 'active' : 'blocked';
        const updatedCustomer: CustomerItem = {
          ...customer,
          status: newStatus,
        };
        
        // Update in the selected customer
        setSelectedCustomer(updatedCustomer);
        
        // Update in the customers list
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.uid === customer.uid ? updatedCustomer : c
          )
        );
        
        console.log(`✅ Customer ${action}ned successfully`);
        
        // Show success message
        showAlert(`Customer ${action}ned successfully!`);
        
        // Reload customers to get fresh data from backend
        await loadCustomers(customersPagination.page);
      } catch (err: any) {
        console.error('Failed to update customer:', err);
        showAlert(`Error: ${err.response?.data?.error || err.message || 'Failed to update customer status'}`);
      }
    } catch (err: any) {
      showAlert(`Error: ${err.message || 'Failed to update customer status'}`);
    }
  };

  const handleLogout = async () => {
    console.log('🔴 handleLogout CALLED - showing confirmation dialog');
    
    // Cross-platform confirm (web + native)
    const confirmed = await showConfirm('Are you sure you want to logout?');
    
    if (!confirmed) {
      console.log('🔴 User cancelled logout');
      return;
    }

    console.log('🔴 User confirmed logout - starting logout process');
    setShowUserMenu(false);
    console.log('🔴 Menu closed, calling logout()...');
    
    try {
      console.log('🔴 BEFORE await logout()');
      await logout();
      console.log('✅ AFTER await logout() - User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error caught:', error);
      showAlert('Error during logout. Please try again.');
    }
    console.log('🔴 handleLogout completed');
  };

  // Extract initials for customer profile avatar circles
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format service type for display
  const formatServiceType = (serviceType: string, cropType: string) => {
    const serviceMap: Record<string, string> = {
      'spraying': 'Pesticide Spraying',
      'seeding': 'Seed Planting',
      'monitoring': 'Field Monitoring',
    };
    return `${serviceMap[serviceType] || serviceType} - ${cropType.charAt(0).toUpperCase() + cropType.slice(1)}`;
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    switch (normalizedStatus) {
      case 'completed':
        return { bg: '#ECFDF5', border: '#10B981', text: '#10B981' };
      case 'in_progress':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#F59E0B' };
      case 'confirmed':
      case 'pilot_assigned':
      case 'fleet_manager_assigned':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#3B82F6' };
      case 'pending':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#F59E0B' };
      case 'cancelled':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#EF4444' };
      default:
        return { bg: '#F3F4F6', border: '#9CA3AF', text: '#6B7280' };
    }
  };

  // Filter functionality mapping logic
  const filteredCustomers = customers.filter(cust =>
    cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cust.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cust.phone || '').includes(searchQuery)
  );

  // ==================== SUB-VIEW A: MASTER CUSTOMER LIST LAYOUT ====================
  const renderMasterCustomerList = () => (
    <>
      {/* Top Header Row with Navigation Path Breadcrumbs & Global Search */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Customers</Text>
          </View>
          <Text style={styles.pageTitle}>Customer Management</Text>
          <Text style={styles.pageSubtitle}>Manage your Customers</Text>
        </View>

        {/* Universal Field Search Input component block */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Customer"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </View>

      {/* Loading and Error States */}
      {loading && (
        <View style={styles.centerMessage}>
          <Text style={styles.messageText}>Loading customers...</Text>
        </View>
      )}

      {error && (
        <View style={styles.centerMessage}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadCustomers(customersPagination.page)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <>
          {/* Filters Select Area Toolbar Section Line Row */}
          <View style={[styles.filterActionBar, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.leftSummaryCountGhostContainer} />

            {/* Desktop View - Show all filter dropdowns */}
            {!isMobile && (
              <View style={[styles.rightFiltersContainer, { flexWrap: 'wrap', justifyContent: 'flex-end' }]}>
                {/* State Filter Dropdown */}
                <View style={styles.miniDropdownCard}>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedRegion('');
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      color: '#4B5563',
                      cursor: 'pointer',
                      outline: 'none',
                      paddingRight: '20px',
                    }}
                  >
                    <option value="">All States</option>
                    {filterOptions.states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>

                {/* Region Filter Dropdown */}
                <View style={styles.miniDropdownCard}>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    disabled={!selectedState}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      color: selectedState ? '#4B5563' : '#9CA3AF',
                      cursor: selectedState ? 'pointer' : 'not-allowed',
                      outline: 'none',
                      paddingRight: '20px',
                    }}
                  >
                    <option value="">{selectedState ? 'All Regions' : 'Select State First'}</option>
                    {availableRegions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>

                {/* Occupation Filter Dropdown */}
                <View style={styles.miniDropdownCard}>
                  <select
                    value={selectedOccupation}
                    onChange={(e) => setSelectedOccupation(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      color: '#4B5563',
                      cursor: 'pointer',
                      outline: 'none',
                      paddingRight: '20px',
                    }}
                  >
                    <option value="">All Occupations</option>
                    {filterOptions.occupations.map((occupation) => (
                      <option key={occupation} value={occupation}>{occupation}</option>
                    ))}
                  </select>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>

                {/* Status Filter Dropdown */}
                <View style={styles.miniDropdownCard}>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      color: '#4B5563',
                      cursor: 'pointer',
                      outline: 'none',
                      paddingRight: '20px',
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                    <option value="pending">Pending</option>
                  </select>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </View>

                <TouchableOpacity 
                  style={styles.filterConfigButton} 
                  onPress={clearFilters}
                  title="Clear all filters"
                >
                  <RefreshIcon width={16} height={16} />
                </TouchableOpacity>
              </View>
            )}

            {/* Mobile View - Show only VectorIcon */}
            {isMobile && (
              <TouchableOpacity style={styles.filterIconBtn} onPress={() => setActionMenuVisible(!actionMenuVisible)}>
                <VectorIcon width={18} height={18} fill="#4B5563" />
              </TouchableOpacity>
            )}
          </View>

          {/* Action Menu Modal - Only for Mobile */}
          {isMobile && (
            <Modal
              transparent={true}
              visible={actionMenuVisible}
              animationType="none"
              onRequestClose={() => setActionMenuVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlayBackground} 
                activeOpacity={1} 
                onPress={() => setActionMenuVisible(false)}
              >
                <View style={styles.filterMenuDropdownCard}>
                  <Text style={styles.actionMenuHeaderText}>Filters</Text>
                  <ScrollView style={styles.filtersScrollContainer}>
                    {/* State Filter */}
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>State</Text>
                      <TouchableOpacity 
                        style={[
                          styles.actionMenuItemRow,
                          !selectedState && styles.actionMenuItemRowActive
                        ]}
                        onPress={() => {
                          setSelectedState('');
                          setSelectedRegion('');
                        }}
                      >
                        <Text style={[
                          styles.actionMenuItemText,
                          !selectedState && styles.actionMenuItemTextActive
                        ]}>
                          All States
                        </Text>
                        {!selectedState && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </TouchableOpacity>
                      {filterOptions.states.map((state) => (
                        <TouchableOpacity 
                          key={state}
                          style={[
                            styles.actionMenuItemRow,
                            selectedState === state && styles.actionMenuItemRowActive
                          ]}
                          onPress={() => {
                            setSelectedState(state);
                            setSelectedRegion('');
                          }}
                        >
                          <Text style={[
                            styles.actionMenuItemText,
                            selectedState === state && styles.actionMenuItemTextActive
                          ]}>
                            {state}
                          </Text>
                          {selectedState === state && <Text style={styles.checkmarkIcon}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Region Filter */}
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>Region</Text>
                      <TouchableOpacity 
                        style={[
                          styles.actionMenuItemRow,
                          !selectedRegion && styles.actionMenuItemRowActive,
                          !selectedState && styles.actionMenuItemRowDisabled
                        ]}
                        onPress={() => selectedState && setSelectedRegion('')}
                        disabled={!selectedState}
                      >
                        <Text style={[
                          styles.actionMenuItemText,
                          !selectedRegion && selectedState && styles.actionMenuItemTextActive,
                          !selectedState && styles.actionMenuItemTextDisabled
                        ]}>
                          {selectedState ? 'All Regions' : 'Select State First'}
                        </Text>
                        {!selectedRegion && selectedState && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </TouchableOpacity>
                      {availableRegions.map((region) => (
                        <TouchableOpacity 
                          key={region}
                          style={[
                            styles.actionMenuItemRow,
                            selectedRegion === region && styles.actionMenuItemRowActive,
                            !selectedState && styles.actionMenuItemRowDisabled
                          ]}
                          onPress={() => selectedState && setSelectedRegion(region)}
                          disabled={!selectedState}
                        >
                          <Text style={[
                            styles.actionMenuItemText,
                            selectedRegion === region && styles.actionMenuItemTextActive,
                            !selectedState && styles.actionMenuItemTextDisabled
                          ]}>
                            {region}
                          </Text>
                          {selectedRegion === region && <Text style={styles.checkmarkIcon}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Occupation Filter */}
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>Occupation</Text>
                      <TouchableOpacity 
                        style={[
                          styles.actionMenuItemRow,
                          !selectedOccupation && styles.actionMenuItemRowActive
                        ]}
                        onPress={() => setSelectedOccupation('')}
                      >
                        <Text style={[
                          styles.actionMenuItemText,
                          !selectedOccupation && styles.actionMenuItemTextActive
                        ]}>
                          All Occupations
                        </Text>
                        {!selectedOccupation && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </TouchableOpacity>
                      {filterOptions.occupations.map((occupation) => (
                        <TouchableOpacity 
                          key={occupation}
                          style={[
                            styles.actionMenuItemRow,
                            selectedOccupation === occupation && styles.actionMenuItemRowActive
                          ]}
                          onPress={() => setSelectedOccupation(occupation)}
                        >
                          <Text style={[
                            styles.actionMenuItemText,
                            selectedOccupation === occupation && styles.actionMenuItemTextActive
                          ]}>
                            {occupation}
                          </Text>
                          {selectedOccupation === occupation && <Text style={styles.checkmarkIcon}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Status Filter */}
                    <View style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>Status</Text>
                      <TouchableOpacity 
                        style={[
                          styles.actionMenuItemRow,
                          !selectedStatus && styles.actionMenuItemRowActive
                        ]}
                        onPress={() => setSelectedStatus('')}
                      >
                        <Text style={[
                          styles.actionMenuItemText,
                          !selectedStatus && styles.actionMenuItemTextActive
                        ]}>
                          All Status
                        </Text>
                        {!selectedStatus && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </TouchableOpacity>
                      {[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'blocked', label: 'Blocked' },
                        { value: 'pending', label: 'Pending' }
                      ].map((status) => (
                        <TouchableOpacity 
                          key={status.value}
                          style={[
                            styles.actionMenuItemRow,
                            selectedStatus === status.value && styles.actionMenuItemRowActive
                          ]}
                          onPress={() => setSelectedStatus(status.value)}
                        >
                          <Text style={[
                            styles.actionMenuItemText,
                            selectedStatus === status.value && styles.actionMenuItemTextActive
                          ]}>
                            {status.label}
                          </Text>
                          {selectedStatus === status.value && <Text style={styles.checkmarkIcon}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Clear Filters Button */}
                    <TouchableOpacity 
                      style={styles.clearFiltersButton} 
                      onPress={() => {
                        clearFilters();
                        setActionMenuVisible(false);
                      }}
                    >
                      <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Directory Customer Core Table Structure Card */}
          {/* Horizontal ScrollView wrapper keeps table columns readable on narrow screens */}
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.tableSummaryCountHeader}>
              <Text style={styles.summaryTotalCountText}>
                Total Customers: <Text style={styles.boldText}>{customersPagination.total || customers.length}</Text>
              </Text>
            </View>

            {/* Table Header Columns Setup */}
            <View style={styles.tableHeaderColumnsRow}>
              <Text style={[styles.headerCell, { flex: 2.2 }]}>Name ↕</Text>
              <Text style={[styles.headerCell, { flex: 2.2 }]}>Customer ID ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.8 }]}>Revenue (₹) ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.4 }]}>Bookings ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.8 }]}>State ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.6 }]}>Region ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.8 }]}>Joining Date ↕</Text>
            </View>

            {/* Dynamic Row Injection Loop */}
            {filteredCustomers.length > 0 ? filteredCustomers.map((row, index) => (
              <View key={row.uid} style={styles.tableBodyDataRow}>
                {/* Clickable Profile Navigation Trigger Link */}
                <TouchableOpacity 
                  style={[styles.profileAvatarCellGroup, { flex: 2.2 }]}
                  onPress={() => setSelectedCustomer(row)}
                >
                  <View style={styles.avatarCircleSurface}>
                    <Text style={styles.avatarInitialsText}>{getInitials(row.name)}</Text>
                  </View>
                  <Text style={[styles.bodyCell, styles.boldBodyCellText, styles.clickableProfileNameText]}>{row.name}</Text>
                </TouchableOpacity>

                <Text style={[styles.bodyCell, { flex: 2.2, color: '#4B5563' }]}>{row.uid}</Text>
                <Text style={[styles.bodyCell, { flex: 1.8, color: '#111827' }]}>{row.revenue}</Text>
                <Text style={[styles.bodyCell, { flex: 1.4, color: '#4B5563' }]}>{row.totalBookings || 0}</Text>
                <Text style={[styles.bodyCell, { flex: 1.8, color: '#111827' }]}>{row.state}</Text>
                <Text style={[styles.bodyCell, { flex: 1.6, color: '#111827' }]}>{row.region}</Text>
                <Text style={[styles.bodyCell, { flex: 1.8, color: '#4B5563' }]}>{row.joiningDate}</Text>
              </View>
            )) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No customers found</Text>
              </View>
            )}
          </View>
          </ScrollView>

          {/* Pagination Controls for Customer List */}
          <Pagination
            page={customersPagination.page}
            totalPages={customersPagination.totalPages || 1}
            totalCount={customersPagination.total}
            pageSize={customersPagination.limit}
            onPageChange={(newPage) => loadCustomers(newPage)}
            itemLabel="customers"
            alwaysShow={true}
          />
        </>
      )}
    </>
  );

  // ==================== SUB-VIEW B: DETAILED CUSTOMER PROFILE LAYOUT ====================
  const renderDetailedCustomerProfile = (customer: CustomerItem) => (
    <>
      {/* Top Header Segment with Path Traversal Breadcrumbs */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
              <Text style={styles.breadcrumbBackRouteLink}>Customers</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>{customer.name}</Text>
          </View>
          <Text style={styles.pageTitle}>Customer Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Managers</Text>
        </View>

        {/* User Avatar with Dropdown Menu */}
        <View style={styles.userAvatarContainer}>
          <TouchableOpacity 
            style={styles.userAvatarButton}
            onPress={() => setShowUserMenu(!showUserMenu)}
          >
            <View style={styles.userAvatarCircle}>
              <Text style={styles.userAvatarText}>
                {user?.displayName ? getInitials(user.displayName) : 'AD'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {showUserMenu && (
            <View style={styles.userDropdownMenu}>
              <View style={styles.userDropdownHeader}>
                <Text style={styles.userDropdownName}>{user?.displayName || user?.email || 'Admin'}</Text>
                <Text style={styles.userDropdownEmail}>{user?.email || ''}</Text>
                <Text style={styles.userDropdownRole}>{user?.role || 'admin'}</Text>
              </View>
              <View style={styles.userDropdownDivider} />
              <TouchableOpacity 
                style={styles.userDropdownItem}
                onPress={handleLogout}
              >
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.userDropdownItemText}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Back Button Action Link Trigger */}
      <TouchableOpacity style={styles.backButtonTouchBox} onPress={() => setSelectedCustomer(null)}>
        <Text style={styles.backButtonChevronSymbol}>←</Text>
        <Text style={styles.backButtonDescriptionText}>Back to Customers</Text>
      </TouchableOpacity>

      {/* Main Identity Profile Hero Card Section */}
      <View style={[styles.heroProfileIdentitySurfaceCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.heroLeftLayoutDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.largeHeroProfileAvatarCircle, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.largeHeroAvatarInitialsText}>{getInitials(customer.name)}</Text>
          </View>
          <View style={styles.heroProfileMetadataTextBlock}>
            <Text style={styles.heroProfileNameText}>{customer.name}</Text>
            <Text style={styles.heroProfileTitleRoleDescriptor}>Customer</Text>
            <View style={styles.heroPillBadgesLayoutRow}>
              <View style={styles.onlineStatusBadgePill}>
                <Text style={styles.onlineStatusBadgePillText}>Online</Text>
              </View>
              <View style={styles.regionalContextLocationPillBadge}>
                <Text style={styles.regionalContextLocationPillBadgeText}>{customer.state}</Text>
              </View>
              <View style={styles.regionalContextLocationPillBadge}>
                <Text style={styles.regionalContextLocationPillBadgeText}>{customer.region}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Destructive Administrative Profile Ban CTA Trigger */}
        <TouchableOpacity
          style={[
            styles.destructiveBanControlActionButton,
            customer.status === 'blocked' && styles.unbanButton,
            isMobile && { alignSelf: 'stretch', alignItems: 'center' }
          ]}
          onPress={() => handleBanCustomer(customer)}
        >
          <Text style={[
            styles.destructiveBanControlActionButtonText,
            customer.status === 'blocked' && styles.unbanButtonText
          ]}>
            {customer.status === 'blocked' ? 'Unban Customer' : 'Ban Customer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid Split Content Structure for Parameter Field Panels */}
      <View style={[styles.splitGridInfoCardBlocksFlexRowContainer, isMobile && { flexDirection: 'column', marginBottom: 12 }]}>

        {/* Panel Block Left: Profile Structured Parameters Metrics */}
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Profile Information</Text>

          <View style={styles.parameterMetricRowItemUnit}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Customer ID</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{customer.id}</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <BriefcaseIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Occupation</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>Farmer</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <LocationIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Region</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{customer.region}, {customer.state}</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <RupeeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Revenue Earned</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{customer.revenue}</Text>
            </View>
          </View>
        </View>

        {/* Panel Block Right: Operational Credentials Accounts Parameters Metrics */}
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Account Details</Text>

          <View style={styles.parameterMetricRowItemUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Joined Date</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>Jan 15, 2024</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <ActivityIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Last Active</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <EmailIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Email</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{customer.email || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <CallIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Mobile</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{customer.phone || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.parameterMetricRowItemUnit}>
            <SubAdminsIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.parameterTextBlock}>
              <Text style={styles.parameterHeaderDescriptorLabelText}>managed By</Text>
              <Text style={[styles.parameterCoreValueHeadlineText, styles.underlineTextActionLink]}>Sub-Admin Name</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Secondary Bookings/Tickets Sub-Tabs Navigation Segment Toolbar */}
      <View style={[styles.subTabsSegmentNavigatorToolbarRow, isMobile && { flexWrap: 'wrap', gap: 8 }]}>
        <TouchableOpacity 
          style={[styles.segmentTabItemToggleBox, activeProfileTab === 'Bookings' && styles.segmentTabItemToggleBoxActive]}
          onPress={() => setActiveProfileTab('Bookings')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, activeProfileTab === 'Bookings' && styles.segmentTabItemToggleLabelTextActive]}>
            Bookings ({customerBookings.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.segmentTabItemToggleBox, activeProfileTab === 'Tickets' && styles.segmentTabItemToggleBoxActive, isMobile && { marginRight: 0 }]}
          onPress={() => setActiveProfileTab('Tickets')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, activeProfileTab === 'Tickets' && styles.segmentTabItemToggleLabelTextActive]}>
            Support Tickets (05)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings Performance Audit History Data Table Sub-Section Container */}
      {isMobile ? (
        /* ── Mobile: Vertical booking cards ── */
        <View style={{ marginTop: 4 }}>
          {bookingsLoading ? (
            <View style={styles.centerMessage}>
              <Text style={styles.messageText}>Loading bookings...</Text>
            </View>
          ) : customerBookings.length === 0 ? (
            <View style={styles.centerMessage}>
              <Text style={styles.messageText}>No bookings found</Text>
            </View>
          ) : (
            customerBookings.map((booking) => {
              const statusStyle = getStatusBadgeStyle(booking.bookingStatus?.toLowerCase() || 'pending');
              const price = booking.price?.total || 0;
              const formattedPrice = price.toLocaleString('en-IN', { maximumFractionDigits: 0 });
              const serviceDate = new Date(booking.scheduledStart || booking.preferredDate).toLocaleDateString('en-GB');
              const locationText = `${booking.location?.village || ''}, ${booking.location?.state || ''}`.replace(/^,\s*/, '').trim();
              const bookingRef = (booking.bookingNumber || booking.bookingId || booking.id || 'N/A').substring(0, 15);

              return (
                <View key={booking.bookingId || booking.id} style={bookingCardStyles.card}>
                  {/* Card header: service name + status badge */}
                  <View style={bookingCardStyles.cardHeader}>
                    <Text style={bookingCardStyles.serviceName} numberOfLines={2}>
                      {formatServiceType(booking.serviceType?.toLowerCase() || 'service', booking.cropType || 'crop')}
                    </Text>
                    <View style={[bookingCardStyles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[bookingCardStyles.badgeText, { color: statusStyle.text }]}>
                        {(booking.bookingStatus || 'Pending').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                  </View>

                  {/* Card body: 2-column info grid */}
                  <View style={bookingCardStyles.grid}>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Booking ID</Text>
                      <Text style={bookingCardStyles.gridValue} numberOfLines={1}>{bookingRef}</Text>
                    </View>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Price (₹)</Text>
                      <Text style={bookingCardStyles.gridValue}>₹{formattedPrice}</Text>
                    </View>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Service Date</Text>
                      <Text style={bookingCardStyles.gridValue}>{serviceDate}</Text>
                    </View>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Location</Text>
                      <Text style={bookingCardStyles.gridValue} numberOfLines={2}>{locationText || 'Not specified'}</Text>
                    </View>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Fleet Manager</Text>
                      <Text style={bookingCardStyles.gridValue} numberOfLines={1}>{booking.fleetManagerId || 'Not Assigned'}</Text>
                    </View>
                    <View style={bookingCardStyles.gridItem}>
                      <Text style={bookingCardStyles.gridLabel}>Drone Pilot</Text>
                      <Text style={bookingCardStyles.gridValue} numberOfLines={1}>{booking.pilotId || 'Not Assigned'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Pagination */}
          <Pagination
            page={bookingsPagination.page}
            totalPages={bookingsPagination.totalPages || 1}
            totalCount={bookingsPagination.total}
            pageSize={bookingsPagination.limit}
            onPageChange={(newPage) => {
              if (selectedCustomer) {
                loadCustomerBookings(selectedCustomer.uid, newPage, bookingsPagination.limit);
              }
            }}
            itemLabel="bookings"
            alwaysShow={true}
          />
        </View>
      ) : (
        /* ── Desktop: horizontal scroll table ── */
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={[styles.tableCardContainer, { minWidth: 900 }]}>
            <View style={styles.tableHeaderColumnsRow}>
              <Text style={[styles.headerCell, { flex: 2.2 }]}>Service Name ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.4, textAlign: 'center' }]}>Status ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.8 }]}>Booking ID ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.2 }]}>Price (₹) ↕</Text>
              <Text style={[styles.headerCell, { flex: 2.4 }]}>Location ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.6 }]}>Service Date ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.8 }]}>Fleet Manager ↕</Text>
              <Text style={[styles.headerCell, { flex: 1.6 }]}>Drone Pilot ↕</Text>
            </View>

            {bookingsLoading ? (
              <View style={styles.centerMessage}>
                <Text style={styles.messageText}>Loading bookings...</Text>
              </View>
            ) : customerBookings.length === 0 ? (
              <View style={styles.centerMessage}>
                <Text style={styles.messageText}>No bookings found</Text>
              </View>
            ) : (
              customerBookings.map((booking) => {
                const statusStyle = getStatusBadgeStyle(booking.bookingStatus?.toLowerCase() || 'pending');
                const price = booking.price?.total || 0;
                const formattedPrice = price.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                const serviceDate = new Date(booking.scheduledStart || booking.preferredDate).toLocaleDateString('en-GB');
                const locationText = `${booking.location?.village || ''}, ${booking.location?.state || ''}`.trim();

                return (
                  <View key={booking.bookingId || booking.id} style={styles.tableBodyDataRow}>
                    <Text style={[styles.bodyCell, { flex: 2.2, fontWeight: '600', color: '#1F2937' }]}>
                      {formatServiceType(booking.serviceType?.toLowerCase() || 'service', booking.cropType || 'crop')}
                    </Text>
                    <View style={{ flex: 1.4, alignItems: 'center' }}>
                      <View style={[styles.progressStatusBadgePill, {
                        backgroundColor: statusStyle.bg,
                        borderColor: statusStyle.border
                      }]}>
                        <Text style={[styles.progressStatusBadgePillText, { color: statusStyle.text }]}>
                          {(booking.bookingStatus || 'Pending').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.8, color: '#4B5563' }]} numberOfLines={1}>
                      {(booking.bookingNumber || booking.bookingId || booking.id || 'N/A').substring(0, 15)}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.2, color: '#111827' }]}>{formattedPrice}</Text>
                    <Text style={[styles.bodyCell, { flex: 2.4, color: '#4B5563' }]} numberOfLines={1}>{locationText || 'Not specified'}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.6, color: '#111827' }]}>{serviceDate}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.8, color: '#111827' }]}>{booking.fleetManagerId || 'Not Assigned'}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.6, color: '#111827' }]}>{booking.pilotId || 'Not Assigned'}</Text>
                  </View>
                );
              })
            )}

            <Pagination
              page={bookingsPagination.page}
              totalPages={bookingsPagination.totalPages || 1}
              totalCount={bookingsPagination.total}
              pageSize={bookingsPagination.limit}
              onPageChange={(newPage) => {
                if (selectedCustomer) {
                  loadCustomerBookings(selectedCustomer.uid, newPage, bookingsPagination.limit);
                }
              }}
              itemLabel="bookings"
              alwaysShow={true}
            />
          </View>
        </ScrollView>
      )}
    </>
  );

  return (
    <View style={styles.appMasterContainerViewWrapper}>
      {/* ==================== LEFT NAVIGATION SIDEBAR MENU PANEL ==================== */}
      {/*<View style={styles.sidebarContainer}>
        <View style={styles.sidebarBrandHeader}>
          <Text style={styles.sidebarBrandIcon}>❄️</Text>
          <Text style={styles.sidebarBrandTitleText}>Hawk Aerosystem</Text>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { icon: '📊', label: 'Dashboard', active: false },
            { icon: '👤', label: 'Admin', active: false },
            { icon: '👥', label: 'Sub-Admins', active: false },
            { icon: '💼', label: 'Customers', active: true },
            { icon: '📈', label: 'Sales Aggregators', active: false },
            { icon: '✈️', label: 'Pilots', active: false },
            { icon: '🚚', label: 'Fleet Management', active: false },
            { icon: '📅', label: 'Bookings', active: false },
            { icon: '💰', label: 'Revenue', active: false },
            { icon: '🏪', label: 'Marketplace Management', active: false },
            { icon: '🔧', label: 'Technician Management', active: false },
            { icon: '🏢', label: 'Service Centre', active: false },
            { icon: '⚠️', label: 'Incidents', active: false }
          ].map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.sidebarMenuLinkRow, item.active && styles.sidebarMenuLinkRowActive]}
            >
              <Text style={[styles.sidebarMenuLinkIcon, item.active && styles.sidebarMenuLinkTextActive]}>{item.icon}</Text>
              <Text style={[styles.sidebarMenuLinkText, item.active && styles.sidebarMenuLinkTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>*/}

      {/* ==================== MAIN CORE CONTENT CANVAS AREA ==================== */}
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
        {selectedCustomer ? renderDetailedCustomerProfile(selectedCustomer) : renderMasterCustomerList()}
      </ScrollView>
    </View>
  );
}

// --- Mobile Booking Card Styles ---
const bookingCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  gridLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
});

// --- Layout Sheet Configurations ---
const styles = StyleSheet.create({
  appMasterContainerViewWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  sidebarContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 24,
    paddingHorizontal: 14,
  },
  sidebarBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  sidebarBrandIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#4F46E5',
  },
  sidebarBrandTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  sidebarMenuLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarMenuLinkRowActive: {
    backgroundColor: '#535CE8',
  },
  sidebarMenuLinkIcon: {
    fontSize: 15,
    marginRight: 12,
    color: '#64748B',
    width: 20,
  },
  sidebarMenuLinkText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  sidebarMenuLinkTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  contentContainer: {
    padding: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleIconPadding: {
    marginRight: 8,
  },
  breadcrumbHome: {
    fontSize: 12,
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 11,
  },
  breadcrumbBackRouteLink: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    width: 280,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  searchIcon: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  filterActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  leftSummaryCountGhostContainer: {
    flex: 1,
  },
  rightFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniDropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  dropdownText: {
    fontSize: 12,
    color: '#4B5563',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#6B7280',
    position: 'absolute',
    right: 12,
    pointerEvents: 'none',
  },
  filterConfigButton: {
    marginLeft: 10,
    padding: 2,
  },
  tableCardContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  tableSummaryCountHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryTotalCountText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  tableHeaderColumnsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableBodyDataRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  bodyCell: {
    fontSize: 13,
  },
  boldBodyCellText: {
    fontWeight: '600',
    marginLeft: 10,
    color: '#111827',
  },
  clickableProfileNameText: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  profileAvatarCellGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircleSurface: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  backButtonTouchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonChevronSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginRight: 6,
  },
  backButtonDescriptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  heroProfileIdentitySurfaceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLeftLayoutDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeHeroProfileAvatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  largeHeroAvatarInitialsText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroProfileMetadataTextBlock: {
    justifyContent: 'center',
  },
  heroProfileNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  heroProfileTitleRoleDescriptor: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  heroPillBadgesLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatusBadgePill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  onlineStatusBadgePillText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  regionalContextLocationPillBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 6,
  },
  regionalContextLocationPillBadgeText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  destructiveBanControlActionButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  destructiveBanControlActionButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  splitGridInfoCardBlocksFlexRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridFlexibleInfoPanelCardItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
  },
  gridPanelSectionHeadingTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingBottom: 8,
  },
  parameterMetricRowItemUnit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  parameterTextBlock: {
    flex: 1,
  },
  parameterItemSymbolIconIndicator: {
    fontSize: 16,
    marginRight: 14,
    color: '#6B7280',
    width: 24,
    textAlign: 'center',
  },
  parameterHeaderDescriptorLabelText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  parameterCoreValueHeadlineText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  underlineTextActionLink: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  subTabsSegmentNavigatorToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  segmentTabItemToggleBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  segmentTabItemToggleBoxActive: {
    backgroundColor: '#535CE8',
  },
  segmentTabItemToggleLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  segmentTabItemToggleLabelTextActive: {
    color: '#FFFFFF',
  },
  progressStatusBadgePill: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    width: 90,
    alignItems: 'center',
  },
  progressStatusBadgePillText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  messageText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noDataContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  unbanButton: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  unbanButtonText: {
    color: '#10B981',
  },
  
  // User Avatar and Dropdown Styles
  userAvatarContainer: {
    position: 'relative',
    marginLeft: 16,
  },
  userAvatarButton: {
    cursor: 'pointer' as any,
  },
  userAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userDropdownMenu: {
    position: 'absolute' as any,
    top: 48,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 220,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userDropdownHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userDropdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userDropdownEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  userDropdownRole: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize' as any,
  },
  userDropdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  userDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    cursor: 'pointer' as any,
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  userDropdownItemText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 140,
    paddingRight: 24,
  },
  filterMenuDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 280,
    maxWidth: 320,
    maxHeight: 600,
    overflow: 'hidden',
  },
  actionMenuHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filtersScrollContainer: {
    maxHeight: 540,
  },
  filterSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  actionMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionMenuItemRowActive: {
    backgroundColor: '#EFF6FF',
  },
  actionMenuItemRowDisabled: {
    opacity: 0.5,
  },
  actionMenuItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  actionMenuItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  actionMenuItemTextDisabled: {
    color: '#9CA3AF',
  },
  checkmarkIcon: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
    marginLeft: 8,
  },
  clearFiltersButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
