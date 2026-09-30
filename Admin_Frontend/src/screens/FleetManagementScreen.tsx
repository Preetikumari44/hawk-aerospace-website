import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform, Alert, Image, Modal } from 'react-native';
import Pagination from '../components/Pagination';

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
import RevenueIcon from '../assets/icons/rupee-icon.svg';
import DroneIcon from '../assets/icons/DroneIcon.svg';
import SearchIcon from '../assets/icons/SearchIcon.svg';
import CheckCircleIcon from '../assets/icons/CheckCircleIcon.svg';
import PilotIcon from '../assets/icons/PilotIcon.svg';
import CalenderIcon from '../assets/icons/CalendarIcon.svg';

import {
  getFleetManagers,
  getFleetManagerProfile,
  getFleetManagerDrones,
  getFleetManagerPilots,
  getFleetManagerBookings,
  getFleetManagerMaintenanceTickets,
  getFleetManagerSupportTickets,
  getPendingFleetManagerRequests,
  removeFleetManager,
  removeDroneFromFleetManager,
  approveFleetManager,
  rejectFleetManager,
  type FleetManager,
  type Drone,
  type Pilot,
  type Booking,
  type MaintenanceTicket,
  type SupportTicket,
} from '../api/fleet-manager.api';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeSearchQuery, detectInjectionAttempt, logSuspiciousActivity } from '../utils/inputSanitization';

