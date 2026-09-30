import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Modal, Pressable, useWindowDimensions, Platform, Alert } from 'react-native';
import { pilotApi, Pilot, PilotRequest } from '../api/pilot.api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeSearchQuery, detectInjectionAttempt, logSuspiciousActivity } from '../utils/inputSanitization';
import Pagination from '../components/Pagination';

// ------------------------------------------------------
// Cross-platform alert / confirm helpers (web + native)
// ------------------------------------------------------
const showAlert = (message: string) => {
  if (Platform.OS === 'web') {
    showAlert(message);
  } else {
    Alert.alert('', message);
  }
};

const showConfirm = (message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
};

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
import DroneIcon from '../assets/icons/DroneIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';
// --- Data Structures Type Interfaces ---
interface PilotItem {
  name: string;
  pilotId: string;
  rating: string;
  totalMissions: string;
  status: string;
  joiningDate: string;
  state: string;
  region: string;
}

export default function PilotsScreen() {
  // --- Auth State ---
  const { user, isAuthenticated } = useAuth();
  
  // --- View Core Engine States ---
  const [activeTab, setActiveTab] = useState<'current' | 'incoming'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  
  // Debounce search query to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // Dynamic Route Hub View Tracker: 'LIST' | 'DETAILS' | 'INCOMING_REQUEST'
  const [currentView, setCurrentView] = useState<'LIST' | 'DETAILS' | 'INCOMING_REQUEST'>('LIST');

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // --- Data States ---
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [pilotRequests, setPilotRequests] = useState<PilotRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // --- Selected Pilot Details States ---
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PilotRequest | null>(null);
  const [pilotBookings, setPilotBookings] = useState<any[]>([]);
  const [pilotSupportTickets, setPilotSupportTickets] = useState<any[]>([]);
  const [pilotMaintenanceTickets, setPilotMaintenanceTickets] = useState<any[]>([]);
  const [pilotFleetManager, setPilotFleetManager] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'missions' | 'maintenance' | 'support'>('missions');

  // --- Rejection Modal State ---
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // --- Document Image Preview Modal State ---
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // --- Fetch Data on Mount and Tab Change ---
  useEffect(() => {
    if (activeTab === 'current') {
      fetchPilots();
    } else {
      fetchPilotRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, currentPage, debouncedSearch, selectedState]);

  const fetchPilots = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sanitize search input
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';
      
      // Detect injection attempts
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'PilotsScreen search');
        showAlert('Invalid Input: Please enter a valid search query');
        setSearchQuery('');
        setIsSearching(false);
        setLoading(false);
        return;
      }
      
      const response = await pilotApi.getAll({
        page: currentPage,
        limit: pageSize,
        search: sanitizedSearch || undefined,
        state: selectedState || undefined,
      });
      
      // Handle API client wrapper structure
      let pilotsData = response.data;
      let paginationInfo = null;
      
      // Step 1: Unwrap API client wrapper
      if (pilotsData && typeof pilotsData === 'object' && pilotsData.success && pilotsData.data) {
        pilotsData = pilotsData.data;
      }
      
      // Step 2: Extract pagination info and data array
      if (pilotsData && typeof pilotsData === 'object') {
        if (pilotsData.data && pilotsData.pagination) {
          paginationInfo = pilotsData.pagination;
          pilotsData = pilotsData.data;
        } else if (pilotsData.data && Array.isArray(pilotsData.data)) {
          pilotsData = pilotsData.data;
        } else if (!Array.isArray(pilotsData)) {
          pilotsData = [];
        }
      }
      
      const finalPilots = Array.isArray(pilotsData) ? pilotsData : [];
      setPilots(finalPilots);
      
      if (paginationInfo) {
        setTotalPages(paginationInfo.totalPages);
        setTotalCount(paginationInfo.totalCount);
      }
    } catch (err: any) {
      console.error('❌ Error fetching pilots:', err);
      setError(err.message || 'Failed to fetch pilots');
      setPilots([]);
      
      if (err.statusCode === 403) {
        showAlert(`Access Denied: You don't have permission to view pilots. Your role: ${user?.role || 'unknown'}`);
      } else {
        showAlert('Error: Failed to load pilots. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchPilotRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sanitize search input for requests too
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';
      
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'PilotsScreen requests search');
        showAlert('Invalid Input: Please enter a valid search query');
        setSearchQuery('');
        setIsSearching(false);
        setLoading(false);
        return;
      }
      
      const response = await pilotApi.getAllRequests('PENDING');
      setPilotRequests(response.data);
    } catch (err: any) {
      console.error('Error fetching pilot requests:', err);
      setError(err.message || 'Failed to fetch pilot requests');
      showAlert('Error: Failed to load pilot requests. Please try again.');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchPilotDetails = async (pilot: Pilot) => {
    setSelectedPilot(pilot);
    setSelectedRequest(null); // Clear any selected request
    setCurrentView('DETAILS');
    setDetailsLoading(true);
    
    try {
      // Fetch all related data in parallel
      const [bookingsRes, supportRes, maintenanceRes, fleetManagerRes] = await Promise.allSettled([
        pilotApi.getBookings(pilot.pilotId),
        pilotApi.getSupportTickets(pilot.pilotId),
        pilotApi.getMaintenanceTickets(pilot.pilotId),
        pilot.assignedFleetManagerId ? pilotApi.getFleetManager(pilot.pilotId) : Promise.resolve(null),
      ]);
      
      // Handle bookings
      if (bookingsRes.status === 'fulfilled') {
        let bookings = bookingsRes.value.data;
        
        // Unwrap API client wrapper if present
        if (bookings && typeof bookings === 'object' && bookings.success && bookings.data) {
          bookings = bookings.data;
        }
        
        setPilotBookings(Array.isArray(bookings) ? bookings : []);
      } else {
        console.error('❌ Failed to load bookings:', bookingsRes.reason);
        setPilotBookings([]);
      }
      
      // Handle support tickets
      if (supportRes.status === 'fulfilled') {
        let tickets = supportRes.value.data;
        
        // Unwrap API client wrapper if present
        if (tickets && typeof tickets === 'object' && tickets.success && tickets.data) {
          tickets = tickets.data;
        }
        
        setPilotSupportTickets(Array.isArray(tickets) ? tickets : []);
      } else {
        console.error('❌ Failed to load support tickets:', supportRes.reason);
        setPilotSupportTickets([]);
      }
      
      // Handle maintenance tickets
      if (maintenanceRes.status === 'fulfilled') {
        let tickets = maintenanceRes.value.data;
        
        // Unwrap API client wrapper if present
        if (tickets && typeof tickets === 'object' && tickets.success && tickets.data) {
          tickets = tickets.data;
        }
        
        setPilotMaintenanceTickets(Array.isArray(tickets) ? tickets : []);
      } else {
        console.error('❌ Failed to load maintenance tickets:', maintenanceRes.reason);
        setPilotMaintenanceTickets([]);
      }
      
      // Handle fleet manager
      if (fleetManagerRes.status === 'fulfilled' && fleetManagerRes.value) {
        let manager = fleetManagerRes.value.data;
        
        // Unwrap API client wrapper if present
        if (manager && typeof manager === 'object' && manager.success && manager.data) {
          manager = manager.data;
        }
        
        setPilotFleetManager(manager);
      } else {
        setPilotFleetManager(null);
      }
      
    } catch (err: any) {
      console.error('❌ Error fetching pilot details:', err);
      showAlert('Error: Failed to load some pilot details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRequestClick = (request: PilotRequest) => {
    setSelectedRequest(request);
    setSelectedPilot(null); // Clear any selected pilot
    setCurrentView('INCOMING_REQUEST');
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    if (!(await showConfirm(`Are you sure you want to approve ${selectedRequest.fullName}'s pilot application?`))) {
      return;
    }

    try {
      setLoading(true);
      await pilotApi.approveRequest(selectedRequest.requestId, {
        approvedBy: user?.uid || 'ADMIN',
      });
      
      showAlert('Success: Pilot request approved successfully');
      
      // Switch to current pilots tab and refresh
      setActiveTab('current');
      setCurrentView('LIST');
      setSelectedRequest(null);
      
      // Refresh both lists
      await fetchPilots();
      await fetchPilotRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      showAlert(`Error: ${err.message || 'Failed to approve request'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = () => {
    if (!selectedRequest) return;
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmRejectRequest = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason || rejectionReason.trim() === '') {
      showAlert('Error: Rejection reason is required');
      return;
    }

    try {
      setLoading(true);
      setShowRejectModal(false);
      
      await pilotApi.rejectRequest(selectedRequest.requestId, {
        rejectedBy: user?.uid || 'ADMIN',
        rejectionReason: rejectionReason,
      });
      
      showAlert('Success: Pilot request rejected');
      
      // Go back to list and refresh
      setCurrentView('LIST');
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchPilotRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      showAlert(`Error: ${err.message || 'Failed to reject request'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePilot = async () => {
    if (!selectedPilot) return;

    if (!(await showConfirm(`Are you sure you want to suspend ${selectedPilot.fullName}? They will no longer be able to accept missions.`))) {
      return;
    }

    try {
      setLoading(true);
      await pilotApi.remove(selectedPilot.pilotId);
      
      showAlert('Success: Pilot has been suspended');
      
      // Go back to list and refresh
      setCurrentView('LIST');
      setSelectedPilot(null);
      await fetchPilots();
    } catch (err: any) {
      console.error('Error removing pilot:', err);
      showAlert(`Error: ${err.message || 'Failed to suspend pilot'}`);
    } finally {
      setLoading(false);
    }
  };

  // Convert API data to display format
  const displayPilots: PilotItem[] = React.useMemo(() => {
    if (!Array.isArray(pilots)) {
      return [];
    }
    
    const converted = pilots.map((pilot, _idx) => {
      if (!pilot) {
        return null;
      }
      
      return {
        name: pilot.fullName || 'N/A',
        pilotId: pilot.pilotId || 'N/A',
        rating: pilot.rating?.toString() || '0',
        totalMissions: pilot.missions?.toString() || '0',
        status: pilot.status === 'AVAILABLE' ? 'Available' : 
                pilot.status === 'ON_MISSION' ? 'On Mission' : 
                pilot.status === 'ON_BREAK' ? 'On Break' : 'Offline',
        joiningDate: pilot.createdAt ? new Date(pilot.createdAt).toLocaleDateString() : 'N/A',
        state: pilot.state || 'N/A',
        region: pilot.district || 'N/A',
      };
    }).filter(Boolean) as PilotItem[];
    
    return converted;
  }, [pilots]);

  // Filter listings adaptively using search input fields
  const filteredPilots = React.useMemo(() => {
    const filtered = displayPilots.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pilotId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return filtered;
  }, [displayPilots, searchQuery]);

  // Convert pilot requests to display format
  const displayRequests: PilotItem[] = React.useMemo(() => {
    if (!Array.isArray(pilotRequests)) {
      return [];
    }
    
    const converted = pilotRequests.map((request, _idx) => {
      if (!request) {
        return null;
      }
      
      return {
        name: request.fullName || 'N/A',
        pilotId: request.requestId || 'N/A',
        rating: request.hasLicense ? 'Licensed' : 'No License',
        totalMissions: request.flightHours?.toString() || '0',
        status: 'Pending',
        joiningDate: request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A',
        state: request.preferredLocation || 'N/A',
        region: 'N/A',
      };
    }).filter(Boolean) as PilotItem[];
    
    return converted;
  }, [pilotRequests]);

  // Filter requests when on incoming tab
  const filteredRequests = React.useMemo(() => {
    const filtered = displayRequests.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pilotId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return filtered;
  }, [displayRequests, searchQuery]);

  // Combined filtered list based on active tab
  const filteredList = activeTab === 'current' ? filteredPilots : filteredRequests;


  // ==================== SUB-VIEW A: MASTER DIRECTORY DIRECT COMPONENT LAYOUTS ====================
  const renderMasterPilotsList = () => (
    <>
      {/* Tabs Filter Layout & State Dropdown */}
      <View style={[styles.filterBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[styles.tabButtonGroup, isMobile && { marginBottom: 12 }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'current' && styles.tabButtonTextActive]}>
              Current Pilots
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'incoming' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('incoming')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'incoming' && styles.tabButtonTextActive]}>
              Incoming Requests
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.filterIconBtn} onPress={() => setActionMenuVisible(!actionMenuVisible)}>
          <VectorIcon width={18} height={18} fill="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Action Menu Floating Stacking Prevention Modal Overlay View */}
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
            <Text style={styles.actionMenuHeaderText}>Filter by State</Text>
            <ScrollView style={styles.statesScrollContainer}>
              <TouchableOpacity 
                style={[
                  styles.actionMenuItemRow,
                  !selectedState && styles.actionMenuItemRowActive
                ]}
                onPress={() => {
                  setSelectedState('');
                  setActionMenuVisible(false);
                  setCurrentPage(1);
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
              {[
                'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
                'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
                'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
                'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
                'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
              ].map((state) => (
                <TouchableOpacity 
                  key={state}
                  style={[
                    styles.actionMenuItemRow,
                    selectedState === state && styles.actionMenuItemRowActive
                  ]}
                  onPress={() => {
                    setSelectedState(state);
                    setActionMenuVisible(false);
                    setCurrentPage(1);
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
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Main Base Dynamic Directory Card Frame Wrapper */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
        <View style={styles.tableSummaryHeader}>
          <Text style={styles.tableSummaryCountText}>
            Total Pilots: <Text style={styles.boldText}>{activeTab === 'current' ? pilots.length : pilotRequests.length}</Text>
          </Text>
          <Text style={styles.statusBreakdownText}>
            Available <Text style={{color: '#10B981', fontWeight: '700'}}>{pilots.filter(p => p.status === 'AVAILABLE').length}</Text>  |  On Mission <Text style={{color: '#EF4444', fontWeight: '700'}}>{pilots.filter(p => p.status === 'ON_MISSION').length}</Text>
          </Text>
        </View>

        {/* Table Column Labels Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, { flex: 2.5 }]}>Name ▲</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Pilot ID ▲</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Rating ▲</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Total Missions ▲</Text>
          <Text style={[styles.headerCell, { flex: 2, textAlign: 'center' }]}>Status ▲</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>Joining Date ▲</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>State ▲</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Region ▲</Text>
        </View>

        {/* Table Rows Iterator Loop Mapping */}
        {loading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.emptyStateText}>Loading pilots...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: '#EF4444' }]}>Error: {error}</Text>
          </View>
        ) : filteredList.length > 0 ? (
          filteredList.map((item, index) => {
            return (
              <View key={`pilot-${index}-${item.pilotId}`} style={styles.tableBodyRow}>
              {/* CORRECTED ROUTING INTERACTION: Redirects cleanly depending on the active top list-mode state */}
              <TouchableOpacity 
                style={{ flex: 2.5 }} 
                onPress={() => {
                  if (activeTab === 'current') {
                    const pilot = pilots.find(p => p.pilotId === item.pilotId);
                    if (pilot) fetchPilotDetails(pilot);
                  } else {
                    // For incoming requests, find the matching request by index
                    const request = pilotRequests[index];
                    if (request) handleRequestClick(request);
                  }
                }}
              >
                <Text style={[styles.bodyCell, styles.boldBodyCell, styles.interactiveTextLink]}>{item.name}</Text>
              </TouchableOpacity>
              
              <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]}>{item.pilotId}</Text>
              
              <View style={[styles.ratingCellContainer, { flex: 1.5 }]}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.bodyCell}>{item.rating}</Text>
              </View>
              
              <Text style={[styles.bodyCell, { flex: 2 }]}>{item.totalMissions}</Text>
              
              <View style={[{ flex: 2, alignItems: 'center' }]}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
              
              <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]}>{item.joiningDate}</Text>
              <Text style={[styles.bodyCell, { flex: 2 }]}>{item.state}</Text>
              <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.region}</Text>
            </View>
            );
          })
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              {activeTab === 'current' 
                ? searchQuery 
                  ? `No pilots found matching "${searchQuery}"` 
                  : 'No pilots found'
                : 'No pilot requests found'}
            </Text>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Pagination Controls */}
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="pilots"
      />
    </>
  );

  // ==================== SCREEN 1: PILOT EXPANDED DETAILS WITH MAP LIVE TRACKING ====================
  const renderPilotDetailsView = () => {
    if (!selectedPilot) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No pilot selected</Text>
        </View>
      );
    }

    const getInitials = (name?: string) => {
      if (!name) return '?';
      const names = name.split(' ');
      return names.length >= 2 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'AVAILABLE': return '#10B981';
        case 'ON_MISSION': return '#EF4444';
        case 'ON_BREAK': return '#F59E0B';
        default: return '#6B7280';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'AVAILABLE': return 'Available';
        case 'ON_MISSION': return 'On Mission';
        case 'ON_BREAK': return 'On Break';
        case 'OFFLINE': return 'Offline';
        case 'SUSPENDED': return 'Suspended';
        default: return status;
      }
    };

    return (
    <>
      {/* Structural Step Back Link Trigger */}
      <TouchableOpacity style={styles.backButtonTouchBox} onPress={() => setCurrentView('LIST')}>
        <Text style={styles.backButtonChevronSymbol}>←</Text>
        <Text style={styles.backButtonDescriptionText}>Back to Pilots</Text>
      </TouchableOpacity>

      {/* Main Identity Info Hero Card Section Wrapper Frame */}
      <View style={[styles.heroProfileIdentitySurfaceCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.heroLeftLayoutDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.largeHeroProfileAvatarCircle, { backgroundColor: '#3B82F6' }, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.largeHeroAvatarInitialsText}>{getInitials(selectedPilot.fullName)}</Text>
          </View>
          <View style={styles.heroProfileMetadataTextBlock}>
            <Text style={styles.heroProfileNameText}>{selectedPilot.fullName}</Text>
            <Text style={styles.heroProfileTitleRoleDescriptor}>Pilot</Text>
            <View style={styles.heroPillBadgesLayoutRow}>
              <View style={[styles.onlineStatusBadgePill, { backgroundColor: getStatusColor(selectedPilot.status) }]}>
                <Text style={styles.onlineStatusBadgePillText}>{getStatusText(selectedPilot.status)}</Text>
              </View>
              {selectedPilot.state && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>{selectedPilot.state}</Text>
                </View>
              )}
              {selectedPilot.district && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>{selectedPilot.district}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.destructiveBanControlActionButton, isMobile && { alignSelf: 'stretch', alignItems: 'center' }]}
          onPress={handleRemovePilot}
          disabled={loading}
        >
          <Text style={styles.destructiveBanControlActionButtonText}>
            {loading ? 'Processing...' : 'Remove Pilot'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Information Parameter Core Meta Split Blocks */}
      <View style={[styles.splitGridInfoCardBlocksFlexRowContainer, isMobile && { flexDirection: 'column', marginBottom: 12 }]}>
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Profile Information</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Pilot ID</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.pilotId}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}>⭐</Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Current Rating</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.rating?.toFixed(1) || '0.0'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Total Missions</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.missions || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ActivityIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Completed Missions</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.completedMissions || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Flight Hours</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.flightHours || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <LocationIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Region</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedPilot.district && selectedPilot.state
                  ? `${selectedPilot.district}, ${selectedPilot.state}`
                  : selectedPilot.state || 'N/A'}
              </Text>
            </View>
          </View>
          {pilotFleetManager && (
            <View style={styles.parameterMetricRowItemUnit}>
              <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
              <View>
                <Text style={styles.parameterHeaderDescriptorLabelText}>Fleet Manager</Text>
                <Text style={[styles.parameterCoreValueHeadlineText, styles.underlineTextActionLink]}>
                  {pilotFleetManager.fullName}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Contact & Account Details</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <EmailIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Email</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.email || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <CallIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Mobile</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.mobile || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Joined Date</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedPilot.createdAt ? new Date(selectedPilot.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ActivityIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Last Active</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedPilot.lastActiveAt
                  ? new Date(selectedPilot.lastActiveAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
          {selectedPilot.licenseNumber && (
            <View style={styles.parameterMetricRowItemUnit}>
              <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
              <View>
                <Text style={styles.parameterHeaderDescriptorLabelText}>License Number</Text>
                <Text style={styles.parameterCoreValueHeadlineText}>{selectedPilot.licenseNumber}</Text>
              </View>
            </View>
          )}
          {selectedPilot.aadhaarNumber && (
            <View style={styles.parameterMetricRowItemUnit}>
              <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
              <View>
                <Text style={styles.parameterHeaderDescriptorLabelText}>Aadhaar</Text>
                <Text style={styles.parameterCoreValueHeadlineText}>
                  ****{selectedPilot.aadhaarNumber.slice(-4)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Live Tracking Visual Map Component Integration Layer Placeholder Frame */}
      <View style={styles.mapLiveTrackingComponentPlaceholderContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200' }} 
          style={styles.mapLiveTrackingSatelliteGraphicImgCanvas} 
        />
        <View style={styles.mapFloatingLiveTrackingBadgeIndicator}>
          <Text style={styles.mapFloatingLiveTrackingBadgeIndicatorText}>Live Tracking</Text>
        </View>
        <View style={styles.mapAvatarTrackerPinMarkerCircle}>
          <Text style={styles.mapAvatarTrackerPinMarkerText}>AA</Text>
        </View>
      </View>

      {/* Filter Segment Navigation Sub-Tabs Bar */}
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={styles.subTabsSegmentNavigatorToolbarRow}
      >
        <TouchableOpacity
          style={[styles.segmentTabItemToggleBox, detailsActiveTab === 'missions' && styles.segmentTabItemToggleBoxActive, isMobile && { marginRight: 8 }]}
          onPress={() => setDetailsActiveTab('missions')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, detailsActiveTab === 'missions' && styles.segmentTabItemToggleLabelTextActive]}>
            Missions ({pilotBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTabItemToggleBox, detailsActiveTab === 'maintenance' && styles.segmentTabItemToggleBoxActive, isMobile && { marginRight: 8 }]}
          onPress={() => setDetailsActiveTab('maintenance')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, detailsActiveTab === 'maintenance' && styles.segmentTabItemToggleLabelTextActive]}>
            Maintenance ({pilotMaintenanceTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTabItemToggleBox, detailsActiveTab === 'support' && styles.segmentTabItemToggleBoxActive, isMobile && { marginRight: 8 }]}
          onPress={() => setDetailsActiveTab('support')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, detailsActiveTab === 'support' && styles.segmentTabItemToggleLabelTextActive]}>
            Support ({pilotSupportTickets.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dynamic Content Based on Active Tab */}
      {detailsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      ) : (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
          {detailsActiveTab === 'missions' && (
            <>
              <View style={styles.tableHeaderColumnsRow}>
                <Text style={[styles.headerCell, { flex: 2.5 }]}>Service</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Booking ID</Text>
                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1.0 }]}>Price (₹)</Text>
                <Text style={[styles.headerCell, { flex: 2.0 }]}>Location</Text>
                <Text style={[styles.headerCell, { flex: 1.4 }]}>Date</Text>
              </View>
              {pilotBookings.length > 0 ? (
                pilotBookings.slice(0, 10).map((booking, idx) => (
                  <View key={booking.bookingId || idx} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, { flex: 2.5, fontWeight: '600' }]} numberOfLines={1}>
                      {booking.serviceType} {booking.serviceSubType ? `- ${booking.serviceSubType}` : ''}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.5, color: '#4B5563' }]}>{booking.bookingNumber}</Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.activeStatusPillBadge}>
                        <Text style={styles.activeStatusPillBadgeText}>{booking.bookingStatus}</Text>
                      </View>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.0 }]}>{booking.price?.total?.toLocaleString() || 'N/A'}</Text>
                    <Text style={[styles.bodyCell, { flex: 2.0 }]} numberOfLines={1}>
                      {booking.location?.village || ''}, {booking.location?.district || ''}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.4 }]}>
                      {booking.scheduledStart ? new Date(booking.scheduledStart).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No missions found</Text>
                </View>
              )}
            </>
          )}

          {detailsActiveTab === 'maintenance' && (
            <>
              <View style={styles.tableHeaderColumnsRow}>
                <Text style={[styles.headerCell, { flex: 2.0 }]}>Ticket #</Text>
                <Text style={[styles.headerCell, { flex: 2.5 }]}>Title</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Drone ID</Text>
                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Priority</Text>
                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1.4 }]}>Created</Text>
              </View>
              {pilotMaintenanceTickets.length > 0 ? (
                pilotMaintenanceTickets.slice(0, 10).map((ticket, idx) => (
                  <View key={ticket.ticketId || idx} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, { flex: 2.0, color: '#4B5563' }]}>{ticket.ticketNumber}</Text>
                    <Text style={[styles.bodyCell, { flex: 2.5, fontWeight: '600' }]} numberOfLines={1}>
                      {ticket.title || ticket.category}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.droneId}</Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{ticket.priority}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.activeStatusPillBadge}>
                        <Text style={styles.activeStatusPillBadgeText}>{ticket.status}</Text>
                      </View>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.4 }]}>
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No maintenance tickets found</Text>
                </View>
              )}
            </>
          )}

          {detailsActiveTab === 'support' && (
            <>
              <View style={styles.tableHeaderColumnsRow}>
                <Text style={[styles.headerCell, { flex: 2.0 }]}>Ticket #</Text>
                <Text style={[styles.headerCell, { flex: 2.5 }]}>Subject</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Category</Text>
                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Priority</Text>
                <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.headerCell, { flex: 1.0, textAlign: 'center' }]}>Rating</Text>
              </View>
              {pilotSupportTickets.length > 0 ? (
                pilotSupportTickets.slice(0, 10).map((ticket, idx) => (
                  <View key={ticket.ticketId || idx} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, { flex: 2.0, color: '#4B5563' }]}>{ticket.ticketNumber}</Text>
                    <Text style={[styles.bodyCell, { flex: 2.5, fontWeight: '600' }]} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.category}</Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{ticket.priority}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={styles.activeStatusPillBadge}>
                        <Text style={styles.activeStatusPillBadgeText}>{ticket.status}</Text>
                      </View>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.0, textAlign: 'center' }]}>
                      {ticket.customerSatisfactionRating ? `⭐ ${ticket.customerSatisfactionRating}` : '-'}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No support tickets found</Text>
                </View>
              )}
            </>
          )}
        </View>
        </ScrollView>
      )}
    </>
    );
  };

  // ==================== SCREEN 2: INCOMING PILOT APPLICATION LAYOUT PANEL ====================  );

  // ==================== SCREEN 2: INCOMING PILOT APPLICATION LAYOUT PANEL ====================
  const renderIncomingRequestView = () => {
    if (!selectedRequest) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No request selected</Text>
        </View>
      );
    }

    return (
    <>
      <TouchableOpacity style={styles.backButtonTouchBox} onPress={() => setCurrentView('LIST')}>
        <Text style={styles.backButtonChevronSymbol}>←</Text>
        <Text style={styles.backButtonDescriptionText}>Back to Pilots</Text>
      </TouchableOpacity>

      <View style={[styles.heroProfileIdentitySurfaceCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.heroLeftLayoutDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.largeHeroProfileAvatarCircle, { backgroundColor: '#3B82F6' }, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.largeHeroAvatarInitialsText}>
              {(selectedRequest.fullName?.substring(0, 2) || '').toUpperCase() || 'NA'}
            </Text>
          </View>
          <View style={styles.heroProfileMetadataTextBlock}>
            <Text style={styles.heroProfileNameText}>{selectedRequest.fullName}</Text>
            <Text style={styles.heroProfileTitleRoleDescriptor}>Pilot Application</Text>
            <View style={styles.heroPillBadgesLayoutRow}>
              <View style={[styles.onlineStatusBadgePill, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.onlineStatusBadgePillText, { color: '#92400E' }]}>Pending</Text>
              </View>
              <View style={styles.regionalContextLocationPillBadge}>
                <Text style={styles.regionalContextLocationPillBadgeText}>{selectedRequest.preferredLocation || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.heroPillBadgesLayoutRow, isMobile && { alignSelf: 'stretch', justifyContent: 'space-between' }]}>
          <TouchableOpacity
            style={[styles.heroAcceptBtn, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={handleApproveRequest}
            disabled={loading}
          >
            <Text style={styles.heroAcceptBtnText}>{loading ? 'Processing...' : 'Accept'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroRejectBtn, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={handleRejectRequest}
            disabled={loading}
          >
            <Text style={styles.heroRejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.splitGridInfoCardBlocksFlexRowContainer, isMobile && { flexDirection: 'column', marginBottom: 12 }]}>
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Profile Information</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <LocationIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Preferred Location</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.preferredLocation || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ActivityIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Experience</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.experience || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Flight Hours</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.flightHours || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>License</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.hasLicense ? `Yes - ${selectedRequest.licenseNumber || 'N/A'}` : 'No'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Age</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.age || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Aadhaar</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.aadhaarNumber ? `****${selectedRequest.aadhaarNumber.slice(-4)}` : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Contact Details</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <EmailIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Email</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.email || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <CallIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Mobile</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.mobile || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Application Date</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Request ID</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedRequest.requestId}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Submitted Form Details Section if available */}
      {selectedRequest.formData && Object.keys(selectedRequest.formData).length > 0 && (
        <View style={styles.detailsContainerBoxCard}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>All Submitted Form Details</Text>
          <View style={styles.formEntriesGrid}>
            {Object.entries(selectedRequest.formData)
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
      {selectedRequest.documents && selectedRequest.documents.length > 0 && (
        <View style={styles.detailsContainerBoxCard}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>
            Uploaded Documents ({selectedRequest.documents.length})
          </Text>
          <View style={styles.documentsGrid}>
            {selectedRequest.documents.map((doc: any, idx: number) => {
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
    </>
    );
  };

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
            { icon: '💼', label: 'Customers', active: false },
            { icon: '📈', label: 'Sales Aggregators', active: false },
            { icon: '✈️', label: 'Pilots', active: true },
            { icon: '🚚', label: 'Fleet Management', active: false },
            { icon: '📅', label: 'Bookings', active: false },
            { icon: '💰', label: 'Revenue', active: false },
            { icon: '🏪', label: 'Marketplace Management', active: false },
            { icon: '🔧', label: 'Technician Management', active: false },
            { icon: '🏢', label: 'Service Centre', active: false },
            { icon: '⚠️', label: 'Incidents', active: false }
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={[styles.sidebarMenuLinkRow, item.active && styles.sidebarMenuLinkRowActive]}>
              <Text style={[styles.sidebarMenuLinkIcon, item.active && styles.sidebarMenuLinkTextActive]}>{item.icon}</Text>
              <Text style={[styles.sidebarMenuLinkText, item.active && styles.sidebarMenuLinkTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>*/}

      {/* ==================== MAIN CORE CONTENT CANVAS AREA ==================== */}
      {/* NOTE: Plain View instead of Pressable — Pressable intercepts scroll touches causing lag */}
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        >

        {/* Top Header Row with Breadcrumb & Search Bar */}
        {currentView === 'LIST' && (
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={isMobile && { marginBottom: 16 }}>
              <View style={styles.breadcrumbContainer}>
                <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                <Text style={styles.breadcrumbSeparator}>&gt;</Text>
                <Text style={styles.breadcrumbActive}>Pilots</Text>
              </View>
              <Text style={styles.pageTitle}>Pilots Management</Text>
              <Text style={styles.pageSubtitle}>Manage all your Pilots</Text>
            </View>
            <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Pilots (name, ID, email, region)"
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
        )}

        {/* Dynamic Navigation View Toggle Conditional Switch Rendering Engine */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#535CE8" />
            <Text style={styles.loadingText}>Loading pilots...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => activeTab === 'current' ? fetchPilots() : fetchPilotRequests()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {currentView === 'LIST' && renderMasterPilotsList()}
            {currentView === 'DETAILS' && renderPilotDetailsView()}
            {currentView === 'INCOMING_REQUEST' && renderIncomingRequestView()}
          </>
        )}

      </ScrollView>
      </View>

      {/* ==================== REJECTION REASON MODAL ==================== */}
      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <Pressable onPress={() => setShowRejectModal(false)} style={styles.modalBackdropMask}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.formCardModalPanel}>
              <View style={styles.modalHeaderCloseRow}>
                <Text style={styles.formModalTitleText}>Reject Pilot Request</Text>
                <TouchableOpacity onPress={() => setShowRejectModal(false)} style={styles.closeTouchArea}>
                  <Text style={styles.closeIconText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.formModalSubtitleText}>
                Please provide a reason for rejecting {selectedRequest?.fullName}'s application:
              </Text>

              <View style={styles.formFieldContainerRow}>
                <Text style={styles.formFieldLabelText}>Rejection Reason *</Text>
                <TextInput
                  style={[styles.formFieldTextInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Enter detailed reason for rejection..."
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity 
                style={[styles.modalSubmitActionButton, { backgroundColor: '#EF4444' }]} 
                onPress={confirmRejectRequest}
                disabled={loading}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {loading ? 'Rejecting...' : 'Reject Application'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelActionButton} 
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Document Image Preview Modal */}
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
    </View>
  );
}

// --- Style Sheet Architecture Configuration Definitions ---
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
  detailsContainerBoxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
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
    backgroundColor: '#3B82F6',
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
    color: '#3B82F6',
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
    backgroundColor: '#3B82F6',
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
    padding: 32,
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
  breadcrumbHome: {
    fontSize: 12,
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 11,
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 20,
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
    borderColor: '#D1D5DB',
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
  filterBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    zIndex: 100,
  },
  tabButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 4,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: '#535CE8',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 13,
    color: '#374151',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 9,
    color: '#6B7280',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 200,
    maxHeight: 400,
    overflow: 'scroll',
    zIndex: 9999,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tableCardContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tableSummaryCountText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  statusBreakdownText: {
    fontSize: 12,
    color: '#6B7280',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  bodyCell: {
    fontSize: 13,
    color: '#111827',
  },
  boldBodyCell: {
    fontWeight: '600',
  },
  interactiveTextLink: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  ratingCellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
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
  heroAcceptBtn: {
    borderWidth: 1,
    borderColor: '#535CE8',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  heroAcceptBtnText: {
    fontSize: 13,
    color: '#535CE8',
    fontWeight: '600',
  },
  heroRejectBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  heroRejectBtnText: {
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
    padding: 24,
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
    alignItems: 'center',
    marginBottom: 16,
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
  },
  underlineTextActionLink: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  mapLiveTrackingComponentPlaceholderContainer: {
    height: 280,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
  },
  mapLiveTrackingSatelliteGraphicImgCanvas: {
    width: '100%',
    height: '100%',
  },
  mapFloatingLiveTrackingBadgeIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapFloatingLiveTrackingBadgeIndicatorText: {
    fontSize: 11,
    color: '#1F2937',
    fontWeight: '700',
  },
  mapAvatarTrackerPinMarkerCircle: {
    position: 'absolute',
    bottom: 80,
    right: 220,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#818CF8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapAvatarTrackerPinMarkerText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
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
  tableHeaderColumnsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeStatusPillBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    width: 75,
    alignItems: 'center',
  },
  activeStatusPillBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#535CE8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Modal Styles
  modalBackdropMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formCardModalPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeaderCloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formModalTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeTouchArea: {
    padding: 4,
  },
  closeIconText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  formModalSubtitleText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  formFieldContainerRow: {
    marginBottom: 16,
  },
  formFieldLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formFieldTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  modalSubmitActionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelActionButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  titleIconPadding: {
    marginRight: 10,
    alignSelf: 'center',
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
    minWidth: 250,
    maxWidth: 300,
    maxHeight: 500,
    overflow: 'hidden',
  },
  actionMenuHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statesScrollContainer: {
    maxHeight: 420,
  },
  actionMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionMenuItemRowActive: {
    backgroundColor: '#EFF6FF',
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
  checkmarkIcon: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
    marginLeft: 8,
  },
  actionMenuSMItemRow: {
    paddingLeft: 12,
  },
  actionMenuSMIcon: {
    marginRight: 8,
  },
});