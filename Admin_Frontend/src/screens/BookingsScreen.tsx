import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions, Modal } from 'react-native';
import { bookingApi, type Booking, type EnrichedBooking, type BookingAnalytics, type BookingAnalyticsFilter } from '../api/booking.api';
import { showAlert, showConfirm } from '../utils/dialog';
import { pilotApi } from '../api/pilot.api';
import { customerApi } from '../api/customer.api';
import { fleetApi } from '../api/fleet.api';
import { useSocket, CLIENT_EVENTS } from '../context/SocketContext';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeSearchQuery, detectInjectionAttempt, logSuspiciousActivity } from '../utils/inputSanitization';
import Svg, { Line, Text as SvgText, Polyline, Circle, G } from 'react-native-svg';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import PersonIcon from '../assets/icons/person-icon.svg';
import LocationIcon from '../assets/icons/LocationIcon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import DroneIcon from '../assets/icons/DroneIcon.svg';
import CalendarIcon from '../assets/icons/CalendarIcon.svg';
import PilotIcon from '../assets/icons/PilotIcon.svg';
import CheckCircleIcon from '../assets/icons/CheckCircleIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

export default function BookingsScreen() {
  // Navigation View Router State
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeSubTab, setActiveSubTab] = useState<'Active' | 'Upcoming' | 'Completed' | 'Pending Approval'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Debounce search query to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // API Data State
  const [bookingsListData, setBookingsListData] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Analytics filter state
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterQuarter, setFilterQuarter] = useState<number | undefined>(undefined);
  const [filterService, setFilterService] = useState<string | undefined>(undefined);
  const [filterState, setFilterState] = useState<string | undefined>(undefined);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [approvalBooking, setApprovalBooking] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [autoAssignToggle, setAutoAssignToggle] = useState(true);

  // Manual assignment state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [fleetManagers, setFleetManagers] = useState<any[]>([]);
  const [assignPilots, setAssignPilots] = useState<any[]>([]);
  const [assignDrones, setAssignDrones] = useState<any[]>([]);
  const [selectedFleetManager, setSelectedFleetManager] = useState<string>('');
  const [selectedPilot, setSelectedPilot] = useState<string>('');
  const [selectedDrone, setSelectedDrone] = useState<string>('');

  // Socket for real-time updates
  const { on } = useSocket();

  // Pagination State
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([null]); // Track cursor history for back navigation
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 50;

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const filter: BookingAnalyticsFilter = { year: filterYear };
      if (filterQuarter) filter.quarter = filterQuarter;
      if (filterService) filter.serviceType = filterService;
      if (filterState) filter.state = filterState;
      const res = await bookingApi.getAnalytics(filter);
      const data = (res.data as any)?.data ?? res.data;
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filterYear, filterQuarter, filterService, filterState]);

  // Load bookings from API on mount, tab change, or search change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Socket event subscriptions for real-time updates
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(on(CLIENT_EVENTS.BOOKING_CREATED, () => loadBookingsFromAPI(currentCursor)));
    unsubs.push(on(CLIENT_EVENTS.BOOKING_ASSIGNED, () => loadBookingsFromAPI(currentCursor)));
    unsubs.push(on(CLIENT_EVENTS.BOOKING_STATUS, () => loadBookingsFromAPI(currentCursor)));
    unsubs.push(on(CLIENT_EVENTS.BOOKING_CANCELLED, () => loadBookingsFromAPI(currentCursor)));
    unsubs.push(on(CLIENT_EVENTS.PAYMENT_CONFIRMED, () => loadBookingsFromAPI(currentCursor)));
    return () => { unsubs.forEach(u => u()); };
  }, [on, activeSubTab, debouncedSearch]);

  useEffect(() => {
    // Reset pagination when tab or search changes
    setCurrentCursor(null);
    setPageHistory([null]);
    setCurrentPageNum(1);
    loadBookingsFromAPI(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, debouncedSearch]);

  const loadBookingsFromAPI = async (cursor: string | null = null) => {
    try {
      setLoading(true);

      // Sanitize search input
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';

      // Detect injection attempts
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'BookingsScreen search');
        Alert.alert('Invalid Input', 'Please enter a valid search query');
        setSearchQuery('');
        setIsSearching(false);
        setLoading(false);
        return;
      }

      // Map tab to status filter + adminApprovalStatus filter
      // "Active" includes both confirmed (approved, awaiting/in mission) and
      // in_progress bookings. "Upcoming" shows bookings still pending/scheduled.
      const statusFilters: Record<string, { status: string; adminApprovalStatus?: string }> = {
        'Active': { status: 'confirmed,in_progress' },
        'Upcoming': { status: 'pending' },
        'Completed': { status: 'completed' },
        'Pending Approval': { status: 'pending', adminApprovalStatus: 'pending' }
      };

      const tabFilter = statusFilters[activeSubTab];

      console.log(`🔄 Loading bookings for tab: ${activeSubTab}, status: ${tabFilter.status}, approvalStatus: ${tabFilter.adminApprovalStatus || 'all'}, cursor: ${cursor}`);

      const response = await bookingApi.getAll({
        status: tabFilter.status,
        adminApprovalStatus: tabFilter.adminApprovalStatus,
        limit: itemsPerPage,
        cursor: cursor || undefined,
        search: sanitizedSearch || undefined,
      });

      console.log('📦 Full API Response:', JSON.stringify(response, null, 2));

      // Extract data from ApiResponse wrapper - API client now auto-unwraps { success, data }
      const bookingsData = response.data;

      console.log('📦 API Response:', response.data);
      console.log('📦 Extracted bookingsData:', bookingsData);
      console.log('📦 bookingsData.items type:', typeof bookingsData?.items);
      console.log('📦 bookingsData.items length:', bookingsData?.items?.length);

      if (bookingsData && bookingsData.items) {
        console.log(`✅ Loaded ${bookingsData.items.length} bookings from API`);

        // Update pagination state
        setTotalItems(bookingsData.meta?.total || 0);
        setHasMore(bookingsData.meta?.hasMore || false);
        setCurrentCursor(cursor);
        setNextPageCursor(bookingsData.meta?.nextCursor || null);

        console.log('📊 Pagination state:', {
          total: bookingsData.meta?.total,
          hasMore: bookingsData.meta?.hasMore,
          itemsCount: bookingsData.items.length
        });

        if (bookingsData.items.length > 0) {
          // Convert API bookings to table format
          const tableData = bookingsData.items.map((booking: Booking, idx: number) => {
            console.log(`🔍 Processing booking ${idx}:`, booking.id, booking.serviceType, booking.status);

            // Format service type for display
            const serviceTypeMap: Record<string, string> = {
              'spraying': 'Pesticide Spraying',
              'seeding': 'Seed Planting',
              'monitoring': 'Field Monitoring',
              'surveying': 'Aerial Surveying',
              'mapping': 'Field Mapping',
            };
            const serviceName = serviceTypeMap[booking.serviceType?.toLowerCase()] || booking.serviceType || 'Unknown Service';

            // Format location for customer display
            let customerDisplay = 'Unknown Location';
            if (booking.address && typeof booking.address === 'object' && 'village' in booking.address) {
              const addr = booking.address as any;
              customerDisplay = addr.village && addr.state
                ? `${addr.village}, ${addr.state}`
                : addr.district || addr.state || 'Location';
            } else if (booking.location && typeof booking.location === 'object' && 'village' in booking.location) {
              const loc = booking.location as any;
              customerDisplay = loc.village && loc.state
                ? `${loc.village}, ${loc.state}`
                : loc.district || loc.state || 'Location';
            } else if (typeof booking.address === 'string' && booking.address) {
              customerDisplay = booking.address.substring(0, 30) + (booking.address.length > 30 ? '...' : '');
            } else if (booking.customerUid) {
              customerDisplay = booking.customerUid.substring(0, 15) + '...';
            }

            // Format price
            let formattedPrice = '₹0';
            if (booking.finalPrice) {
              formattedPrice = `₹${booking.finalPrice.toLocaleString('en-IN')}`;
            } else if (booking.priceEstimation) {
              formattedPrice = `₹${booking.priceEstimation.toLocaleString('en-IN')}`;
            }

            // Format date
            const dateStr = booking.scheduledDate
              ? new Date(booking.scheduledDate).toLocaleDateString('en-GB')
              : 'N/A';

            // Format status for display
            const statusDisplay = booking.status
              ? booking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              : 'Unknown';

            return {
              service: `${serviceName} - ${booking.cropType || 'Crop'}`,
              customer: customerDisplay,
              id: booking.id || 'N/A',
              status: statusDisplay,
              price: formattedPrice,
              date: dateStr,
              fleetManager: booking.vendorId || 'Not Assigned',
              pilot: booking.assignedPilotName || booking.assignedPilot || 'Not Assigned',
              fullBooking: booking
            };
          });

          console.log('✅ Transformed bookings:', tableData);
          console.log('✅ Setting bookingsListData with', tableData.length, 'items');
          setBookingsListData(tableData);
          console.log(`✅ Transformed ${tableData.length} bookings for display`);
        } else {
          console.log('⚠️ No items in bookingsData.items, setting empty array');
          setBookingsListData([]);
          console.log('ℹ️  No bookings found for this filter');
        }
      } else {
        console.log('❌ No bookingsData or bookingsData.items, setting empty');
        setBookingsListData([]);
        setTotalItems(0);
        setHasMore(false);
        console.log('ℹ️  No bookings data in response');
      }
    } catch (err: any) {
      console.error('❌ Failed to load bookings from API:', err);
      console.error('❌ Error details:', err.message, err.stack);
      setBookingsListData([]);
      setTotalItems(0);
      setHasMore(false);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleNextPage = () => {
    if (hasMore && nextPageCursor) {
      setPageHistory([...pageHistory, nextPageCursor]);
      setCurrentPageNum(currentPageNum + 1);
      loadBookingsFromAPI(nextPageCursor);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageNum > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop(); // Remove current cursor
      const previousCursor = newHistory[newHistory.length - 1] || null;
      setPageHistory(newHistory);
      setCurrentPageNum(currentPageNum - 1);
      loadBookingsFromAPI(previousCursor);
    }
  };

  const handleCancelBooking = async () => {
    console.log('🚫 handleCancelBooking called');
    console.log('📋 selectedBooking:', selectedBooking);

    if (!selectedBooking) {
      console.log('❌ No selected booking');
      showAlert('Error: No booking selected');
      return;
    }

    console.log('✅ Showing confirmation dialog for booking:', selectedBooking.id);

    // Cross-platform confirm (web + native)
    const confirmed = await showConfirm(
      `Are you sure you want to cancel booking ${selectedBooking.id}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      console.log('❌ User cancelled the cancellation');
      return;
    }

    try {
      console.log('🚫 User confirmed cancellation');
      setDetailLoading(true);
      console.log('🚫 Cancelling booking:', selectedBooking.id);

      const response = await bookingApi.cancel(selectedBooking.id, 'Cancelled by admin');
      const cancelledBooking = response.data;

      console.log('✅ Booking cancelled:', cancelledBooking);

      showAlert('Success: Booking has been cancelled successfully');

      // Go back to list and refresh
      setViewMode('list');
      setSelectedBooking(null);
      loadBookingsFromAPI(currentCursor);
    } catch (err: any) {
      console.error('❌ Failed to cancel booking:', err);
      console.error('❌ Error response:', err.response?.data);
      showAlert(`Error: ${err.response?.data?.message || 'Failed to cancel booking. Please try again.'}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveBooking = async () => {
    if (!approvalBooking) return;
    console.log('[Bookings] Approve clicked for:', approvalBooking.id);
    try {
      setDetailLoading(true);
      const res = await bookingApi.adminApprove(approvalBooking.id, autoAssignToggle);
      console.log('[Bookings] Approve API response:', res);
      showAlert('Success: Booking approved successfully');
      setApprovalModalVisible(false);
      setApprovalBooking(null);
      loadBookingsFromAPI(currentCursor);
    } catch (err: any) {
      console.error('[Bookings] Approve error:', err);
      showAlert(`Error: ${err.message || 'Failed to approve booking'}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!approvalBooking) return;
    if (!rejectReason.trim()) {
      showAlert('Please provide a reason for rejection');
      return;
    }
    try {
      setDetailLoading(true);
      const res = await bookingApi.adminReject(approvalBooking.id, rejectReason);
      console.log('[Bookings] Reject API response:', res);
      showAlert('Success: Booking rejected');
      setRejectModalVisible(false);
      setApprovalBooking(null);
      setRejectReason('');
      loadBookingsFromAPI(currentCursor);
    } catch (err: any) {
      console.error('[Bookings] Reject error:', err);
      showAlert(`Error: ${err.message || 'Failed to reject booking'}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const isPilotAvailableFor = (pilot: any, booking: EnrichedBooking) => {
    const status = String(pilot.status || '').toLowerCase();
    if (status && !['active', 'available'].includes(status)) return false;
    if (pilot.currentBookingId || pilot.currentMissionId) return false;
    const serviceTypes = pilot.serviceTypes || [];
    if (
      serviceTypes.length > 0 &&
      booking.serviceType &&
      !serviceTypes.includes(booking.serviceType) &&
      !serviceTypes.includes('multi_purpose')
    ) {
      return false;
    }
    return true;
  };

  const isDroneAvailableFor = (drone: any, booking: EnrichedBooking) => {
    const status = String(drone.status || '').toLowerCase();
    if (status && !['deployable', 'available', 'active', 'ready'].includes(status)) return false;
    if (drone.currentBookingId && drone.currentBookingId !== booking.id) return false;
    if (
      booking.serviceType &&
      drone.type &&
      drone.type !== 'multi_purpose' &&
      drone.type !== booking.serviceType
    ) {
      return false;
    }
    return true;
  };

  // ⭐ Manual assignment: admin/super-admin can assign fleet manager, pilot and
  // drone to a booking. Only compatible + available resources are shown.
  const openAssignModal = async (booking: EnrichedBooking) => {
    setAssignModalVisible(true);
    setAssignLoading(true);
    setSelectedFleetManager(booking.fleetManagerUid || '');
    setSelectedPilot(booking.assignedPilot || '');
    setSelectedDrone(booking.assignedDrone || '');
    try {
      const [fmRes, pilotRes, droneRes] = await Promise.allSettled([
        fleetApi.getFleetManagers(),
        pilotApi.getAll({ limit: 100 }),
        fleetApi.getDrones(),
      ]);
      if (fmRes.status === 'fulfilled') {
        const fmData = fmRes.value.data;
        const fms = Array.isArray(fmData) ? fmData : (fmData as any)?.data || (fmData as any)?.items || [];
        setFleetManagers(fms.filter((fm: any) => fm.status === 'active' || fm.status === undefined));
      }
      if (pilotRes.status === 'fulfilled') {
        const pData = pilotRes.value.data;
        const pilots = Array.isArray(pData) ? pData : (pData as any)?.data || (pData as any)?.items || [];
        setAssignPilots(pilots.filter((p: any) => isPilotAvailableFor(p, booking)));
      }
      if (droneRes.status === 'fulfilled') {
        const dData = droneRes.value.data;
        const drones = Array.isArray(dData) ? dData : (dData as any)?.items || (dData as any)?.data || [];
        setAssignDrones(drones.filter((d: any) => isDroneAvailableFor(d, booking)));
      }
    } catch (err) {
      console.error('Failed to load assign options', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedBooking) return;
    if (!selectedFleetManager && !selectedPilot && !selectedDrone) return;
    setAssignSaving(true);
    try {
      const payload: any = {};
      if (selectedFleetManager) payload.fleetManagerUid = selectedFleetManager;
      if (selectedPilot) payload.assignedPilot = selectedPilot;
      if (selectedDrone) payload.assignedDrone = selectedDrone;
      await bookingApi.adminAssign(selectedBooking.id, payload);
      showAlert('Success: Resources assigned successfully');
      setAssignModalVisible(false);
      setSelectedBooking(null);
      setViewMode('list');
      loadBookingsFromAPI(currentCursor);
    } catch (err: any) {
      console.error('Assign failed', err);
      showAlert(`Error: ${err.message || 'Failed to assign resources'}`);
    } finally {
      setAssignSaving(false);
    }
  };

  const loadBookingDetailFromAPI = async (bookingId: string, fullBooking?: Booking) => {    try {
      setDetailLoading(true);

      console.log('📋 Loading booking detail for:', bookingId);

      // Fetch booking details - handle nested API response
      let bookingResponse: Booking;
      if (fullBooking) {
        bookingResponse = fullBooking;
      } else {
        const response = await bookingApi.getById(bookingId);
        bookingResponse = response.data;
      }

      console.log('📋 Booking detail loaded:', bookingResponse);

      // Enrich with related data
      const enriched: EnrichedBooking = { ...bookingResponse };

      // Fetch customer details
      if (bookingResponse.customerUid) {
        try {
          console.log('👤 Fetching customer:', bookingResponse.customerUid);

          // Validate customerUid format - skip if it looks invalid
          if (bookingResponse.customerUid.startsWith('phone:') || bookingResponse.customerUid.length < 10) {
            console.warn('⚠️ Invalid customerUid format:', bookingResponse.customerUid);
          } else {
            const customerResponse = await customerApi.getById(bookingResponse.customerUid);
            const customer = customerResponse.data;
            console.log('👤 Customer loaded:', customer);

            enriched.customer = {
              uid: customer.uid,
              name: customer.name || 'Unknown',
              email: customer.email,
              phone: customer.phone
            };
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch customer:', err);
        }
      }

      // Fetch pilot details
      if (bookingResponse.assignedPilot) {
        try {
          console.log('✈️ Fetching pilot:', bookingResponse.assignedPilot);

          // Validate pilot ID format - should be like PLT001 or a valid UID
          if (bookingResponse.assignedPilot.match(/^pilot_\d+$/)) {
            console.warn('⚠️ Invalid pilot ID format (old format):', bookingResponse.assignedPilot);
          } else {
            const pilotResponse = await pilotApi.getById(bookingResponse.assignedPilot);
            const pilot = pilotResponse.data;
            console.log('✈️ Pilot loaded:', pilot);

            enriched.pilot = {
              pilotId: pilot.pilotId,
              fullName: pilot.fullName,
              mobile: pilot.mobile,
              email: pilot.email
            };

            // Fetch fleet manager through pilot
            if (pilot.assignedFleetManagerId) {
              try {
                console.log('🚁 Fetching fleet manager:', pilot.assignedFleetManagerId);
                const fmResponse = await pilotApi.getFleetManager(pilot.pilotId);
                const fm = fmResponse.data;
                console.log('🚁 Fleet manager loaded:', fm);
                enriched.fleetManager = {
                  fleetManagerId: fm.fleetManagerId,
                  fullName: fm.fullName,
                  mobile: fm.mobile,
                  email: fm.email
                };
              } catch (err) {
                console.warn('⚠️ Failed to fetch fleet manager:', err);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Failed to fetch pilot:', err);
        }
      }

      // Fetch drone details
      if (bookingResponse.assignedDrone) {
        try {
          console.log('🚁 Fetching drone:', bookingResponse.assignedDrone);
          const droneResponse = await fleetApi.getDrone(bookingResponse.assignedDrone);
          const drone = droneResponse.data;
          console.log('🚁 Drone loaded:', drone);

          enriched.drone = {
            id: drone.id,
            model: drone.model,
            serialNumber: drone.serialNumber,
            status: drone.status,
          };
        } catch (err) {
          console.warn('⚠️ Failed to fetch drone:', err);
        }
      }

      console.log('✅ Enriched booking data:', enriched);

      // Fetch booking metadata (progress, weather, restrictions)
      try {
        console.log('📊 Fetching booking metadata...');
        const metadataResponse = await bookingApi.getMetadata(bookingId);
        const metadata = metadataResponse.data;
        console.log('📊 Metadata loaded:', metadata);

        // Add metadata to enriched booking
        (enriched as any).metadata = metadata;
      } catch (err) {
        console.warn('⚠️ Failed to fetch booking metadata:', err);
      }

      setSelectedBooking(enriched);
      setViewMode('detail');
    } catch (err: any) {
      console.error('❌ Failed to load booking detail:', err);
      Alert.alert('Error', 'Failed to load booking details. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  // --- RENDER SCREEN: BOOKING DETAILS (image_21a38b.png) ---
  const renderBookingDetailScreen = () => {
    // Use enriched booking data if available, otherwise show placeholder
    const booking = selectedBooking;
    const hasApiData = !!booking;

    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Top Header Breadcrumbs Area */}
      {/* Stacks path traversals and action options on mobile */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 12 }}>
          <View style={[styles.breadcrumbContainer, isMobile && { flexWrap: 'wrap' }]}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Bookings</Text>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={[styles.breadcrumbActive, { color: '#6B7280' }]}>
              Booking ID: {hasApiData ? booking.id.substring(0, 12) + '...' : 'PFS-12345'}
            </Text>
          </View>
          <Text style={styles.pageTitle}>Bookings Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Bookings</Text>
        </View>

        <TouchableOpacity style={[styles.backButton, isMobile && { alignSelf: 'flex-start' }]} onPress={() => setViewMode('list')}>
          <Text style={styles.backButtonText}>← Back to Bookings</Text>
        </TouchableOpacity>
      </View>

      {detailLoading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>Loading booking details...</Text>
        </View>
      ) : (
        <>
          {/* Stakeholder Identity Profile Grid Row Block */}
          {/* Profiles flow linearly to maximize spacing width efficiency on mobile */}
          <View style={[styles.stakeholderGrid, isMobile && { flexDirection: 'column' }]}>
            {/* Customer Identity Module */}
            <View style={[styles.stakeholderCard, isMobile && { width: '100%', marginBottom: 12 }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {booking?.customer?.name ? booking.customer.name.substring(0, 2).toUpperCase() : booking?.customerUid ? booking.customerUid.substring(0, 2).toUpperCase() : 'CU'}
                </Text>
              </View>
              <View style={styles.stakeholderInfo}>
                <Text style={styles.stakeholderName}>
                  {booking?.customer?.name || 'Customer'}
                </Text>
                <Text style={styles.stakeholderRole}>Customer</Text>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.customer?.email || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.customer?.phone || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.customerUid ? booking.customerUid.substring(0, 20) + '...' : 'Not available'}</Text>
                </View>
              </View>
            </View>

            {/* Pilot Identity Module */}
            <View style={[styles.stakeholderCard, isMobile && { width: '100%', marginBottom: 12 }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {booking?.pilot?.fullName ? booking.pilot.fullName.substring(0, 2).toUpperCase() : booking?.assignedPilot ? booking.assignedPilot.substring(0, 2) : 'PL'}
                </Text>
              </View>
              <View style={styles.stakeholderInfo}>
                <Text style={styles.stakeholderName}>
                  {booking?.pilot?.fullName || booking?.assignedPilot || 'Not Assigned'}
                </Text>
                <Text style={styles.stakeholderRole}>Pilot</Text>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.pilot?.email || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.pilot?.mobile || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PilotIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.pilot?.pilotId || booking?.assignedPilot || 'Not available'}</Text>
                </View>
              </View>
            </View>

            {/* Fleet Manager Identity Module */}
            <View style={[styles.stakeholderCard, isMobile && { width: '100%', marginBottom: 12 }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {booking?.fleetManager?.fullName ? booking.fleetManager.fullName.substring(0, 2).toUpperCase() : booking?.vendorId ? booking.vendorId.substring(0, 2) : 'FM'}
                </Text>
              </View>
              <View style={styles.stakeholderInfo}>
                <Text style={styles.stakeholderName}>
                  {booking?.fleetManager?.fullName || booking?.vendorId || 'Not Assigned'}
                </Text>
                <Text style={styles.stakeholderRole}>Fleet Manager</Text>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.fleetManager?.email || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.fleetManager?.mobile || 'Not available'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.fleetManager?.fleetManagerId || booking?.vendorId || 'Not available'}</Text>
                </View>
              </View>
            </View>

            {/* Drone Hardware Lifecycle Asset Module */}
            <View style={[styles.stakeholderCard, isMobile && { width: '100%', marginBottom: 0 }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {booking?.drone?.model ? booking.drone.model.substring(0, 2).toUpperCase() : booking?.assignedDrone ? booking.assignedDrone.substring(0, 2) : 'DR'}
                </Text>
              </View>
              <View style={styles.stakeholderInfo}>
                <Text style={styles.stakeholderName}>
                  {booking?.drone?.model || booking?.assignedDrone || 'Not Assigned'}
                </Text>
                <Text style={styles.stakeholderRole}>Drone</Text>
                <View style={styles.infoRow}>
                  <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.stakeholderMeta}>{booking?.drone?.serialNumber || booking?.assignedDrone || 'Not available'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Central Booking Metadata Grid Layout */}
          {/* Parameters flex row breaks safely to stack descriptions on mobile */}
          <View style={styles.detailMetadataCard}>
            <Text style={styles.detailCardTitle}>Booking Details</Text>
            <View style={[styles.metaFlexGrid, isMobile && { flexDirection: 'column' }]}>
              <View style={[styles.metaColumn, isMobile && { marginRight: 0, marginBottom: 12 }]}>
                <View style={styles.infoRow}>
                  <CheckCircleIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Booking ID: <Text style={styles.boldValue}>
                      {booking?.id || 'Not available'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <LocationIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Location: <Text style={styles.boldValue}>
                      {booking && typeof booking.address === 'object' && 'village' in booking.address
                        ? `${booking.address.village}, ${booking.address.district}, ${booking.address.state}`
                        : booking && typeof booking.address === 'string'
                        ? booking.address
                        : 'Location unavailable'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Acres: <Text style={styles.boldValue}>
                      {booking?.area ? `${booking.area.value} ${booking.area.unit}` : 'Not available'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Drone Tier: <Text style={styles.boldValue}>
                      {booking?.droneTier || 'Not specified'}
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={[styles.metaColumn, isMobile && { marginRight: 0, marginBottom: 12 }]}>
                <View style={styles.infoRow}>
                  <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Service: <Text style={styles.boldValue}>
                      {booking?.serviceType || 'Not specified'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Crop: <Text style={styles.boldValue}>
                      {booking?.cropType || 'Not specified'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <CheckCircleIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Amount: <Text style={styles.boldValue}>
                      {booking ? `₹${(booking.finalPrice || booking.priceEstimation || 0).toLocaleString('en-IN')}` : '₹0'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <CheckCircleIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Status: <Text style={styles.boldValue}>
                      {booking?.status ? booking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'}
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={[styles.metaColumn, isMobile && { marginRight: 0 }]}>
                <View style={styles.infoRow}>
                  <CalendarIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Date: <Text style={styles.boldValue}>
                      {booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-GB') : 'Not scheduled'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <CalendarIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Created: <Text style={styles.boldValue}>
                      {booking?.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB') : 'Unknown'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <CheckCircleIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                  <Text style={styles.metaItemText}>
                    Payment: <Text style={{ color: booking?.paymentStatus?.toLowerCase() === 'paid' ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                      {booking?.paymentStatus || 'PENDING'}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Bottom Diagnostics Tri-Card Information Panels Section */}
      {/* Diagnostic panels stack vertically on compact displays */}
      <View style={[styles.diagnosticRow, isMobile && { flexDirection: 'column' }]}>
        {/* Step Progression Tracker Modules Component */}
        <View style={[styles.diagnosticCard, { flex: 1 }, isMobile && { marginBottom: 16 }]}>
          <Text style={styles.diagCardTitle}>Booking Progress Tracker</Text>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: isMobile ? 260 : undefined }}>
          {(booking as any)?.metadata?.progress?.steps ? (
            (booking as any)?.metadata?.progress?.steps?.map((step: any, idx: number) => {
              const colorMap: Record<string, string> = {
                'completed': '#10B981',
                'in_progress': '#2563EB',
                'pending': '#9CA3AF',
              };
              const statusColor = colorMap[step.status] || '#9CA3AF';

              return (
                <View key={idx} style={styles.stepperRow}>
                  <View style={[styles.stepperNode, { backgroundColor: statusColor }]}>
                    <Text style={styles.stepperNodeText}>{step.order}</Text>
                  </View>
                  <View style={styles.stepperInfo}>
                    <Text style={styles.stepperTitle}>{step.label}</Text>
                    <Text style={{ fontSize: 11, color: statusColor }}>
                      {step.status === 'completed' ? 'Completed' : step.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            // Fallback if no data
            [
              { step: 'Booking Created', desc: 'Completed', color: '#10B981' },
              { step: 'Assigning Resources', desc: 'Pending', color: '#9CA3AF' },
            ].map((item, idx) => (
              <View key={idx} style={styles.stepperRow}>
                <View style={[styles.stepperNode, { backgroundColor: item.color }]}>
                  <Text style={styles.stepperNodeText}>{idx + 1}</Text>
                </View>
                <View style={styles.stepperInfo}>
                  <Text style={styles.stepperTitle}>{item.step}</Text>
                  <Text style={{ fontSize: 11, color: item.color }}>{item.desc}</Text>
                </View>
              </View>
            ))
          )}
          </ScrollView>
        </View>

        {/* Real-time Environmental Weather Intel Panel */}
        <View style={[styles.diagnosticCard, { flex: 1 }, isMobile ? { marginHorizontal: 0, marginBottom: 16 } : { marginHorizontal: 16 }]}>
          {(booking as any)?.metadata?.weather ? (
            <>
              <View style={styles.diagCardHeaderRow}>
                <Text style={styles.diagCardTitle}>
                  Weather Forecast
                </Text>
                <Text style={((booking as any)?.metadata?.weather?.status === 'green') ? styles.badgeSafe : styles.badgeWarning}>
                  {((booking as any)?.metadata?.weather?.status === 'green') ? 'Safe to Fly' : ((booking as any)?.metadata?.weather?.status === 'yellow') ? 'Caution' : 'Check Conditions'}
                </Text>
              </View>
              <View style={styles.weatherMetricsRow}>
                <Text style={styles.weatherTemp}>{((booking as any)?.metadata?.weather?.temperature) ?? 'N/A'}°C</Text>
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.weatherCondition}>
                    Status: {((booking as any)?.metadata?.weather?.status ?? 'unknown').toUpperCase()}
                  </Text>
                  <Text style={styles.weatherSubStat}>
                    💨 {((booking as any)?.metadata?.weather?.windSpeed ?? 'N/A')} km/h
                  </Text>
                </View>
              </View>
              <View style={[styles.weatherGridData, isMobile && { flexWrap: 'wrap', justifyContent: 'flex-start' }]}>
                <Text style={[styles.weatherGridCell, isMobile && { marginRight: 12, marginBottom: 4 }]}>💨 Wind: {((booking as any)?.metadata?.weather?.windSpeed ?? 'N/A')} km/h</Text>
                <Text style={[styles.weatherGridCell, isMobile && { marginRight: 12, marginBottom: 4 }]}>💧 Humidity: {((booking as any)?.metadata?.weather?.humidity ?? 'N/A')}%</Text>
                <Text style={styles.weatherGridCell}>🌡️ Temp: {((booking as any)?.metadata?.weather?.temperature ?? 'N/A')}°C</Text>
              </View>
              <Text style={styles.weatherSummaryMessage}>
                {((booking as any)?.metadata?.weather?.forecast) || 'Weather data available'}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.diagCardHeaderRow}>
                <Text style={styles.diagCardTitle}>Weather Forecast</Text>
                <Text style={styles.badgeSafe}>Loading...</Text>
              </View>
              <Text style={styles.weatherLocation}>📍 Loading weather data...</Text>
            </>
          )}
        </View>

        {/* Airspace Restrictions & Airfield Safety Compliance Checks */}
        <View style={[styles.diagnosticCard, { flex: 1 }]}>
          {(booking as any)?.metadata?.restrictions ? (
            <>
              <View style={styles.diagCardHeaderRow}>
                <Text style={styles.diagCardTitle}>🛡️ Flying Restrictions Check</Text>
                <Text style={((booking as any)?.metadata?.restrictions?.status === 'green') ? styles.badgeSafe : styles.badgeWarning}>
                  {((booking as any)?.metadata?.restrictions?.status === 'green') ? 'Safe to Fly' : ((booking as any)?.metadata?.restrictions?.status === 'yellow') ? 'Caution' : 'Check Restrictions'}
                </Text>
              </View>
              <View style={styles.restrictionList}>
                <View style={styles.restrictionRow}>
                  <Text style={styles.restrictionLabel}>• Zone</Text>
                  <Text style={styles.restrictionValue}>{((booking as any)?.metadata?.restrictions?.zone) || 'Unknown'}</Text>
                </View>
                <View style={styles.restrictionRow}>
                  <Text style={styles.restrictionLabel}>• Status</Text>
                  <Text style={[styles.restrictionValue, { color: ((booking as any)?.metadata?.restrictions?.status === 'green') ? '#10B981' : '#F59E0B' }]}>
                    {((booking as any)?.metadata?.restrictions?.status ?? 'unknown').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.restrictionRow}>
                  <Text style={styles.restrictionLabel}>• Restrictions Count</Text>
                  <Text style={styles.restrictionValue}>
                    {((booking as any)?.metadata?.restrictions?.restrictions?.length) ?? 0}
                  </Text>
                </View>
              </View>
              {((booking as any)?.metadata?.restrictions?.restrictions?.length ?? 0) > 0 && (
                <View style={{ marginTop: 8 }}>
                  {((booking as any)?.metadata?.restrictions?.restrictions ?? []).map((r: string, i: number) => (
                    <Text key={i} style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>• {r}</Text>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.diagCardHeaderRow}>
                <Text style={styles.diagCardTitle}>🛡️ Flying Restrictions</Text>
                <Text style={styles.badgeSafe}>Loading...</Text>
              </View>
              <Text style={styles.weatherLocation}>Loading restriction data...</Text>
            </>
          )}
        </View>
      </View>

      {/* Embedded Live Spatial Map View Placeholder Overlay */}
      <View style={styles.mapVisualContainer}>
        <Text style={styles.mapLiveIndicator}>Live Tracking</Text>
        <View style={[styles.mapMarkerPinBox, isMobile && { marginHorizontal: 12 }]}>
          <Text style={{ fontSize: 14 }}>📍</Text>
          <Text style={styles.mapPinText} numberOfLines={1}>
            {hasApiData && booking.address && typeof booking.address === 'object' && 'village' in booking.address
              ? `${booking.address.village}, ${booking.address.district}, ${booking.address.state}`
              : hasApiData && typeof booking.address === 'string'
              ? booking.address
              : 'Vinayak Farms, Kotamgaon, Nashik'}
          </Text>
        </View>
      </View>

      {/* Bottom Context Management Interaction Footer Actions Bar */}
      {/* Buttons reorient vertically on compact displays */}
      <View style={[styles.footerActionsBar, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        {booking && booking.status === 'pending' && booking.adminApprovalStatus === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, { backgroundColor: '#10B981' }, isMobile && { marginLeft: 0, marginBottom: 8, alignItems: 'center' }]}
              disabled={detailLoading}
              onPress={() => { setApprovalBooking(booking); setAutoAssignToggle(true); setApprovalModalVisible(true); }}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Approve Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerActionBtn, isMobile && { marginLeft: 0, marginBottom: 8, alignItems: 'center' }]}
              disabled={detailLoading}
              onPress={() => { setApprovalBooking(booking); setRejectReason(''); setRejectModalVisible(true); }}
            >
              <Text style={styles.dangerBtnText}>Reject Booking</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.secondaryActionBtn, isMobile && { marginLeft: 0, marginBottom: 8, alignItems: 'center' }]}
          disabled={detailLoading}
          onPress={() => {
            console.log('🔄 Assign Resources clicked');
            if (booking) openAssignModal(booking);
          }}
        >
          <Text style={styles.secondaryBtnText}>Assign / Reassign FM, Pilot & Drone</Text>
        </TouchableOpacity>
        {/* Only show cancel button for pending/upcoming bookings */}
        {booking && booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <TouchableOpacity
            style={[styles.dangerActionBtn, isMobile && { marginLeft: 0, alignItems: 'center' }, detailLoading && { opacity: 0.5 }]}
            onPress={() => {
              console.log('🚫 Cancel Booking button clicked');
              console.log('📋 Booking status:', booking.status);
              console.log('📋 Booking ID:', booking.id);
              handleCancelBooking();
            }}
            disabled={detailLoading}
          >
            <Text style={styles.dangerBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
  };

  // --- RENDERING ROUTER ---
  // --- RENDER SCREEN: MAIN BOOKING DASHBOARD ---
  return (
    <View style={{ flex: 1 }}>
      {viewMode === 'detail' ? renderBookingDetailScreen() : (
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      {/* Top Breadcrumb & Header Row */}
      {/* Containers adapt and wrap elements gracefully inside mobile viewports */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Bookings</Text>
          </View>
          <Text style={styles.pageTitle}>Bookings Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Bookings</Text>
        </View>

        {/* Search Input Box */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Bookings (booking ID, customer, service)"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(true);
            }}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#535CE8" style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>
      </View>

      {/* Timeline Filter Row */}
      {/* Filter chips scroll sideways when space is constricted on mobile */}
      <View style={[styles.timelineBarRow, { position: 'relative' as any, zIndex: 100 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.chipsLeftGroup, isMobile && { marginBottom: 12 }]}>
          {([currentYear, currentYear - 1, currentYear - 2] as number[]).map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[styles.timelineChip, filterYear === yr && styles.timelineChipActive]}
              onPress={() => { setFilterYear(yr); setFilterQuarter(undefined); }}
            >
              <Text style={[styles.timelineChipText, filterYear === yr && styles.timelineChipTextActive]}>{yr}</Text>
            </TouchableOpacity>
          ))}
          {[1, 2, 3, 4].map((q) => (
            <TouchableOpacity
              key={`Q${q}`}
              style={[styles.timelineChip, filterQuarter === q && styles.timelineChipActive]}
              onPress={() => setFilterQuarter(filterQuarter === q ? undefined : q)}
            >
              <Text style={[styles.timelineChipText, filterQuarter === q && styles.timelineChipTextActive]}>Q{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Desktop View: Show all filters inline */}
        {!isMobile && (
          <View style={[styles.chipsRightGroup]}>
            {/* Service dropdown */}
            <View style={{ position: 'relative', zIndex: 102 }}>
              <TouchableOpacity style={styles.dropdownMiniCard} onPress={() => { setShowServiceDropdown(!showServiceDropdown); setShowStateDropdown(false); }}>
                <Text style={styles.dropdownText}>{filterService ? filterService.charAt(0).toUpperCase() + filterService.slice(1) : 'All Services'}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showServiceDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <TouchableOpacity
                    style={{
                      position: 'fixed' as any,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 9998,
                    }}
                    onPress={() => setShowServiceDropdown(false)}
                  />
                  <View style={styles.dropdownMenu}>
                    {[undefined, 'spraying', 'mapping', 'surveillance', 'videography', 'delivery', 'seeding', 'monitoring', 'surveying'].map((s) => (
                      <TouchableOpacity key={s ?? 'all'} style={styles.dropdownMenuItem} onPress={() => { setFilterService(s); setShowServiceDropdown(false); }}>
                        <Text style={[styles.dropdownMenuText, filterService === s && styles.dropdownMenuTextActive]}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Services'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
            {/* State dropdown — populated from analytics */}
            <View style={{ position: 'relative', zIndex: 101 }}>
              <TouchableOpacity style={styles.dropdownMiniCard} onPress={() => { setShowStateDropdown(!showStateDropdown); setShowServiceDropdown(false); }}>
                <Text style={styles.dropdownText}>{filterState || 'All States'}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showStateDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <TouchableOpacity
                    style={{
                      position: 'fixed' as any,
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 9998,
                    }}
                    onPress={() => setShowStateDropdown(false)}
                  />
                  <View style={[styles.dropdownMenu, { right: 0, left: undefined, width: 160 }]}>
                    <TouchableOpacity style={styles.dropdownMenuItem} onPress={() => { setFilterState(undefined); setShowStateDropdown(false); }}>
                      <Text style={[styles.dropdownMenuText, !filterState && styles.dropdownMenuTextActive]}>All States</Text>
                    </TouchableOpacity>
                    {(analytics?.byState ?? []).map(({ state }) => (
                      <TouchableOpacity key={state} style={styles.dropdownMenuItem} onPress={() => { setFilterState(state); setShowStateDropdown(false); }}>
                        <Text style={[styles.dropdownMenuText, filterState === state && styles.dropdownMenuTextActive]}>{state}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.filterMenuButton} onPress={() => { setFilterQuarter(undefined); setFilterService(undefined); setFilterState(undefined); setFilterYear(currentYear); }}>
              <RefreshIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile View: Show VectorIcon with filter modal */}
        {isMobile && (
          <View style={styles.chipsRightGroup}>
            <TouchableOpacity style={styles.filterIconBtn} onPress={() => setActionMenuVisible(!actionMenuVisible)}>
              <VectorIcon width={18} height={18} fill="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterMenuButton} onPress={() => { setFilterQuarter(undefined); setFilterService(undefined); setFilterState(undefined); setFilterYear(currentYear); }}>
              <RefreshIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mobile Filter Modal */}
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
              
              {/* Service Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Service Type</Text>
                <ScrollView style={styles.filterScrollView}>
                  {[undefined, 'spraying', 'mapping', 'surveillance', 'videography', 'delivery', 'seeding', 'monitoring', 'surveying'].map((s) => (
                    <TouchableOpacity 
                      key={s ?? 'all'} 
                      style={[styles.filterMenuItem, filterService === s && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setFilterService(s); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>
                        {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Services'}
                      </Text>
                      {filterService === s && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* State Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>State</Text>
                <ScrollView style={styles.filterScrollView}>
                  <TouchableOpacity 
                    style={[styles.filterMenuItem, !filterState && styles.filterMenuItemActive]} 
                    onPress={() => { 
                      setFilterState(undefined); 
                    }}
                  >
                    <Text style={styles.filterMenuItemText}>All States</Text>
                    {!filterState && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                  {(analytics?.byState ?? []).map(({ state }) => (
                    <TouchableOpacity 
                      key={state} 
                      style={[styles.filterMenuItem, filterState === state && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setFilterState(state); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>{state}</Text>
                      {filterState === state && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Close Button */}
              <TouchableOpacity 
                style={styles.clearFiltersButton} 
                onPress={() => setActionMenuVisible(false)}
              >
                <Text style={styles.clearFiltersButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Top Core Matrix Cards Grid */}
      {/* Metric modules — 2×2 wrap grid on mobile, row on desktop */}
      <View style={[styles.metricsRow, isMobile && styles.mobileMetricsGrid]}>
        {[
          { label: 'Total Bookings', value: analytics?.stats.total ?? 0, color: '#2563EB' },
          { label: 'Completed',       value: analytics?.stats.completed ?? 0, color: '#059669' },
          { label: 'Upcoming',        value: analytics?.stats.upcoming ?? 0,   color: '#D97706' },
          { label: 'Active',          value: analytics?.stats.active ?? 0,     color: '#7C3AED' },
          { label: 'Cancelled',       value: analytics?.stats.cancelled ?? 0,  color: '#DC2626' },
        ].map((m, i) => (
          <View key={i} style={[styles.metricCard, { backgroundColor: m.color }, isMobile && styles.mobileMetricCardBooking]}>
            <Text style={[styles.metricLabelText, isMobile && { fontSize: 11 }]}>{m.label}</Text>
            {analyticsLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={[styles.metricValueText, isMobile && { fontSize: 24, marginTop: 4 }]}>{m.value}</Text>
            }
          </View>
        ))}
      </View>

      {/* Timeline Line Chart */}
      <View style={styles.cardContainer}>
        <Text style={styles.cardSectionHeadingTitle}>📈 Booking Trends — {filterYear}{filterQuarter ? ` Q${filterQuarter}` : ''}</Text>
        {analyticsLoading ? (
          <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#2563EB" /></View>
        ) : analytics && analytics.timeline.length > 0 ? (
          <BookingTimelineChart data={analytics.timeline} />
        ) : (
          <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>No data for selected period</Text>
          </View>
        )}
      </View>

      {/* India Map View Section */}
      {/* Splits layout horizontally or vertically depending on screen scaling */}
      <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.cardContainer, { flex: 1.6 }, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 16 }]}>
          <Text style={styles.cardSectionHeadingTitle}><DroneIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /> Distribution of Bookings Count Over Nation</Text>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.mapInternalFilterChipsRow, { flexDirection: 'row' }]}>
            <TouchableOpacity style={styles.activeMapChip}><Text style={styles.activeMapChipText}>Active Bookings</Text></TouchableOpacity>
            <TouchableOpacity style={styles.inactiveMapChip}><Text style={styles.inactiveMapChipText}>Completed Bookings</Text></TouchableOpacity>
            <TouchableOpacity style={styles.inactiveMapChip}><Text style={styles.inactiveMapChipText}>Upcoming Bookings</Text></TouchableOpacity>
          </ScrollView>

          <View style={styles.indiaGeographicPlaceholderBox}>
            <Text style={[styles.mapCenterLabelText, isMobile && { textAlign: 'center', paddingHorizontal: 12 }]}>[ Geographic Map Overlay Stream Engine ]</Text>
            <View style={[styles.mapTooltipBox, isMobile && { left: '15%' }]}>
              <Text style={styles.tooltipHeading}>📍 Rajasthan</Text>
              <Text style={styles.tooltipCount}>4,821 bookings</Text>
              <Text style={styles.tooltipStatPercentage}>▲ 12% vs last month</Text>
            </View>
          </View>
        </View>

        {/* Right Distribution Sidebar */}
        <View style={[styles.cardContainer, { flex: 1 }]}>
          <Text style={styles.cardSectionHeadingTitle}>Bookings by State</Text>
          {analyticsLoading ? (
            <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
          ) : (
            <ScrollView style={styles.stateListContainer}>
              {(analytics?.byState ?? []).length === 0 ? (
                <Text style={{ color: '#6B7280', padding: 12 }}>No data</Text>
              ) : (() => {
                const maxCount = Math.max(...(analytics?.byState ?? []).map((s) => s.count), 1);
                return (analytics?.byState ?? []).map(({ state, count }, index) => (
                  <View key={index} style={styles.stateBarItemRow}>
                    <Text style={styles.stateLabelText} numberOfLines={1}>{state}</Text>
                    <View style={styles.stateBarTrackLine}>
                      <View style={[styles.stateBarFillLine, { width: `${(count / maxCount) * 100}%` as any }]} />
                    </View>
                    <Text style={styles.stateCountText}>{count}</Text>
                  </View>
                ));
              })()}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Services Distribution Horizontals Panel */}
      <View style={styles.cardContainer}>
        <Text style={styles.cardSectionHeadingTitle}><PersonIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /> Distribution of Bookings as per Service Category</Text>
        {analyticsLoading ? (
          <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
        ) : (
          <View style={{ marginTop: 12 }}>
            {(analytics?.byService ?? []).length === 0 ? (
              <Text style={{ color: '#6B7280' }}>No data</Text>
            ) : (() => {
              const maxCount = Math.max(...(analytics?.byService ?? []).map((s) => s.count), 1);
              const SERVICE_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#BE185D'];
              return (analytics?.byService ?? []).map(({ service, count }, idx) => (
                <View key={idx} style={styles.srvItemRow}>
                  <Text style={styles.srvLabelCellText}>{service.charAt(0).toUpperCase() + service.slice(1)}</Text>
                  <View style={styles.srvTrackBackground}>
                    <View style={[styles.srvFillProgress, { width: `${(count / maxCount) * 100}%` as any, backgroundColor: SERVICE_COLORS[idx % SERVICE_COLORS.length] }]} />
                  </View>
                  <Text style={styles.srvCountCellText}>{count}</Text>
                </View>
              ));
            })()}
          </View>
        )}
      </View>

      {/* Tab Filter Row Above Final Log Matrix Table */}
      {/* Aligns sub-tab controls gracefully on mobile screen reductions */}
      <View style={[styles.logTableHeaderFiltersBar, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.tabSubRowContainer, isMobile && { marginBottom: 12 }]}>
          <View style={styles.leftButtonGroupFilters}>
            {['Active', 'Upcoming', 'Completed', 'Pending Approval'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tableFilterToggleBtn, activeSubTab === tab && styles.tableFilterToggleBtnActive]}
                onPress={() => setActiveSubTab(tab as any)}
              >
                <Text style={[styles.tableFilterToggleText, activeSubTab === tab && styles.tableFilterToggleTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
      </View>

      {/* Core Bookings List — table on desktop, cards on mobile */}
      

      {isMobile ? (
        /* ── Mobile: booking cards ── */
        <View style={styles.mobileCardList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
          ) : bookingsListData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search terms' : `No ${activeSubTab.toLowerCase()} bookings at the moment`}
              </Text>
            </View>
          ) : (
            bookingsListData.map((row, index) => (
              <TouchableOpacity
                key={index}
                style={styles.mobileBookingCard}
                onPress={() => { if (row.fullBooking) loadBookingDetailFromAPI(row.fullBooking.id, row.fullBooking); }}
              >
                {/* Top row: service name + status badge */}
                <View style={styles.mobileCardTopRow}>
                  <Text style={styles.mobileCardService} numberOfLines={2}>{row.service}</Text>
                  <View style={styles.pillBadgeContainer}>
                    <Text style={styles.pillBadgeText}>{row.status}</Text>
                  </View>
                </View>
                {/* Meta row: location + price */}
                <View style={styles.mobileCardMetaRow}>
                  <Text style={styles.mobileCardMeta}>📍 {row.customer}</Text>
                  <Text style={styles.mobileCardPrice}>{row.price}</Text>
                </View>
                {/* Bottom row: booking ID + date */}
                <View style={styles.mobileCardBottomRow}>
                  <Text style={styles.mobileCardId}>{row.id}</Text>
                  <Text style={styles.mobileCardDate}>🗓 {row.date}</Text>
                </View>
                {activeSubTab === 'Pending Approval' && (
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#10B981', padding: 8, borderRadius: 6, alignItems: 'center' }}
                      onPress={() => { setApprovalBooking(row.fullBooking); setAutoAssignToggle(true); setApprovalModalVisible(true); }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#EF4444', padding: 8, borderRadius: 6, alignItems: 'center' }}
                      onPress={() => { setApprovalBooking(row.fullBooking); setRejectReason(''); setRejectModalVisible(true); }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        /* ── Desktop: horizontal scroll table ── */
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.logGridContainerCard, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.gridColumnsHeaderLine}>
              <Text style={[styles.gridHeaderCellText, { flex: 2.2 }]}>Service Name ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Customer Name ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 1.8 }]}>Booking ID ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 1.5, textAlign: 'center' }]}>Status ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 1.5 }]}>Price (₹) ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 1.8 }]}>Service Date ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Fleet Manager ▲</Text>
              <Text style={[styles.gridHeaderCellText, { flex: 1.5 }]}>Drone Pilot ▲</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading bookings...</Text>
              </View>
            ) : bookingsListData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No bookings found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Try adjusting your search terms' : `No ${activeSubTab.toLowerCase()} bookings at the moment`}
                </Text>
              </View>
            ) : (
              bookingsListData.map((row, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.gridBodyDataRow}
                  onPress={() => { if (row.fullBooking) loadBookingDetailFromAPI(row.fullBooking.id, row.fullBooking); }}
                >
                  <Text style={[styles.gridBodyCellText, styles.boldBodyCell, { flex: 2.2, color: '#2563EB' }]}>{row.service}</Text>
                  <Text style={[styles.gridBodyCellText, { flex: 2, color: '#4B5563' }]}>{row.customer}</Text>
                  <Text style={[styles.gridBodyCellText, { flex: 1.8, color: '#4B5563' }]}>{row.id}</Text>
                  <View style={{ flex: 1.5, alignItems: 'center' }}>
                    <View style={styles.pillBadgeContainer}>
                      <Text style={styles.pillBadgeText}>{row.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.gridBodyCellText, { flex: 1.5 }]}>{typeof row.price === 'number' ? `₹${row.price.toLocaleString('en-IN')}` : row.price}</Text>
                  <Text style={[styles.gridBodyCellText, { flex: 1.8, color: '#4B5563' }]}>{row.date}</Text>
                  <Text style={[styles.gridBodyCellText, { flex: 2 }]}>{row.fleetManager}</Text>
                  <Text style={[styles.gridBodyCellText, { flex: 1.5 }]}>{row.pilot}</Text>
                {activeSubTab === 'Pending Approval' && (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 4 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                      onPress={() => { setApprovalBooking(row.fullBooking); setAutoAssignToggle(true); setApprovalModalVisible(true); }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                      onPress={() => { setApprovalBooking(row.fullBooking); setRejectReason(''); setRejectModalVisible(true); }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Pagination Controls */}
      {!loading && bookingsListData.length > 0 && (
        <View style={[styles.paginationContainer, isMobile && styles.paginationContainerMobile]}>
          <View style={[styles.paginationInfo, isMobile && { marginBottom: 10 }]}>
            <Text style={[styles.paginationText, isMobile && { fontSize: 12 }]}>
              Showing {bookingsListData.length} of {totalItems} bookings
            </Text>
            <Text style={styles.paginationPageNum}>Page {currentPageNum}</Text>
          </View>

          <View style={styles.paginationButtons}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPageNum === 1 && styles.paginationButtonDisabled,
                isMobile && { flex: 1 }
              ]}
              onPress={handlePreviousPage}
              disabled={currentPageNum === 1}
            >
              <Text style={[
                styles.paginationButtonText,
                currentPageNum === 1 && styles.paginationButtonTextDisabled,
                isMobile && { textAlign: 'center' }
              ]}>← Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                !hasMore && styles.paginationButtonDisabled,
                isMobile && { flex: 1 }
              ]}
              onPress={handleNextPage}
              disabled={!hasMore}
            >
              <Text style={[
                styles.paginationButtonText,
                !hasMore && styles.paginationButtonTextDisabled,
                isMobile && { textAlign: 'center' }
              ]}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </ScrollView>
      )}

      {approvalModalVisible && (
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: isMobile ? '90%' : 400, maxWidth: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111827' }}>Approve Booking</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Approve booking {approvalBooking?.id?.substring(0, 12)}...?
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setAutoAssignToggle(!autoAssignToggle)}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                  borderColor: autoAssignToggle ? '#10B981' : '#D1D5DB',
                  backgroundColor: autoAssignToggle ? '#10B981' : 'transparent',
                  justifyContent: 'center', alignItems: 'center'
                }}>
                  {autoAssignToggle && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 14, color: '#374151' }}>Auto-assign to fleet manager</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => { setApprovalModalVisible(false); setApprovalBooking(null); }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }}
                onPress={handleApproveBooking}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {rejectModalVisible && (
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: isMobile ? '90%' : 400, maxWidth: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111827' }}>Reject Booking</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
              Reason for rejecting booking {approvalBooking?.id?.substring(0, 12)}...?
            </Text>
            <TextInput
              style={{
                borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12,
                minHeight: 80, textAlignVertical: 'top', marginBottom: 20, fontSize: 14
              }}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                onPress={() => { setRejectModalVisible(false); setApprovalBooking(null); setRejectReason(''); }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center' }}
                onPress={handleRejectBooking}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {assignModalVisible && (
        <View style={styles.overlay}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, width: isMobile ? '92%' : 480, maxWidth: '92%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#111827' }}>Assign / Reassign Resources</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
              Booking {selectedBooking?.id?.substring(0, 16)}... — {selectedBooking?.serviceType || 'Service'}
            </Text>

            {assignLoading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ marginTop: 10, fontSize: 13, color: '#6B7280' }}>Loading available resources...</Text>
              </View>
            ) : (
              <>
                {/* Fleet Manager */}
                <Text style={styles.assignLabel}>Fleet Manager</Text>
                <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 14 }}>
                  {fleetManagers.length === 0 ? (
                    <Text style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>No active fleet managers found</Text>
                  ) : (
                    fleetManagers.map((fm, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.assignOptionRow, selectedFleetManager === fm.uid && styles.assignOptionRowSelected]}
                        onPress={() => setSelectedFleetManager(fm.uid)}
                      >
                        <Text style={styles.assignOptionText}>{fm.name || fm.fullName || fm.uid}</Text>
                        {selectedFleetManager === fm.uid && <Text style={{ color: '#10B981', fontWeight: '700' }}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* Pilot */}
                <Text style={styles.assignLabel}>Pilot (compatible + available)</Text>
                <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 14 }}>
                  {assignPilots.length === 0 ? (
                    <Text style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>No compatible/available pilots found</Text>
                  ) : (
                    assignPilots.map((pilot, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.assignOptionRow, selectedPilot === (pilot.uid || pilot.id) && styles.assignOptionRowSelected]}
                        onPress={() => setSelectedPilot(pilot.uid || pilot.id)}
                      >
                        <Text style={styles.assignOptionText}>{pilot.fullName || pilot.name || pilot.id}</Text>
                        {selectedPilot === (pilot.uid || pilot.id) && <Text style={{ color: '#10B981', fontWeight: '700' }}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* Drone */}
                <Text style={styles.assignLabel}>Drone (compatible + deployable)</Text>
                <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 20 }}>
                  {assignDrones.length === 0 ? (
                    <Text style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>No compatible/available drones found</Text>
                  ) : (
                    assignDrones.map((drone, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.assignOptionRow, selectedDrone === (drone.id || drone.uid) && styles.assignOptionRowSelected]}
                        onPress={() => setSelectedDrone(drone.id || drone.uid)}
                      >
                        <Text style={styles.assignOptionText}>{drone.model || drone.name || drone.id} ({drone.type || 'N/A'})</Text>
                        {selectedDrone === (drone.id || drone.uid) && <Text style={{ color: '#10B981', fontWeight: '700' }}>✓</Text>}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' }}
                    onPress={() => setAssignModalVisible(false)}
                  >
                    <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', opacity: assignSaving ? 0.6 : 1 }}
                    disabled={assignSaving || (!selectedFleetManager && !selectedPilot && !selectedDrone)}
                    onPress={handleSaveAssignments}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>
                      {assignSaving ? 'Saving...' : 'Save Assignment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Timeline SVG Line Chart ───────────────────────────────────────────────────
const SERVICE_LINE_COLORS: Record<string, string> = {
  spraying: '#2563EB',
  mapping: '#059669',
  surveillance: '#D97706',
  videography: '#7C3AED',
  delivery: '#DC2626',
  seeding: '#0891B2',
  monitoring: '#BE185D',
  surveying: '#6366F1',
  total: '#94A3B8',
};

function BookingTimelineChart({ data }: { data: ({ month: string } & Record<string, number | string>)[] }) {
  const W = 700;
  const H = 200;
  const PAD = { top: 16, right: 20, bottom: 40, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Collect all service keys except month/total
  const services = Array.from(
    new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== 'month' && k !== 'total')))
  );

  const allValues = data.flatMap((d) =>
    services.map((s) => (typeof d[s] === 'number' ? (d[s] as number) : 0))
  );
  const maxVal = Math.max(...allValues, 1);

  const xStep = services.length === 0 ? chartW : chartW / Math.max(data.length - 1, 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const polyline = (svc: string) =>
    data
      .map((d, i) => `${toX(i)},${toY(typeof d[svc] === 'number' ? (d[svc] as number) : 0)}`)
      .join(' ');

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

  // X labels — show at most 12
  const step = Math.ceil(data.length / 12);
  const xLabels = data.filter((_, i) => i % step === 0);

  return (
    <View style={{ marginTop: 8 }}>
      {/* SVG chart */}
      <View style={{ width: '100%', height: H, overflow: 'hidden' }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <G key={tick}>
              <Line
                x1={PAD.left} y1={toY(tick)}
                x2={W - PAD.right} y2={toY(tick)}
                stroke="#E5E7EB" strokeWidth="1"
              />
              <SvgText x={PAD.left - 6} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{tick}</SvgText>
            </G>
          ))}
          {/* X labels */}
          {xLabels.map((d) => {
            const idx = data.indexOf(d);
            return (
              <SvgText key={idx} x={toX(idx)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9CA3AF">
                {d.month.substring(5)}
              </SvgText>
            );
          })}
          {/* Lines per service */}
          {services.map((svc) => (
            <Polyline
              key={svc}
              points={polyline(svc)}
              fill="none"
              stroke={SERVICE_LINE_COLORS[svc] ?? '#94A3B8'}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* Dots */}
          {services.map((svc) =>
            data.map((d, i) => {
              const v = typeof d[svc] === 'number' ? (d[svc] as number) : 0;
              if (v === 0) return null;
              return (
                <Circle key={`${svc}-${i}`} cx={toX(i)} cy={toY(v)} r="3"
                  fill={SERVICE_LINE_COLORS[svc] ?? '#94A3B8'}
                />
              );
            })
          )}
        </Svg>
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 12 }}>
        {services.map((svc) => (
          <View key={svc} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: SERVICE_LINE_COLORS[svc] ?? '#94A3B8' }} />
            <Text style={{ fontSize: 11, color: '#6B7280' }}>{svc.charAt(0).toUpperCase() + svc.slice(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Layout Styling Definitions
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  breadcrumbHome: { fontSize: 12 },
  breadcrumbSeparator: { marginHorizontal: 6, color: '#9CA3AF', fontSize: 11 },
  breadcrumbActive: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  backButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, backgroundColor: '#FFF' },
  backButtonText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#FFFFFF', width: 280, height: 38 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', outlineStyle: 'none' as any },
  searchIcon: { fontSize: 14, color: '#9CA3AF' },
  timelineBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chipsLeftGroup: { flexDirection: 'row' },
  tabSubRowContainer: { flexDirection: 'row' },
  timelineChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 6, marginRight: 8 },
  timelineChipActive: { backgroundColor: '#2563EB' },
  timelineChipText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  timelineChipTextActive: { color: '#FFFFFF' },
  dropdownMenu: { position: 'absolute', top: 36, left: 0, backgroundColor: '#FFFFFF', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8, zIndex: 9999, minWidth: 150, maxHeight: 260, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownMenuItem: { paddingHorizontal: 14, paddingVertical: 9 },
  dropdownMenuText: { fontSize: 13, color: '#374151' },
  dropdownMenuTextActive: { color: '#2563EB', fontWeight: '600' },
  chipsRightGroup: { flexDirection: 'row', alignItems: 'center' },
  dropdownMiniCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8, backgroundColor: '#FFFFFF' },
  dropdownText: { fontSize: 12, color: '#374151', marginRight: 8 },
  dropdownArrow: { fontSize: 8, color: '#6B7280' },
  filterMenuButton: { marginLeft: 10, padding: 2 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap' as const, justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { flex: 1, padding: 20, borderRadius: 12, marginRight: 12, minHeight: 100, justifyContent: 'center' },
  metricLabelText: { fontSize: 12, color: '#FFFFFF', opacity: 0.9 },
  metricValueText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },

  // ── Mobile metric grid ─────────────────────────────────────────
  mobileMetricsGrid: { gap: 10, justifyContent: 'flex-start' },
  mobileMetricCardBooking: { flexBasis: '47%', flex: 1, marginRight: 0, minHeight: 80, padding: 14, borderRadius: 10 },

  // ── Mobile booking card list ───────────────────────────────────
  mobileCardList: { marginBottom: 16 },
  mobileBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
  },
  mobileCardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  mobileCardService: { fontSize: 13, fontWeight: '700', color: '#2563EB', flex: 1, marginRight: 8 },
  mobileCardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mobileCardMeta: { fontSize: 12, color: '#6B7280', flex: 1 },
  mobileCardPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  mobileCardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mobileCardId: { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' as any },
  mobileCardDate: { fontSize: 11, color: '#6B7280' },

  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 20 },
  chartMockAreaBlock: { height: 180, backgroundColor: '#FAFAFA', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  chartAreaLabelPlaceholder: { color: '#9CA3AF', fontSize: 12 },
  flexGridRow: { flexDirection: 'row', marginBottom: 4 },
  cardSectionHeadingTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  mapInternalFilterChipsRow: { flexDirection: 'row', marginBottom: 12 },
  activeMapChip: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 6 },
  activeMapChipText: { fontSize: 11, color: '#1E40AF', fontWeight: '600' },
  inactiveMapChip: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 6, backgroundColor: '#FFFFFF' },
  inactiveMapChipText: { fontSize: 11, color: '#6B7280' },
  indiaGeographicPlaceholderBox: { height: 320, backgroundColor: '#EFF6FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  mapCenterLabelText: { fontSize: 12, color: '#9CA3AF' },
  mapTooltipBox: { position: 'absolute', top: '40%', left: '30%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10 },
  tooltipHeading: { fontSize: 11, fontWeight: '700', color: '#111827' },
  tooltipCount: { fontSize: 11, color: '#4B5563', marginTop: 2 },
  tooltipStatPercentage: { fontSize: 10, color: '#10B981', fontWeight: '600', marginTop: 2 },
  stateListContainer: { height: 260 },
  stateBarItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stateLabelText: { width: 100, fontSize: 12, color: '#374151' },
  stateBarTrackLine: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  stateBarFillLine: { height: '100%', backgroundColor: '#1E3A8A' },
  stateCountText: { width: 30, fontSize: 12, color: '#111827', textAlign: 'right', fontWeight: '500' },
  srvItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  srvLabelCellText: { width: 100, fontSize: 12, color: '#4B5563' },
  srvTrackBackground: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  srvFillProgress: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
  srvCountCellText: { fontSize: 12, fontWeight: '600', color: '#111827', width: 30, textAlign: 'right' },
  logTableHeaderFiltersBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  leftButtonGroupFilters: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tableFilterToggleBtn: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 8 },
  tableFilterToggleBtnActive: { backgroundColor: '#2563EB' },
  tableFilterToggleText: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  tableFilterToggleTextActive: { color: '#FFFFFF' },
  rightDropdownGroupFilters: { flexDirection: 'row', alignItems: 'center' },
  logGridContainerCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  gridColumnsHeaderLine: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  gridHeaderCellText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  gridBodyDataRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  gridBodyCellText: { fontSize: 12, color: '#111827' },
  boldBodyCell: { fontWeight: '600' },
  pillBadgeContainer: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#10B981', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pillBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '600' },

  // --- LAYOUT STYLES SPECIFIC TO DETAILED SUBVIEW ---
  stakeholderGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  stakeholderCard: { width: '49%', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#1E40AF', fontSize: 14, fontWeight: '700' },
  stakeholderInfo: { marginLeft: 12, flex: 1 },
  stakeholderName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stakeholderRole: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  stakeholderMeta: { fontSize: 11, color: '#4B5563', flex: 1, flexWrap: 'wrap' },
  detailMetadataCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 20 },
  detailCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 8 },
  metaFlexGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaColumn: { flex: 1, marginRight: 8 },

  // Alignment Style Fix: Used on fields needing explicit icon-before-label rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItemText: { fontSize: 12, color: '#4B5563', flex: 1, flexWrap: 'wrap' },
  boldValue: { fontWeight: '600', color: '#111827' },
  diagnosticRow: { flexDirection: 'row', marginBottom: 20 },
  diagnosticCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  diagCardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 14 },
  diagCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badgeSafe: { backgroundColor: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeWarning: { backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepperNode: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  stepperNodeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stepperInfo: { flex: 1 },
  stepperTitle: { fontSize: 12, fontWeight: '500', color: '#374151' },
  weatherLocation: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  weatherMetricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  weatherTemp: { fontSize: 32, fontWeight: '700', color: '#111827' },
  weatherCondition: { fontSize: 13, color: '#374151', fontWeight: '500' },
  weatherSubStat: { fontSize: 11, color: '#6B7280' },
  weatherGridData: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingVertical: 10, marginBottom: 10 },
  weatherGridCell: { fontSize: 11, color: '#4B5563' },
  weatherSummaryMessage: { fontSize: 12, color: '#111827', fontWeight: '600', textAlign: 'center', marginTop: 4 },
  restrictionList: { marginTop: 4 },
  restrictionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#FAFAFA' },
  restrictionLabel: { fontSize: 12, color: '#4B5563' },
  restrictionValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  mapVisualContainer: { height: 240, backgroundColor: '#E5E7EB', borderRadius: 12, marginBottom: 20, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  mapLiveIndicator: { position: 'absolute', top: 12, left: 12, backgroundColor: '#EF4444', color: '#FFF', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontWeight: '700' },
  mapMarkerPinBox: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  mapPinText: { fontSize: 12, fontWeight: '600', color: '#374151', marginLeft: 6, flex: 1 },
  footerActionsBar: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  secondaryActionBtn: { paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFF', marginLeft: 12 },
  secondaryBtnText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  dangerActionBtn: { paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, backgroundColor: '#FFF', marginLeft: 12 },
  dangerBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },

  // Loading and Empty States
  loadingContainer: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  // Pagination Controls
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  paginationContainerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  paginationInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const },
  paginationText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  paginationPageNum: { fontSize: 13, color: '#111827', fontWeight: '700', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  paginationButtons: { flexDirection: 'row', gap: 10 },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
  },
  paginationButtonDisabled: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  paginationButtonText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  paginationButtonTextDisabled: { color: '#9CA3AF' },
  titleIconPadding: {
    marginRight: 8,
    alignSelf: 'center',
  },
  
  // Mobile Filter Modal Styles
  filterIconBtn: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  filterMenuDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    width: 320,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  actionMenuHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScrollView: {
    maxHeight: 150,
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  filterMenuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  filterMenuItemText: {
    fontSize: 13,
    color: '#374151',
  },
  checkMark: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '700',
  },
  clearFiltersButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overlay: {
    position: 'fixed' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  assignLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  assignOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  assignOptionRowSelected: { backgroundColor: '#EFF6FF' },
  assignOptionText: { fontSize: 14, color: '#1F2937', flex: 1 },
});