export default function FleetManagementScreen() {
  // State for data
  const [fleetManagersData, setFleetManagersData] = useState<FleetManager[]>([]);
  const [pendingRequestsData, setPendingRequestsData] = useState<FleetManager[]>([]);
  const [selectedFleetManager, setSelectedFleetManager] = useState<FleetManager | null>(null);
  const [droneListData, setDroneListData] = useState<Drone[]>([]);
  const [pilotsListData, setPilotsListData] = useState<Pilot[]>([]);
  const [maintenanceTicketsData, setMaintenanceTicketsData] = useState<MaintenanceTicket[]>([]);
  const [supportTicketsData, setSupportTicketsData] = useState<SupportTicket[]>([]);
  const [missionLogsData, setMissionLogsData] = useState<Booking[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation & filtering state triggers
  const [viewMode, setViewMode] = useState<'list' | 'manager-detail' | 'incoming-detail' | 'drone-detail'>('list');
  const [activeTab, setActiveTab] = useState<'current' | 'incoming'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [droneSubTab, setDroneSubTab] = useState<'Drones' | 'Pilots' | 'Support' | 'Maintenance'>('Drones');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Debounce search query to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Indian states list
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  useEffect(() => {
    fetchFleetManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, debouncedSearch, selectedState, selectedRegion, selectedStatus]);

  // Reset to first page whenever the tab, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, selectedState, selectedRegion, selectedStatus]);

  const fetchFleetManagers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sanitize search input
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';

      // Detect injection attempts
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'FleetManagementScreen search');
        if (Platform.OS === 'web') {
          window.alert('Invalid Input: Please enter a valid search query');
        } else {
          Alert.alert('Invalid Input', 'Please enter a valid search query');
        }
        setSearchQuery('');
        setIsSearching(false);
        setLoading(false);
        return;
      }

      console.log('Fetching fleet managers with params:', {
        page: currentPage,
        limit: 20,
        approvalStatus: activeTab === 'current' ? 'APPROVED' : 'PENDING',
        state: selectedState || undefined,
        region: selectedRegion || undefined,
        status: selectedStatus || undefined,
      });

      let response;
      if (activeTab === 'current') {
        response = await getFleetManagers({
          page: currentPage,
          limit: 20,
          approvalStatus: 'APPROVED',
          search: searchQuery || undefined,
          state: selectedState || undefined,
          region: selectedRegion || undefined,
          status: selectedStatus ? (selectedStatus as 'ACTIVE' | 'INACTIVE') : undefined,
        });
      } else {
        response = await getPendingFleetManagerRequests({
          page: currentPage,
          limit: 20,
          search: searchQuery || undefined,
        });
      }

      console.log('Fleet managers response:', response);

      // Handle response structure - API returns { success: true, data: { data: [...], pagination: {...} } }
      if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        if (activeTab === 'current') {
          setFleetManagersData(response.data.data);
        } else {
          setPendingRequestsData(response.data.data);
        }
        setTotalCount(response.data.pagination?.total || response.data.data.length);
      } else if (response && response.data && Array.isArray(response.data)) {
        // Fallback for simpler response structure
        if (activeTab === 'current') {
          setFleetManagersData(response.data);
        } else {
          setPendingRequestsData(response.data);
        }
        setTotalCount(response.pagination?.total || response.data.length);
      } else {
        console.warn('Unexpected response structure:', response);
        if (activeTab === 'current') {
          setFleetManagersData([]);
        } else {
          setPendingRequestsData([]);
        }
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Error fetching fleet managers:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        statusCode: err.statusCode,
      });
      setError(err.message || 'Failed to load fleet managers');
      if (activeTab === 'current') {
        setFleetManagersData([]);
      } else {
        setPendingRequestsData([]);
      }
      setTotalCount(0);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchFleetManagerDetails = async (fleetManagerId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching fleet manager details for:', fleetManagerId);

      const response = await getFleetManagerProfile(fleetManagerId);
      console.log('Fleet manager profile response:', response);

      if (response && response.fleetManager) {
        setSelectedFleetManager(response.fleetManager);

        // Fetch all related data in parallel
        await Promise.all([
          // Fetch drones
          getFleetManagerDrones(fleetManagerId, { limit: 100 })
            .then(dronesResponse => {
              console.log('Drones response:', dronesResponse);
              if (dronesResponse && dronesResponse.data && Array.isArray(dronesResponse.data)) {
                setDroneListData(dronesResponse.data);
              } else {
                setDroneListData([]);
              }
            })
            .catch(err => {
              console.error('Error fetching drones:', err);
              setDroneListData([]);
            }),

          // Fetch pilots
          getFleetManagerPilots(fleetManagerId, { limit: 100 })
            .then(pilotsResponse => {
              console.log('Pilots response:', pilotsResponse);
              if (pilotsResponse && pilotsResponse.data && Array.isArray(pilotsResponse.data)) {
                setPilotsListData(pilotsResponse.data);
              } else {
                setPilotsListData([]);
              }
            })
            .catch(err => {
              console.error('Error fetching pilots:', err);
              setPilotsListData([]);
            }),

          // Fetch maintenance tickets
          getFleetManagerMaintenanceTickets(fleetManagerId, { limit: 100 })
            .then(maintenanceResponse => {
              console.log('Maintenance tickets response:', maintenanceResponse);
              if (maintenanceResponse && maintenanceResponse.data && Array.isArray(maintenanceResponse.data)) {
                setMaintenanceTicketsData(maintenanceResponse.data);
              } else {
                setMaintenanceTicketsData([]);
              }
            })
            .catch(err => {
              console.error('Error fetching maintenance tickets:', err);
              setMaintenanceTicketsData([]);
            }),

          // Fetch support tickets
          getFleetManagerSupportTickets(fleetManagerId, { limit: 100 })
            .then(supportResponse => {
              console.log('Support tickets response:', supportResponse);
              if (supportResponse && supportResponse.data && Array.isArray(supportResponse.data)) {
                setSupportTicketsData(supportResponse.data);
              } else {
                setSupportTicketsData([]);
              }
            })
            .catch(err => {
              console.error('Error fetching support tickets:', err);
              setSupportTicketsData([]);
            }),
        ]);

        setViewMode('manager-detail');
      } else {
        console.error('Invalid profile response structure:', response);
        setError('Failed to load fleet manager profile');
      }
    } catch (err: any) {
      console.error('Error fetching fleet manager details:', err);
      setError(err.message || 'Failed to load fleet manager details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDroneDetails = async (droneId: string) => {
    try {
      setLoading(true);

      // Find the drone in the list
      const drone = droneListData.find(d => d.droneId === droneId);
      if (drone) {
        setSelectedDrone(drone);

        // Fetch bookings for this drone
        if (selectedFleetManager) {
          const bookingsResponse = await getFleetManagerBookings(selectedFleetManager.fleetManagerId, {
            limit: 50,
          });

          // Filter bookings for this specific drone
          const droneBookings = bookingsResponse.data.filter(b => (b.droneId || b.assignedDrone) === droneId);
          setMissionLogsData(droneBookings);
        }

        setViewMode('drone-detail');
      }
    } catch (err: any) {
      console.error('Error fetching drone details:', err);
      setError(err.message || 'Failed to load drone details');
    } finally {
      setLoading(false);
    }
  };

  // Handler for removing fleet manager
  const handleRemoveFleetManager = async () => {
    if (!selectedFleetManager) return;

    const performRemove = async () => {
      try {
        setLoading(true);
        await removeFleetManager(selectedFleetManager.fleetManagerId);
        if (Platform.OS === 'web') {
          window.alert('Fleet manager removed successfully');
        } else {
          Alert.alert('Success', 'Fleet manager removed successfully');
        }
        setViewMode('list');
        setSelectedFleetManager(null);
        fetchFleetManagers();
      } catch (err: any) {
        console.error('Error removing fleet manager:', err);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${err.message || 'Failed to remove fleet manager'}`);
        } else {
          Alert.alert('Error', err.message || 'Failed to remove fleet manager');
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to remove ${selectedFleetManager.fullName}? This action cannot be undone.`
      );
      if (confirmed) {
        await performRemove();
      }
    } else {
      Alert.alert(
        'Remove Fleet Manager',
        `Are you sure you want to remove ${selectedFleetManager.fullName}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performRemove,
          },
        ]
      );
    }
  };

  // Handler for removing drone from fleet manager
  const handleRemoveDrone = async () => {
    if (!selectedDrone || !selectedFleetManager) return;

    const performRemove = async () => {
      try {
        setLoading(true);
        await removeDroneFromFleetManager(
          selectedFleetManager.fleetManagerId,
          selectedDrone.droneId
        );
        if (Platform.OS === 'web') {
          window.alert('Drone removed successfully');
        } else {
          Alert.alert('Success', 'Drone removed successfully');
        }
        setViewMode('manager-detail');
        setSelectedDrone(null);
        // Refresh fleet manager details
        await fetchFleetManagerDetails(selectedFleetManager.fleetManagerId);
      } catch (err: any) {
        console.error('Error removing drone:', err);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${err.message || 'Failed to remove drone'}`);
        } else {
          Alert.alert('Error', err.message || 'Failed to remove drone');
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to unassign ${selectedDrone.model} from this fleet manager?`
      );
      if (confirmed) {
        await performRemove();
      }
    } else {
      Alert.alert(
        'Remove Drone',
        `Are you sure you want to unassign ${selectedDrone.model} from this fleet manager?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performRemove,
          },
        ]
      );
    }
  };

  // Handler for approving pending fleet manager request
  const handleApproveRequest = async (fleetManagerId: string) => {
    const performApprove = async () => {
      try {
        setLoading(true);
        await approveFleetManager(fleetManagerId);
        if (Platform.OS === 'web') {
          window.alert('Fleet manager request approved successfully');
        } else {
          Alert.alert('Success', 'Fleet manager request approved successfully');
        }
        fetchFleetManagers();
      } catch (err: any) {
        console.error('Error approving fleet manager:', err);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${err.message || 'Failed to approve request'}`);
        } else {
          Alert.alert('Error', err.message || 'Failed to approve request');
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to approve this fleet manager request?'
      );
      if (confirmed) {
        await performApprove();
      }
    } else {
      Alert.alert(
        'Approve Request',
        'Are you sure you want to approve this fleet manager request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            style: 'default',
            onPress: performApprove,
          },
        ]
      );
    }
  };

  // Handler for rejecting pending fleet manager request
  const handleRejectRequest = async (fleetManagerId: string) => {
    const performReject = async () => {
      try {
        setLoading(true);
        await rejectFleetManager(fleetManagerId);
        if (Platform.OS === 'web') {
          window.alert('Fleet manager request rejected');
        } else {
          Alert.alert('Success', 'Fleet manager request rejected');
        }
        fetchFleetManagers();
      } catch (err: any) {
        console.error('Error rejecting fleet manager:', err);
        if (Platform.OS === 'web') {
          window.alert(`Error: ${err.message || 'Failed to reject request'}`);
        } else {
          Alert.alert('Error', err.message || 'Failed to reject request');
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to reject this fleet manager request?'
      );
      if (confirmed) {
        await performReject();
      }
    } else {
      Alert.alert(
        'Reject Request',
        'Are you sure you want to reject this fleet manager request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: performReject,
          },
        ]
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
      case 'ACTIVE':
      case 'COMPLETED':
        return styles.statusGreen;
      case 'IN_USE':
      case 'ASSIGNED':
      case 'CONFIRMED':
      case 'IN_PROGRESS':
        return styles.statusBlue;
      case 'MAINTENANCE':
      case 'PENDING':
        return styles.statusRed;
      default:
        return styles.statusGray;
    }
  };

  // --- RENDERING ROUTER METHODS ---

  // Show loading spinner
  if (loading && !selectedFleetManager && !selectedDrone) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading...</Text>
      </View>
    );
  }

  // Show error message
  if (error && !selectedFleetManager) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ color: '#EF4444', fontSize: 16, marginBottom: 12 }}>⚠️ {error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={fetchFleetManagers}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Screen 1: Fleet Manager Profile Details
  const renderManagerDetailScreen = () => {
    if (!selectedFleetManager) return null;

    return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      {/* Breadcrumb Header */}
      {/* UPDATED: Added isMobile alignment conditions to stack breadcrumb columns and back links cleanly */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 12 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Fleet Managers</Text>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={{color: '#6B7280', fontSize: 12}}>{selectedFleetManager.fullName}</Text>
          </View>
          <Text style={styles.pageTitle}>Fleet Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Fleet Managers, Drones & Pilots</Text>
        </View>
        <TouchableOpacity
          style={[styles.backButton, isMobile && { alignItems: 'center', alignSelf: 'flex-start' }]}
          onPress={() => {
            setViewMode('list');
            setSelectedFleetManager(null);
            setDroneListData([]);
          }}
        >
          <Text style={styles.backButtonText}>← Back to Fleet Managers</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Header Card */}
      {/* UPDATED: Injected responsive conditional properties to wrap profiling segments vertically on phones */}
      <View style={[styles.profileHeaderCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.profileInfoLeft, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.avatarCircle, { backgroundColor: '#3B82F6' }, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.avatarText}>{selectedFleetManager.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}</Text>
          </View>
          <View style={!isMobile && { marginLeft: 16 }}>
            <Text style={styles.profileNameText}>{selectedFleetManager.fullName}</Text>
            <Text style={styles.profileRoleText}>Fleet Manager</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' }}>
              <Text style={selectedFleetManager.status === 'ACTIVE' ? styles.tagOnline : styles.statusGray}>
                {selectedFleetManager.status}
              </Text>
              <Text style={styles.tagLocation}>{selectedFleetManager.state}</Text>
              <Text style={styles.tagLocation}>{selectedFleetManager.region}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.removeBtn, isMobile && { alignSelf: 'stretch', alignItems: 'center' }]} onPress={handleRemoveFleetManager}>
          <Text style={styles.removeBtnText}>Remove Fleet Manager</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Info Grid Layout Split */}
      {/* UPDATED: Shifts side-by-side informational grids into clean cascading panels */}
      <View style={[styles.infoGridRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.infoCard, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 12 }]}>
          <Text style={styles.infoCardTitle}>Profile Information</Text>

          <View style={styles.infoRow}>
            <PersonIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Fleet Manager ID: <Text style={styles.boldText}>{selectedFleetManager.fleetManagerId}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <DroneIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Total Drones: <Text style={styles.boldText}>{selectedFleetManager.assignedDrones}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <PilotIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Total Pilots: <Text style={styles.boldText}>{selectedFleetManager.assignedPilots}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <CheckCircleIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Completed Bookings: <Text style={styles.boldText}>{selectedFleetManager.completedBookings}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <LocationIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Region: <Text style={styles.boldText}>{selectedFleetManager.region}, {selectedFleetManager.state}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <ActivityIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Rating: <Text style={styles.boldText}>{selectedFleetManager.rating}/5</Text></Text>
          </View>
        </View>

        <View style={[styles.infoCard, isMobile ? { marginLeft: 0 } : { marginLeft: 12 }]}>
          <Text style={styles.infoCardTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <CalenderIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Joining Date: <Text style={styles.boldText}>{formatDate(selectedFleetManager.createdAt)}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Total Revenue: <Text style={styles.boldText}>₹{selectedFleetManager.totalRevenue.toLocaleString()}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <EmailIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Email: <Text style={styles.boldText}>{selectedFleetManager.email}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <CallIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Mobile: <Text style={styles.boldText}>{selectedFleetManager.mobile}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>License: <Text style={styles.boldText}>{selectedFleetManager.licenseNumber}</Text></Text>
          </View>
        </View>
      </View>

      {/* Geospatial Map Visualizer Container Placeholder */}
      <View style={styles.mapVisualContainer}>
        <Text style={styles.mapLiveIndicator}>Live Tracking</Text>
        <Text style={[styles.mapPlaceholderText, isMobile && { textAlign: 'center', paddingHorizontal: 12 }]}>[ Satellite Map View Overlay - Tracking Active Drones ]</Text>
      </View>

      {/* Sub tabs filtering block */}
      {/* UPDATED: Wrapped tabs row into horizontal scroll tracking on compact viewports */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={[styles.tabSubRowContainer, { marginBottom: 16 }]}>
        <View style={styles.tabButtonGroup}>
          {['Drones', 'Pilots', 'Support', 'Maintenance Tickets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, droneSubTab === tab.split(' ')[0] && styles.tabButtonActive]}
              onPress={() => setDroneSubTab(tab.split(' ')[0] as any)}
            >
              <Text style={[styles.tabButtonText, droneSubTab === tab.split(' ')[0] && styles.tabButtonTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Inner Nested Table Module - Cards on mobile, table on desktop */}
      {isMobile ? (
        <View>
          {droneSubTab === 'Drones' && (
            <>
              <View style={styles.tableSummaryHeader}>
                <Text style={styles.tableSummaryCountText}>Total Drones: <Text style={styles.boldText}>{droneListData.length}</Text></Text>
              </View>
              {droneListData.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>No drones found</Text>
                </View>
              ) : (
                droneListData.map((drone, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.mobileCard}
                    onPress={() => fetchDroneDetails(drone.droneId)}
                  >
                    <View style={styles.mobileCardHeader}>
                      <Text style={styles.mobileCardTitle}>{drone.model}</Text>
                      <Text style={[styles.statusBadge, getStatusColor(drone.status)]}>{drone.status}</Text>
                    </View>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Drone ID: </Text>{drone.droneId}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Total Missions: </Text>{drone.missions}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Last Flight: </Text>{drone.lastFlightAt ? formatDate(drone.lastFlightAt) : 'N/A'}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Battery Health: </Text>{drone.batteryHealth}%</Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {droneSubTab === 'Pilots' && (
            <>
              <View style={styles.tableSummaryHeader}>
                <Text style={styles.tableSummaryCountText}>Total Pilots: <Text style={styles.boldText}>{pilotsListData.length}</Text></Text>
              </View>
              {pilotsListData.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>No pilots found</Text>
                </View>
              ) : (
                pilotsListData.map((pilot, idx) => (
                  <View key={idx} style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                      <Text style={styles.mobileCardTitle}>{pilot.fullName}</Text>
                      <Text style={[styles.statusBadge, getStatusColor(pilot.status)]}>{pilot.status}</Text>
                    </View>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Pilot ID: </Text>{pilot.pilotId}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Rating: </Text>⭐ {pilot.rating.toFixed(1)}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Flight Hours: </Text>{pilot.flightHours}h</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Missions: </Text>{pilot.completedMissions}/{pilot.missions}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Last Active: </Text>{pilot.lastActiveAt ? formatDate(pilot.lastActiveAt) : 'N/A'}</Text>
                  </View>
                ))
              )}
            </>
          )}

          {droneSubTab === 'Support' && (
            <>
              <View style={styles.tableSummaryHeader}>
                <Text style={styles.tableSummaryCountText}>Total Support Tickets: <Text style={styles.boldText}>{supportTicketsData.length}</Text></Text>
              </View>
              {supportTicketsData.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>No support tickets found</Text>
                </View>
              ) : (
                supportTicketsData.map((ticket, idx) => (
                  <View key={idx} style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                      <Text style={styles.mobileCardTitle}>{ticket.ticketNumber}</Text>
                      <Text style={[styles.statusBadge,
                        ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? styles.statusGreen :
                        ticket.status === 'IN_PROGRESS' ? styles.statusBlue : styles.statusGray
                      ]}>{ticket.status}</Text>
                    </View>
                    <Text style={styles.mobileCardRow} numberOfLines={2}><Text style={styles.mobileCardLabel}>Subject: </Text>{ticket.subject}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Category: </Text>{ticket.category}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={styles.mobileCardLabel}>Priority: </Text>
                      <Text style={[styles.statusBadge,
                        ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? styles.statusRed :
                        ticket.priority === 'NORMAL' ? styles.statusBlue : styles.statusGray
                      ]}>{ticket.priority}</Text>
                    </View>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Created: </Text>{formatDate(ticket.createdAt)}</Text>
                    {ticket.customerSatisfactionRating && (
                      <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Rating: </Text>⭐ {ticket.customerSatisfactionRating}</Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {droneSubTab === 'Maintenance' && (
            <>
              <View style={styles.tableSummaryHeader}>
                <Text style={styles.tableSummaryCountText}>Total Maintenance Tickets: <Text style={styles.boldText}>{maintenanceTicketsData.length}</Text></Text>
              </View>
              {maintenanceTicketsData.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 14 }}>No maintenance tickets found</Text>
                </View>
              ) : (
                maintenanceTicketsData.map((ticket, idx) => (
                  <View key={idx} style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                      <Text style={styles.mobileCardTitle}>{ticket.ticketNumber}</Text>
                      <Text style={[styles.statusBadge,
                        ticket.status === 'COMPLETED' ? styles.statusGreen :
                        ticket.status === 'IN_PROGRESS' ? styles.statusBlue :
                        ticket.status === 'OPEN' ? styles.statusRed : styles.statusGray
                      ]}>{ticket.status}</Text>
                    </View>
                    <Text style={styles.mobileCardRow} numberOfLines={2}><Text style={styles.mobileCardLabel}>Title: </Text>{ticket.title}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Drone ID: </Text>{ticket.droneId}</Text>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Category: </Text>{ticket.category}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={styles.mobileCardLabel}>Priority: </Text>
                      <Text style={[styles.statusBadge,
                        ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? styles.statusRed :
                        ticket.priority === 'NORMAL' ? styles.statusBlue : styles.statusGray
                      ]}>{ticket.priority}</Text>
                    </View>
                    <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Created: </Text>{formatDate(ticket.createdAt)}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      ) : (
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
        {droneSubTab === 'Drones' && (
          <>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>Total Drones: <Text style={styles.boldText}>{droneListData.length}</Text></Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Drone Model ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Drone ID ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Drone Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Total Missions ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Last Flight ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Battery Health ▲</Text>
            </View>

            {droneListData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>No drones found</Text>
              </View>
            ) : (
              droneListData.map((drone, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.tableBodyRow}
                  onPress={() => fetchDroneDetails(drone.droneId)}
                >
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{drone.model}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{drone.droneId}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.statusBadge, getStatusColor(drone.status)]}>{drone.status}</Text>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{drone.missions}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{drone.lastFlightAt ? formatDate(drone.lastFlightAt) : 'N/A'}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{drone.batteryHealth}%</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {droneSubTab === 'Pilots' && (
          <>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>Total Pilots: <Text style={styles.boldText}>{pilotsListData.length}</Text></Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Pilot Name ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Pilot ID ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Rating ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Flight Hours ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Missions ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Last Active ▲</Text>
            </View>

            {pilotsListData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>No pilots found</Text>
              </View>
            ) : (
              pilotsListData.map((pilot, idx) => (
                <View key={idx} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{pilot.fullName}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{pilot.pilotId}</Text>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.statusBadge, getStatusColor(pilot.status)]}>{pilot.status}</Text>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>⭐ {pilot.rating.toFixed(1)}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{pilot.flightHours}h</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{pilot.completedMissions}/{pilot.missions}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{pilot.lastActiveAt ? formatDate(pilot.lastActiveAt) : 'N/A'}</Text>
                </View>
              ))
            )}
          </>
        )}

        {droneSubTab === 'Support' && (
          <>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>Total Support Tickets: <Text style={styles.boldText}>{supportTicketsData.length}</Text></Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Ticket Number ▲</Text>
              <Text style={[styles.headerCell, { flex: 2.5 }]}>Subject ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Category ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Priority ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Created Date ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Rating ▲</Text>
            </View>

            {supportTicketsData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>No support tickets found</Text>
              </View>
            ) : (
              supportTicketsData.map((ticket, idx) => (
                <View key={idx} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{ticket.ticketNumber}</Text>
                  <Text style={[styles.bodyCell, { flex: 2.5 }]} numberOfLines={1}>{ticket.subject}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.category}</Text>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.statusBadge,
                      ticket.priority === 'URGENT' ? styles.statusRed :
                      ticket.priority === 'HIGH' ? styles.statusRed :
                      ticket.priority === 'NORMAL' ? styles.statusBlue : styles.statusGray
                    ]}>{ticket.priority}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.statusBadge,
                      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? styles.statusGreen :
                      ticket.status === 'IN_PROGRESS' ? styles.statusBlue : styles.statusGray
                    ]}>{ticket.status}</Text>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(ticket.createdAt)}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>
                    {ticket.customerSatisfactionRating ? `⭐ ${ticket.customerSatisfactionRating}` : '-'}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        {droneSubTab === 'Maintenance' && (
          <>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>Total Maintenance Tickets: <Text style={styles.boldText}>{maintenanceTicketsData.length}</Text></Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Ticket Number ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Title ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Drone ID ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Category ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Priority ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Created Date ▲</Text>
            </View>

            {maintenanceTicketsData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>No maintenance tickets found</Text>
              </View>
            ) : (
              maintenanceTicketsData.map((ticket, idx) => (
                <View key={idx} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{ticket.ticketNumber}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]} numberOfLines={1}>{ticket.title}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.droneId}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.category}</Text>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.statusBadge,
                      ticket.priority === 'URGENT' ? styles.statusRed :
                      ticket.priority === 'HIGH' ? styles.statusRed :
                      ticket.priority === 'NORMAL' ? styles.statusBlue : styles.statusGray
                    ]}>{ticket.priority}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.statusBadge,
                      ticket.status === 'COMPLETED' ? styles.statusGreen :
                      ticket.status === 'IN_PROGRESS' ? styles.statusBlue :
                      ticket.status === 'OPEN' ? styles.statusRed : styles.statusGray
                    ]}>{ticket.status}</Text>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(ticket.createdAt)}</Text>
                </View>
              ))
            )}
          </>
        )}
        </View>
      </ScrollView>
      )}
    </ScrollView>
  );
};

  // Screen 2: Incoming Requests Profile Application Details
  const renderIncomingDetailScreen = () => (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 12 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Fleet Managers</Text>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={{color: '#6B7280', fontSize: 12}}>{selectedFleetManager?.fullName || 'Incoming'} (Incoming)</Text>
          </View>
          <Text style={styles.pageTitle}>Fleet Management</Text>
        </View>
        <TouchableOpacity style={[styles.backButton, isMobile && { alignSelf: 'flex-start' }]} onPress={() => setViewMode('list')}>
          <Text style={styles.backButtonText}>← Back to Fleet Managers</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.profileHeaderCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.profileInfoLeft, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.avatarCircle, { backgroundColor: '#6B7280' }, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.avatarText}>
              {(selectedFleetManager?.fullName || 'NK').split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          <View style={!isMobile && { marginLeft: 16 }}>
            <Text style={styles.profileNameText}>{selectedFleetManager?.fullName || 'Incoming Request'}</Text>
            <Text style={styles.profileRoleText}>Fleet Manager Application</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' }}>
              <Text style={styles.tagOnline}>{selectedFleetManager?.status || 'PENDING'}</Text>
              <Text style={styles.tagLocation}>{selectedFleetManager?.state}</Text>
              <Text style={styles.tagLocation}>{selectedFleetManager?.region}</Text>
            </View>
          </View>
        </View>
        <View style={[{ flexDirection: 'row' }, isMobile && { alignSelf: 'stretch', justifyContent: 'space-between' }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#2563EB', marginRight: 12 }, isMobile && { flex: 1 }]}
            onPress={() => selectedFleetManager && handleApproveRequest(selectedFleetManager.fleetManagerId)}
          >
            <Text style={{ color: '#2563EB', fontWeight: '600' }}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#EF4444' }, isMobile && { flex: 1 }]}
            onPress={() => selectedFleetManager && handleRejectRequest(selectedFleetManager.fleetManagerId)}
          >
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.infoGridRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.infoCard, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 12 }]}>
          <Text style={styles.infoCardTitle}>Profile Information</Text>

          <View style={styles.infoRow}>
            <LocationIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>State: <Text style={styles.boldText}>{selectedFleetManager?.state}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <LocationIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Region: <Text style={styles.boldText}>{selectedFleetManager?.region}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <HomeIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Fleet Manager ID: <Text style={styles.boldText}>{selectedFleetManager?.fleetManagerId}</Text></Text>
          </View>
        </View>

        <View style={[styles.infoCard, isMobile ? { marginLeft: 0 } : { marginLeft: 12 }]}>
          <Text style={styles.infoCardTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <CalenderIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Application Date: <Text style={styles.boldText}>{selectedFleetManager ? formatDate(selectedFleetManager.createdAt) : 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <EmailIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Email: <Text style={styles.boldText}>{selectedFleetManager?.email}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <CallIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Mobile: <Text style={styles.boldText}>{selectedFleetManager?.mobile}</Text></Text>
          </View>

          <View style={styles.infoRow}>
            <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>License: <Text style={[styles.boldText, {color: '#2563EB'}]}>{selectedFleetManager?.licenseNumber || 'N/A'}</Text></Text>
          </View>
        </View>
      </View>

      {/* Submitted Form Details Section */}
      {(selectedFleetManager as any)?.formData && Object.keys((selectedFleetManager as any).formData).length > 0 && (
        <View style={styles.infoCardFull}>
          <Text style={styles.infoCardTitle}>All Submitted Form Details</Text>
          <View style={styles.formEntriesGrid}>
            {Object.entries((selectedFleetManager as any).formData)
              .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')
              .map(([key, val]) => (
                <View key={key} style={styles.formEntryItem}>
                  <Text style={styles.formEntryKey}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.formEntryVal}>{String(val)}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Uploaded Documents Section */}
      {Array.isArray((selectedFleetManager as any)?.documents) && (selectedFleetManager as any).documents.length > 0 && (
        <View style={styles.infoCardFull}>
          <Text style={styles.infoCardTitle}>
            Uploaded Documents ({(selectedFleetManager as any).documents.length})
          </Text>
          <View style={styles.documentsGrid}>
            {(selectedFleetManager as any).documents.map((doc: any, idx: number) => {
              const url = doc.downloadUrl || doc.url;
              const isPdf = url && (url.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf');
              return (
                <View key={`${doc.type}-${idx}`} style={styles.docCard}>
                  {url && !isPdf ? (
                    <TouchableOpacity
                      style={styles.docImageTouch}
                      onPress={() => {
                        setPreviewImageUrl(url);
                        setPreviewImageTitle(doc.name || doc.type || 'Document');
                      }}
                    >
                      <Image source={{ uri: url }} style={styles.docPreviewImage} resizeMode="cover" />
                      <View style={styles.imageOverlayBadge}>
                        <Text style={styles.imageOverlayText}>🔍 View Image</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.docPdfPlaceholder}>
                      <Text style={styles.pdfIconText}>📄</Text>
                      <Text style={styles.pdfLabelText}>{isPdf ? 'PDF Document' : 'File'}</Text>
                    </View>
                  )}
                  <View style={styles.docCardFooter}>
                    <Text style={styles.docCardName} numberOfLines={1}>
                      {doc.name || (doc.type || '').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    {url ? (
                      <View style={styles.docCardActionsRow}>
                        <TouchableOpacity
                          style={styles.viewDocBtn}
                          onPress={() => {
                            if (url && !isPdf) {
                              setPreviewImageUrl(url);
                              setPreviewImageTitle(doc.name || doc.type || 'Document');
                            } else if (Platform.OS === 'web') {
                              (window as any).open(url, '_blank');
                            } else {
                              showAlert(url);
                            }
                          }}
                        >
                          <Text style={styles.viewDocBtnText}>View</Text>
                        </TouchableOpacity>
                        {Platform.OS === 'web' && (
                          <TouchableOpacity
                            style={styles.openExternalBtn}
                            onPress={() => (window as any).open(url, '_blank')}
                          >
                            <Text style={styles.openExternalBtnText}>↗</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.docMissingText}>No file attached</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );

  // Screen 3: Drone Asset Lifecycle Details
  const renderDroneDetailScreen = () => {
    if (!selectedDrone) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text>No drone selected</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
        <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={isMobile && { marginBottom: 12 }}>
            <View style={styles.breadcrumbContainer}>
              <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.breadcrumbSeparator}>&gt;</Text>
              <Text style={styles.breadcrumbActive}>Fleet Management</Text>
              <Text style={styles.breadcrumbSeparator}>&gt;</Text>
              <Text style={{color: '#6B7280', fontSize: 12}}>{selectedFleetManager?.fullName || 'Fleet Manager'}</Text>
              <Text style={styles.breadcrumbSeparator}>&gt;</Text>
              <Text style={{color: '#6B7280', fontSize: 12}}>{selectedDrone.model}</Text>
            </View>
            <Text style={styles.pageTitle}>Fleet Management</Text>
          </View>
          <TouchableOpacity style={[styles.backButton, isMobile && { alignSelf: 'flex-start' }]} onPress={() => setViewMode('manager-detail')}>
            <Text style={styles.backButtonText}>← Back to Fleet Manager</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.profileHeaderCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={[styles.profileInfoLeft, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
            <View style={[styles.avatarCircle, { backgroundColor: '#8B5CF6' }, isMobile && { marginBottom: 12 }]}>
              <DroneIcon width={28} height={28} fill="#FFFFFF" />
            </View>
            <View style={!isMobile && { marginLeft: 16 }}>
              <Text style={styles.profileNameText}>{selectedDrone.model}</Text>
              <Text style={styles.profileRoleText}>Drone • {selectedDrone.manufacturer}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.statusBadge, getStatusColor(selectedDrone.status)]}>{selectedDrone.status}</Text>
                {selectedFleetManager?.state && (
                  <Text style={styles.tagLocation}>{selectedFleetManager.state}</Text>
                )}
                {selectedFleetManager?.district && (
                  <Text style={styles.tagLocation}>{selectedFleetManager.district}</Text>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.removeBtn, isMobile && { alignSelf: 'stretch', alignItems: 'center' }]} onPress={handleRemoveDrone}>
            <Text style={styles.removeBtnText}>Remove Drone</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoGridRow, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.infoCard, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 12 }]}>
            <Text style={styles.infoCardTitle}>Drone Information</Text>

            <View style={styles.infoRow}>
              <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Drone ID: <Text style={styles.boldText}>{selectedDrone.droneId}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <DroneIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Manufacturer: <Text style={styles.boldText}>{selectedDrone.manufacturer}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Serial Number: <Text style={styles.boldText}>{selectedDrone.serialNumber}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <DroneIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Total Missions: <Text style={styles.boldText}>{selectedDrone.missions}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <ClockIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Flight Hours: <Text style={styles.boldText}>{selectedDrone.flightHours}h</Text></Text>
            </View>
          </View>

          <View style={[styles.infoCard, isMobile ? { marginLeft: 0 } : { marginLeft: 12 }]}>
            <Text style={styles.infoCardTitle}>Drone Account Details</Text>

            <View style={styles.infoRow}>
              <CalenderIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Onboarding Date: <Text style={styles.boldText}>{formatDate(selectedDrone.createdAt)}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <ActivityIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Battery Health: <Text style={styles.boldText}>{selectedDrone.batteryHealth}%</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <ClockIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Last Flight: <Text style={styles.boldText}>{selectedDrone.lastFlightAt ? formatDate(selectedDrone.lastFlightAt) : 'N/A'}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Registration: <Text style={styles.boldText}>{selectedDrone.registrationNumber}</Text></Text>
            </View>

            <View style={styles.infoRow}>
              <CheckCircleIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
              <Text style={styles.infoItem}>Completed: <Text style={styles.boldText}>{selectedDrone.completedMissions}/{selectedDrone.missions}</Text></Text>
            </View>
          </View>
        </View>

        <View style={styles.mapVisualContainer}>
          <Text style={styles.mapLiveIndicator}>Live Tracking</Text>
          {selectedDrone.currentPilotId && (
            <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#6B7280' }}>
              Current Pilot: {selectedDrone.currentPilotId}
            </Text>
          )}
          {selectedDrone.currentBookingId && (
            <Text style={{ textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
              Booking: {selectedDrone.currentBookingId}
            </Text>
          )}
        </View>

        {/* Service Capabilities */}
        {selectedDrone.serviceCapabilities && selectedDrone.serviceCapabilities.length > 0 && (
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <Text style={styles.infoCardTitle}>Service Capabilities</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {selectedDrone.serviceCapabilities.map((service, idx) => (
                <Text key={idx} style={[styles.statusBadge, styles.statusBlue, { margin: 4 }]}>{service}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Maintenance Information */}
        {(selectedDrone.lastMaintenance || selectedDrone.nextMaintenance) && (
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <Text style={styles.infoCardTitle}>Maintenance Schedule</Text>
            {selectedDrone.lastMaintenance && (
              <View style={styles.infoRow}>
                <ClockIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
                <Text style={styles.infoItem}>Last Maintenance: <Text style={styles.boldText}>{formatDate(selectedDrone.lastMaintenance)}</Text></Text>
              </View>
            )}
            {selectedDrone.nextMaintenance && (
              <View style={styles.infoRow}>
                <CalenderIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
                <Text style={styles.infoItem}>Next Maintenance: <Text style={styles.boldText}>{formatDate(selectedDrone.nextMaintenance)}</Text></Text>
              </View>
            )}
          </View>
        )}

        {/* Historical Mission Tables Summary - Cards on mobile, table on desktop */}
        <View style={styles.tableSummaryHeader}>
          <Text style={styles.tableSummaryCountText}>Total Missions: <Text style={styles.boldText}>{missionLogsData.length}</Text></Text>
        </View>

        {missionLogsData.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 16 }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>No mission logs found</Text>
          </View>
        ) : isMobile ? (
          <View style={{ marginTop: 8 }}>
            {missionLogsData.map((mission, idx) => {
              const statusVal = (mission.bookingStatus || mission.status || 'N/A').toUpperCase();
              const priceVal = mission.price?.total || mission.finalPrice || 0;
              return (
                <View key={idx} style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <Text style={styles.mobileCardTitle}>{mission.serviceType || 'N/A'}</Text>
                    <Text style={[styles.statusBadge,
                      statusVal === 'COMPLETED' ? styles.statusGreen :
                      statusVal === 'IN_PROGRESS' ? styles.statusBlue : styles.statusGray
                    ]}>{statusVal}</Text>
                  </View>
                  <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Customer: </Text>{mission.customerId || 'N/A'}</Text>
                  <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Price: </Text>₹{priceVal.toLocaleString()}</Text>
                  <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Fleet Manager: </Text>{mission.fleetManagerId || 'N/A'}</Text>
                  <Text style={styles.mobileCardRow}><Text style={styles.mobileCardLabel}>Pilot: </Text>{mission.pilotId || mission.assignedPilot || 'N/A'}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900), marginTop: 8 }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Service Name ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Customer Name ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Status ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Price (₹) ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Fleet Manager ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Drone Pilot ▲</Text>
              </View>
              {missionLogsData.map((mission, idx) => {
                const statusVal = (mission.bookingStatus || mission.status || 'N/A').toUpperCase();
                const priceVal = mission.price?.total || mission.finalPrice || 0;
                return (
                  <View key={idx} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2 }]}>{mission.serviceType || 'N/A'}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{mission.customerId || 'N/A'}</Text>
                    <View style={{ flex: 1.5 }}>
                      <Text style={[
                        styles.statusBadge,
                        statusVal === 'COMPLETED' ? styles.statusGreen :
                        statusVal === 'IN_PROGRESS' ? styles.statusBlue : styles.statusGray
                      ]}>{statusVal}</Text>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>₹{priceVal.toLocaleString()}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{mission.fleetManagerId || 'N/A'}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{mission.pilotId || mission.assignedPilot || 'N/A'}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    );
  };

  // Render Core Master Dashboard Gateway Entry Router
  if (viewMode === 'manager-detail') return renderManagerDetailScreen();
  if (viewMode === 'incoming-detail') return renderIncomingDetailScreen();
  if (viewMode === 'drone-detail') return renderDroneDetailScreen();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Top Breadcrumb & Header Row */}
      {/* UPDATED: Search boxes expand to fill full container widths on mobile viewports */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Fleet Management</Text>
          </View>
          <Text style={styles.pageTitle}>Fleet Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Fleet Managers, Drones & Pilots</Text>
        </View>

        {/* Universal Search Bar */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Fleet Managers (name, ID, email)"
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
            <SearchIcon width={16} height={16} fill="#9CA3AF" />
          )}
        </View>
      </View>

      {/* Primary Filtering Action Bar */}
      {/* UPDATED: Adjusts sub action modules to stack cleanly under 768px */}
      <View style={[styles.filterBarRow, { position: 'relative' as any, zIndex: 100 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[styles.tabButtonGroup, isMobile && { marginBottom: 12 }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'current' && styles.tabButtonTextActive]} numberOfLines={1}>
              Current Fleet Managers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'incoming' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('incoming')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'incoming' && styles.tabButtonTextActive]} numberOfLines={1}>
              Incoming Requests
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.rightFilterGroup, isMobile && { justifyContent: 'space-between' }]}>
          {/* State Filter Dropdown */}
          <View style={[{ position: 'relative', zIndex: 101 }, isMobile && { flex: 1 }]}>
            <TouchableOpacity
              style={[styles.dropdownTrigger, isMobile && { justifyContent: 'space-between' }]}
              onPress={() => setShowStateDropdown(!showStateDropdown)}
            >
              <Text style={styles.dropdownText}>
                {selectedState || 'All States'}
              </Text>
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

                {/* Dropdown Menu */}
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedState('');
                      setSelectedRegion('');
                      setShowStateDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, !selectedState && styles.dropdownItemTextActive]}>
                      All States
                    </Text>
                  </TouchableOpacity>

                  <ScrollView style={{ maxHeight: 300 }}>
                    {indianStates.map((state) => (
                      <TouchableOpacity
                        key={state}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedState(state);
                          setSelectedRegion(''); // Reset region when state changes
                          setShowStateDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, selectedState === state && styles.dropdownItemTextActive]}>
                          {state}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>

          {/* Status Filter Dropdown */}
          <View style={[styles.dropdownTrigger, { marginLeft: 8 }]}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              onPress={() => {
                // Toggle status dropdown
                const newState = !showStatusDropdown;
                setShowStatusDropdown(newState);
                if (newState) setShowStateDropdown(false);
              }}
            >
              <Text style={{ fontSize: 13, color: '#374151', marginRight: 20 }}>
                {selectedStatus === '' ? 'All Status' : selectedStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Text>
              <Text style={[styles.dropdownArrow, { pointerEvents: 'none' as any }]}>▼</Text>
            </TouchableOpacity>

            {showStatusDropdown && (
              <>
                <TouchableOpacity
                  style={{
                    position: 'fixed' as any,
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9998,
                  }}
                  onPress={() => setShowStatusDropdown(false)}
                />

                {/* Status Dropdown Menu */}
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStatus('');
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, !selectedStatus && styles.dropdownItemTextActive]}>
                      All Status
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStatus('ACTIVE');
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedStatus === 'ACTIVE' && styles.dropdownItemTextActive]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStatus('INACTIVE');
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedStatus === 'INACTIVE' && styles.dropdownItemTextActive]}>
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Clear Filters Button */}
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => {
              setSelectedState('');
              setSelectedRegion('');
              setSelectedStatus('');
              setSearchQuery('');
            }}
          >
            <Text>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Module Container */}
      {/* ADDED: Horizontal ScrollView wrapper engine around core directory lists */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
          <View style={styles.tableSummaryHeader}>
            <Text style={styles.tableSummaryCountText}>
              {activeTab === 'current' ? 'Total Fleet Managers: ' : 'Pending Requests: '}
              <Text style={styles.boldText}>{totalCount}</Text>
            </Text>
            {activeTab === 'current' && (
              <Text style={styles.statusBreakdownText}>
                Active <Text style={{color: '#10B981', fontWeight: '700'}}>
                  {fleetManagersData.filter(fm => fm.status === 'ACTIVE').length}
                </Text>  |  Inactive <Text style={{color: '#EF4444', fontWeight: '700'}}>
                  {fleetManagersData.filter(fm => fm.status === 'INACTIVE').length}
                </Text>
              </Text>
            )}
          </View>

          {/* Dynamic List Render Matrix Row headers */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Name ▲</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Fleet Manager ID ▲</Text>
            {activeTab === 'current' ? (
              <>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Total Drones ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Total Missions ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Joining Date ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>State ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Region ▲</Text>
              </>
            ) : (
              <>
                <Text style={[styles.headerCell, { flex: 2 }]}>Email ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Mobile ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Request Date ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>State ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>Actions</Text>
              </>
            )}
          </View>

          {/* Fleet Managers List */}
          {(activeTab === 'current' ? fleetManagersData : pendingRequestsData).length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>
                {activeTab === 'current' ? 'No fleet managers found' : 'No pending requests'}
              </Text>
            </View>
          ) : (
            (activeTab === 'current' ? fleetManagersData : pendingRequestsData).map((item, index) => (
              <View
                key={`fleet-${index}`}
                style={styles.tableBodyRow}
              >
                {activeTab === 'current' ? (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', flex: 1 }}
                    onPress={() => fetchFleetManagerDetails(item.fleetManagerId)}
                  >
                    <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{item.fullName}</Text>
                    <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]}>{item.fleetManagerId}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.assignedDrones}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.completedBookings}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(item.createdAt)}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{item.state}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.region}</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2 }]}>{item.fullName}</Text>
                    <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]}>{item.fleetManagerId}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{item.email}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.mobile}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(item.createdAt)}</Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{item.state}</Text>
                    <View style={{ flex: 2, flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
                        onPress={() => handleApproveRequest(item.fleetManagerId)}
                      >
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleRejectRequest(item.fleetManagerId)}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))
          )}

          {/* Pagination controls */}
          {totalCount >= 0 && (
            <Pagination
              page={currentPage}
              totalPages={Math.max(1, Math.ceil(totalCount / 20))}
              totalCount={totalCount}
              pageSize={20}
              onPageChange={setCurrentPage}
              itemLabel="fleet managers"
            />
          )}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        transparent
        visible={!!previewImageUrl}
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle} numberOfLines={1}>
                {previewImageTitle || 'Document Preview'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {Platform.OS === 'web' && previewImageUrl && (
                  <TouchableOpacity
                    style={styles.modalExternalBtn}
                    onPress={() => (window as any).open(previewImageUrl, '_blank')}
                  >
                    <Text style={styles.modalExternalBtnText}>Open Original ↗</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeImageModalBtn}
                  onPress={() => setPreviewImageUrl(null)}
                >
                  <Text style={styles.closeImageModalText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            {previewImageUrl && (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Global UI Layout Stylesheets
const styles = StyleSheet.create({
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    borderColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
  },
  pageBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  paginationText: {
    color: '#6B7280',
    fontSize: 14,
  },
  infoCardFull: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginTop: 16,
  },
  formEntriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  formEntryItem: {
    minWidth: 180,
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formEntryKey: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  formEntryVal: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  docCard: {
    width: 220,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  docImageTouch: {
    width: '100%',
    height: 140,
    backgroundColor: '#EEF2FF',
    position: 'relative',
  },
  docPreviewImage: {
    width: '100%',
    height: 140,
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  docPdfPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pdfIconText: {
    fontSize: 36,
  },
  pdfLabelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  docCardFooter: {
    padding: 10,
  },
  docCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  docCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDocBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDocBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  openExternalBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  openExternalBtnText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  docMissingText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  imageModalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  modalExternalBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeImageModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeImageModalText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  fullPreviewImage: {
    width: '100%',
    height: 500,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breadcrumbHome: { fontSize: 12 },
  breadcrumbSeparator: { marginHorizontal: 6, color: '#9CA3AF', fontSize: 11 },
  breadcrumbActive: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  breadcrumbText: { fontSize: 13, color: '#4B5563', marginBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  backButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, backgroundColor: '#FFF' },
  backButtonText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    width: 290,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', outlineStyle: 'none' as any },
  searchIcon: { fontSize: 14, color: '#9CA3AF' },
  filterBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  tabButtonGroup: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 4 },
  tabSubRowContainer: { flexDirection: 'row' },
  tabButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
  tabButtonActive: { backgroundColor: '#2563EB' },
  tabButtonText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  tabButtonTextActive: { color: '#FFFFFF' },
  rightFilterGroup: { flexDirection: 'row', alignItems: 'center' },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF', position: 'relative' as any },
  dropdownText: { fontSize: 13, color: '#374151', marginRight: 8 },
  dropdownArrow: { fontSize: 9, color: '#6B7280' },
  dropdownMenu: {
    position: 'absolute' as any,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' as any,
    zIndex: 9999,
    minWidth: 200,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  filterIconBtn: { marginLeft: 8, padding: 4 },
  profileHeaderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  profileInfoLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  profileNameText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileRoleText: { fontSize: 13, color: '#6B7280' },
  tagOnline: { backgroundColor: '#E6F4EA', color: '#137333', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 6, fontWeight: '600', marginBottom: 4 },
  tagLocation: { backgroundColor: '#F1F3F4', color: '#3C4043', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 6, marginBottom: 4 },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#EF4444', borderRadius: 8 },
  removeBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  actionBtn: { paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  infoGridRow: { flexDirection: 'row', marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 6 },
  // Styled wrapper row container for inline icons and their labels
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoItem: { fontSize: 13, color: '#4B5563', flex: 1, flexWrap: 'wrap' },
  mapVisualContainer: { height: 180, backgroundColor: '#E5E7EB', borderRadius: 12, marginBottom: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mapLiveIndicator: { position: 'absolute', top: 12, left: 12, backgroundColor: '#EF4444', color: '#FFF', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontWeight: '700' },
  mapPlaceholderText: { color: '#6B7280', fontSize: 13 },
  tableCardContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  tableSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  tableSummaryCountText: { fontSize: 13, color: '#4B5563' },
  boldText: { fontWeight: '700', color: '#111827' },
  statusBreakdownText: { fontSize: 12, color: '#6B7280' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerCell: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tableBodyRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  bodyCell: { fontSize: 13, color: '#111827' },
  boldBodyCell: { fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 11, fontWeight: '600' },
  statusBlue: { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderWidth: 1, borderColor: '#BFDBFE' },
  statusGreen: { backgroundColor: '#ECFDF5', color: '#047857', borderWidth: 1, borderColor: '#A7F3D0' },
  statusRed: { backgroundColor: '#FEF2F2', color: '#B91C1C', borderWidth: 1, borderColor: '#FCA5A5' },
  statusGray: { backgroundColor: '#F3F4F6', color: '#374151', borderWidth: 1, borderColor: '#D1D5DB' },
  titleIconPadding: {
    marginRight: 10,
    alignSelf: 'center',
  },
  mobileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mobileCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  mobileCardRow: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
  },
  mobileCardLabel: {
    fontWeight: '600',
    color: '#374151',
  },
});
