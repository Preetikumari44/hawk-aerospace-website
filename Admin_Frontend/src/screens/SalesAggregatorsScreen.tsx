import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, Image, TouchableWithoutFeedback, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { salesAggregatorAPI, SalesAggregator, SARequest } from '../api/sales-aggregator.api';
import { showAlert, showConfirm } from '../utils/dialog';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeSearchQuery, detectInjectionAttempt, logSuspiciousActivity } from '../utils/inputSanitization';
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
import DroneIcon from '../assets/icons/DroneIcon.svg';
import RevenueIcon from '../assets/icons/rupee-icon.svg';
import BriefcaseIcon from '../assets/icons/BriefcaseIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';

// --- Data Structures Type Interfaces ---
export interface SAItem {
  name: string;
  saId: string;
  revenue: string;
  totalBookings: string;
  joiningDate: string;
  state: string;
  region: string;
}

export interface IncomingRequestItem {
  date: string;
  name: string;
  state: string;
  region: string;
}

export default function SalesAggregatorsScreen() {
  // --- Screen State Control Hub Engine ---
  const [activeTab, setActiveTab] = useState<'current' | 'incoming'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('');

  // Debounce search query to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // App view control engine: 'LIST' | 'DETAILS' | 'INCOMING_REQUEST'
  const [currentView, setCurrentView] = useState<'LIST' | 'DETAILS' | 'INCOMING_REQUEST'>('LIST');
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'Bookings' | 'Customers'>('Bookings');
  const [selectedDocTab, setSelectedDocTab] = useState<'Front' | 'Back' | 'Pan' | 'Gst'>('Front');

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // API Data
  const [currentSAData, setCurrentSAData] = useState<SalesAggregator[]>([]);
  const [incomingRequestsData, setIncomingRequestsData] = useState<SARequest[]>([]);
  const [selectedSA, setSelectedSA] = useState<SalesAggregator | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SARequest | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, debouncedSearch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Sanitize search input
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';

      // Detect injection attempts
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'SalesAggregatorsScreen search');
        showAlert('Invalid Input: Please enter a valid search query');
        setSearchQuery('');
        return;
      }

      if (activeTab === 'current') {
        const response = await salesAggregatorAPI.getCurrentSAList({
          page,
          limit,
          search: sanitizedSearch || undefined,
        });

        console.log('🔍 Full Response:', response);

        // Handle nested data structure: response.data contains the API response
        // The API response has { data: { items, total, etc } }
        const apiData = response.data?.data || response.data;
        const items = apiData?.items || [];
        const totalCount = apiData?.total || 0;
        const pages = apiData?.totalPages || 0;

        console.log('📊 API Data:', apiData);
        console.log('📊 Extracted items:', items);
        console.log('📊 Total:', totalCount);

        setCurrentSAData(Array.isArray(items) ? items : []);
        setTotal(totalCount);
        setTotalPages(pages);
      } else {
        const response = await salesAggregatorAPI.getSARequestList({
          page,
          limit,
          search: sanitizedSearch || undefined,
          status: 'pending',
        });

        console.log('🔍 SA Requests Response:', response);

        const apiData = response.data?.data || response.data;
        const items = apiData?.items || [];
        const totalCount = apiData?.total || 0;
        const pages = apiData?.totalPages || 0;

        setIncomingRequestsData(Array.isArray(items) ? items : []);
        setTotal(totalCount);
        setTotalPages(pages);
      }
    } catch (err: any) {
      console.error('❌ Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
      setCurrentSAData([]);
      setIncomingRequestsData([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleViewSADetails = async (uid: string) => {
    setLoading(true);
    try {
      // Fetch SA details with related data
      const response = await salesAggregatorAPI.getSADetails(uid);
      console.log('📥 getSADetails response:', response);

      // The API response is nested: response.data contains { success, data, timestamp }
      const saData = response.data?.data || response.data;
      console.log('📦 Extracted SA data:', saData);

      // Fetch related customers if not included
      if (!saData.customers || saData.customers.length === 0) {
        console.log('🔍 Fetching customers for SA:', uid);
        try {
          const customersResponse = await salesAggregatorAPI.getSACustomers(uid);
          const customersData = customersResponse.data?.data || customersResponse.data;
          saData.customers = Array.isArray(customersData) ? customersData : customersData?.items || [];
          console.log('📦 Fetched customers:', saData.customers.length);
        } catch (err) {
          console.warn('⚠️ Could not fetch customers:', err);
          saData.customers = [];
        }
      }

      // Fetch related bookings
      console.log('🔍 Fetching bookings for SA:', uid);
      try {
        const bookingsResponse = await salesAggregatorAPI.getSABookings(uid);
        const bookingsData = bookingsResponse.data?.data || bookingsResponse.data;
        saData.bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.items || [];
        console.log('📦 Fetched bookings:', saData.bookings.length);
      } catch (err) {
        console.warn('⚠️ Could not fetch bookings:', err);
        saData.bookings = [];
      }

      setSelectedSA(saData);
      setCurrentView('DETAILS');
    } catch (err: any) {
      console.error('❌ Error fetching SA details:', err);
      showAlert('Error: ' + (err.message || 'Failed to fetch SA details'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequestDetails = (request: SARequest) => {
    setSelectedRequest(request);
    setCurrentView('INCOMING_REQUEST');
  };

  const handleAcceptRequest = async (requestId: string) => {
    console.log('🚀 handleAcceptRequest called with ID:', requestId);

    // Cross-platform confirm (web + native)
    if (!(await showConfirm('Are you sure you want to accept this SA request?'))) {
      console.log('❌ User cancelled accept');
      return;
    }

    console.log('✅ User confirmed accept for request:', requestId);
    setActionLoading(true);

    try {
      console.log('📡 Calling API: acceptSARequest for ID:', requestId);
      const response = await salesAggregatorAPI.acceptSARequest(requestId);
      console.log('✅ API Response:', response);

      showAlert('SA request accepted successfully!');

      // Switch to Current SA tab and refresh data
      console.log('🔄 Switching to Current SA tab and refreshing data');
      setActiveTab('current');
      setCurrentView('LIST');
      setPage(1); // Reset to first page

      // Refresh data - this will now load the current SA list
      await fetchData();
      console.log('✅ Data refreshed successfully');
    } catch (err: any) {
      console.error('❌ Error accepting request:', err);
      showAlert('Error: ' + (err.message || 'Failed to accept request'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectionReason.trim()) {
      showAlert('Error: Please provide a rejection reason');
      return;
    }

    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await salesAggregatorAPI.rejectSARequest(selectedRequest.id, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      showAlert('SA request rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      setCurrentView('LIST');

      // Switch to incoming tab and refresh
      setActiveTab('incoming');
      await fetchData();
    } catch (err: any) {
      showAlert('Error: ' + (err.message || 'Failed to reject request'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBanStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const confirmMessage = newStatus === 'blocked'
      ? 'Are you sure you want to ban this sales aggregator?'
      : 'Are you sure you want to unban this sales aggregator?';

    if (!(await showConfirm(confirmMessage))) {
      return;
    }

    setActionLoading(true);
    try {
      await salesAggregatorAPI.updateSAStatus(uid, newStatus);

      setSelectedSA((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          status: newStatus,
        };
      });

      // Update in the current list too
      setCurrentSAData((prevList: any[]) =>
        prevList.map(item => item.uid === uid ? { ...item, status: newStatus } : item)
      );

      showAlert(`Sales aggregator successfully ${newStatus === 'blocked' ? 'banned' : 'unbanned'}.`);
    } catch (err: any) {
      console.error('❌ Error toggling SA ban status:', err);
      showAlert('Error: ' + (err.message || 'Failed to update sales aggregator status'));
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // --- Sub-View 1: Master Directory Index Tables ---
  const renderListView = () => (
    <>
      {/* Tabs Filter Selector Switch Line Row */}
      {/* Stacks selectors vertically on smaller form factors */}
      <View style={[styles.filterBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[styles.tabButtonGroup, isMobile && { marginBottom: 12 }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'current' && styles.tabButtonTextActive]}>
              Current SA
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
                  setPage(1);
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
                    setPage(1);
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

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={{ padding: 8, backgroundColor: '#4F46E5', borderRadius: 6 }}>
            <Text style={{ color: '#FFF' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'current' ? (
        /* TABLE ONE: CURRENT ACTIVE SALES AGGREGATORS LISTING */
        /* Horizontal ScrollView wrapper around the current aggregators table */
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>
                Total Sales Aggregators: <Text style={styles.boldText}>{total}</Text>
              </Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>SA ID</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Revenue(₹)</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Customers</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Joining Date</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>State</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Status</Text>
            </View>

            {currentSAData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No sales aggregators found</Text>
              </View>
            ) : (
              currentSAData.map((item, index) => {
                console.log('🎨 Rendering item:', item);
                return (
                <View key={`sa-${item.uid}-${index}`} style={styles.tableBodyRow}>
                  <TouchableOpacity style={{ flex: 2 }} onPress={() => handleViewSADetails(item.uid)}>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, styles.interactiveTextLink]}>{item.name}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]}>{item.uid || 'N/A'}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{formatCurrency(item.totalRevenue)}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.totalCustomers || 0}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(item.createdAt)}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{item.state || 'N/A'}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{item.status}</Text>
                </View>
                );
              })
            )}

            {/* Pagination Controls for Current SA */}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={total}
              pageSize={limit}
              onPageChange={setPage}
              itemLabel="sales aggregators"
            />
          </View>
        </ScrollView>
      ) : (
        /* TABLE TWO: INCOMING REQUESTS APPLICATIONS LISTING */
        /* Horizontal ScrollView wrapper around the incoming applications table */
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 950) }]}>
            <View style={styles.tableSummaryHeader}>
              <Text style={styles.tableSummaryCountText}>
                Total Requests: <Text style={styles.boldText}>{total}</Text>
              </Text>
            </View>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Application Date</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Contact Person</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>State</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Region</Text>
              <Text style={[styles.headerCell, { flex: 2.5, textAlign: 'center' }]}>Documents</Text>
              <Text style={[styles.headerCell, { flex: 3.5, textAlign: 'center' }]}>Action</Text>
            </View>

            {incomingRequestsData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No pending requests found</Text>
              </View>
            ) : (
              incomingRequestsData.map((item, index) => (
                <View key={`req-${item.id}-${index}`} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{formatDate(item.createdAt)}</Text>
                  <TouchableOpacity style={{ flex: 2 }} onPress={() => handleViewRequestDetails(item)}>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, styles.interactiveTextLink]}>{item.contactPerson}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{item.state || 'N/A'}</Text>
                  <Text style={[styles.bodyCell, { flex: 2 }]}>{item.region || 'N/A'}</Text>

                  <View style={[styles.actionWrapperCell, { flex: 2.5 }]}>
                    <Text style={[styles.bodyCell, { textAlign: 'center' }]}>{item.documents?.length || 0} files</Text>
                  </View>

                  <View style={[styles.actionWrapperCell, { flex: 3.5, flexDirection: 'row', justifyContent: 'center' }]}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRequest(item.id)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.acceptButtonText}>{actionLoading ? 'Processing...' : 'Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => {
                        setSelectedRequest(item);
                        setShowRejectModal(true);
                      }}
                      disabled={actionLoading}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Pagination Controls for Incoming Requests */}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={total}
              pageSize={limit}
              onPageChange={setPage}
              itemLabel="requests"
            />
          </View>
        </ScrollView>
      )}
    </>
  );

  // ==================== SCREEN 1: DYNAMIC EXPANDED DETAILS PROFILE DASHBOARD ====================
  const renderDetailsView = () => {
    if (!selectedSA) return null;

    const initials = (selectedSA.name || '')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
    <>
      <TouchableOpacity style={styles.backButtonTouchBox} onPress={() => setCurrentView('LIST')}>
        <Text style={styles.backButtonChevronSymbol}>←</Text>
        <Text style={styles.backButtonDescriptionText}>Back to Sales Aggregator</Text>
      </TouchableOpacity>

      {/* Adapts layout structure dynamically on mobile configurations */}
      <View style={[styles.heroProfileIdentitySurfaceCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.heroLeftLayoutDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.largeHeroProfileAvatarCircle, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.largeHeroAvatarInitialsText}>{initials}</Text>
          </View>
          <View style={styles.heroProfileMetadataTextBlock}>
            <Text style={styles.heroProfileNameText}>{selectedSA.name}</Text>
            <Text style={styles.heroProfileTitleRoleDescriptor}>{selectedSA.businessName || 'Sales Aggregator'}</Text>
            <View style={styles.heroPillBadgesLayoutRow}>
              <View style={[styles.onlineStatusBadgePill, selectedSA.status !== 'active' && { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.onlineStatusBadgePillText, selectedSA.status !== 'active' && { color: '#991B1B' }]}>
                  {selectedSA.status}
                </Text>
              </View>
              {selectedSA.state && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>{selectedSA.state}</Text>
                </View>
              )}
              {selectedSA.regions && selectedSA.regions.length > 0 && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>{selectedSA.regions[0]}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={() => handleToggleBanStatus(selectedSA.uid, selectedSA.status)}
          disabled={actionLoading}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 8,
            backgroundColor: selectedSA.status === 'blocked' ? '#10B981' : '#EF4444',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: actionLoading ? 0.5 : 1,
            alignSelf: isMobile ? 'stretch' : 'auto',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
            {selectedSA.status === 'blocked' ? 'Unban Aggregator' : 'Ban Aggregator'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stacks the grid panel boxes on lower breakpoints */}
      <View style={[styles.splitGridInfoCardBlocksFlexRowContainer, isMobile && { flexDirection: 'column', marginBottom: 12 }]}>
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Profile Information</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><DroneIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Total Bookings</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.totalBookings || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Revenue Generated</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{formatCurrency(selectedSA.totalRevenue)}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Commission Earned</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{formatCurrency(selectedSA.commissionEarned)}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><PersonIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Customers Network</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.totalCustomers || 0}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><LocationIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Regions</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedSA.regions?.join(', ') || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Account Details</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>SA ID</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.uid?.slice(0, 12) || 'N/A'}...</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><ClockIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Joined Date</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{formatDate(selectedSA.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><EmailIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Email</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.email || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><CallIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Mobile</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.phone || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><ActivityIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Verified</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>{selectedSA.isVerified ? 'Yes' : 'No'}</Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Documents</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedSA.documents?.length || 0} files
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs for Customers and Bookings */}
      <View style={styles.subTabsSegmentNavigatorToolbarRow}>
        <TouchableOpacity
          style={[styles.segmentTabItemToggleBox, activeProfileTab === 'Customers' && styles.segmentTabItemToggleBoxActive]}
          onPress={() => setActiveProfileTab('Customers')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, activeProfileTab === 'Customers' && styles.segmentTabItemToggleLabelTextActive]}>
            Customers ({selectedSA.customers?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTabItemToggleBox, activeProfileTab === 'Bookings' && styles.segmentTabItemToggleBoxActive]}
          onPress={() => setActiveProfileTab('Bookings')}
        >
          <Text style={[styles.segmentTabItemToggleLabelText, activeProfileTab === 'Bookings' && styles.segmentTabItemToggleLabelTextActive]}>
            Bookings ({selectedSA.bookings?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customers List */}
      {activeProfileTab === 'Customers' && (
        /* Horizontal ScrollView wrapper around the customers table */
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <Text style={styles.gridPanelSectionHeadingTitleText}>
              Customers ({selectedSA.customers?.length || 0})
            </Text>
            {!selectedSA.customers || selectedSA.customers.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 16 }}>No customers</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Phone</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Status</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Bookings</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Revenue</Text>
                </View>
                {selectedSA.customers.map((customer) => (
                  <View key={customer.uid} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{customer.name}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{customer.phone || 'N/A'}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{customer.status}</Text>
                    <Text style={[styles.bodyCell, { flex: 1 }]}>{customer.totalBookings || 0}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.2 }]}>₹{formatCurrency(customer.totalRevenue)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Bookings List */}
      {activeProfileTab === 'Bookings' && (
        /* Horizontal ScrollView wrapper around the bookings table */
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <Text style={styles.gridPanelSectionHeadingTitleText}>
              Bookings ({selectedSA.bookings?.length || 0})
            </Text>
            {!selectedSA.bookings || selectedSA.bookings.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 16 }}>No bookings</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Booking ID</Text>
                  <Text style={[styles.headerCell, { flex: 1.8 }]}>Service</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Crop</Text>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Area</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Status</Text>
                  <Text style={[styles.headerCell, { flex: 1.2 }]}>Amount</Text>
                  <Text style={[styles.headerCell, { flex: 1.5 }]}>Date</Text>
                </View>
                {selectedSA.bookings.map((booking: any) => (
                  <View key={booking.bookingId} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, { flex: 1.5, fontSize: 13 }]} numberOfLines={1}>
                      {booking.bookingNumber || booking.bookingId}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 1.8 }]}>{booking.serviceType}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.2 }]}>{booking.cropType}</Text>
                    <Text style={[styles.bodyCell, { flex: 1 }]}>{booking.area} {booking.unit}</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-start' }}>
                      <View style={[
                        styles.onlineStatusBadgePill,
                        booking.bookingStatus === 'COMPLETED' && { backgroundColor: '#ECFDF5' },
                        booking.bookingStatus === 'IN_PROGRESS' && { backgroundColor: '#FEF3C7' },
                        booking.bookingStatus === 'CANCELLED' && { backgroundColor: '#FEE2E2' },
                      ]}>
                        <Text style={[
                          styles.onlineStatusBadgePillText,
                          booking.bookingStatus === 'COMPLETED' && { color: '#10B981' },
                          booking.bookingStatus === 'IN_PROGRESS' && { color: '#F59E0B' },
                          booking.bookingStatus === 'CANCELLED' && { color: '#EF4444' },
                        ]}>
                          {booking.bookingStatus}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bodyCell, { flex: 1.2 }]}>₹{formatCurrency(booking.price?.total)}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{formatDate(booking.createdAt)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </>
    );
  };

  // ==================== SCREEN 2: INCOMING REQUEST APPROVAL LAYOUT ====================
  const renderIncomingRequestView = () => {
    if (!selectedRequest) return null;

    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
    <>
      <TouchableOpacity style={styles.backButtonTouchBox} onPress={() => setCurrentView('LIST')}>
        <Text style={styles.backButtonChevronSymbol}>←</Text>
        <Text style={styles.backButtonDescriptionText}>Back to Sales Aggregator</Text>
      </TouchableOpacity>

      {/* Added responsive alignments for incoming summary profile header */}
      <View style={[styles.heroProfileIdentitySurfaceCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.heroLeftLayoutDataRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.largeHeroProfileAvatarCircle, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.largeHeroAvatarInitialsText}>
              {getInitials(selectedRequest.contactPerson || selectedRequest.email)}
            </Text>
          </View>
          <View style={styles.heroProfileMetadataTextBlock}>
            <Text style={styles.heroProfileNameText}>
              {selectedRequest.contactPerson || 'Contact Person Not Provided'}
            </Text>
            <Text style={styles.heroProfileTitleRoleDescriptor}>Sales Aggregator Request</Text>
            <View style={styles.heroPillBadgesLayoutRow}>
              <View style={[
                styles.onlineStatusBadgePill,
                selectedRequest.status === 'pending' && { backgroundColor: '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.onlineStatusBadgePillText,
                  selectedRequest.status === 'pending' && { color: '#F59E0B' }
                ]}>
                  {selectedRequest.status === 'pending' ? 'Pending' : selectedRequest.status === 'approved' ? 'Approved' : 'Rejected'}
                </Text>
              </View>
              {selectedRequest.state && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>
                    {selectedRequest.state}
                  </Text>
                </View>
              )}
              {selectedRequest.region && (
                <View style={styles.regionalContextLocationPillBadge}>
                  <Text style={styles.regionalContextLocationPillBadgeText}>
                    {selectedRequest.region}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.heroPillBadgesLayoutRow, isMobile && { alignSelf: 'stretch', justifyContent: 'space-between' }]}>
          <TouchableOpacity
            style={[styles.heroAcceptBtn, isMobile && { flex: 1, alignItems: 'center', marginRight: 8 }]}
            onPress={() => selectedRequest && handleAcceptRequest(selectedRequest.id)}
            disabled={actionLoading}
          >
            <Text style={styles.heroAcceptBtnText}>
              {actionLoading ? 'Processing...' : 'Accept'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroRejectBtn, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setShowRejectModal(true)}
            disabled={actionLoading}
          >
            <Text style={styles.heroRejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic column layout wrap rules applied around grid structures */}
      <View style={[styles.splitGridInfoCardBlocksFlexRowContainer, isMobile && { flexDirection: 'column', marginBottom: 12 }]}>
        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Profile Information</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><LocationIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Region</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.region || 'N/A'}, {selectedRequest.state || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><BriefcaseIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Business Name</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.businessName || 'Not provided'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><PersonIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Contact Person</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.contactPerson || 'Not provided'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><CallIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Mobile</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.phone || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.gridFlexibleInfoPanelCardItem, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>Account Details</Text>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><ClockIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Application Date</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {formatDate(selectedRequest.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><ActivityIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Last Updated</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {formatDate(selectedRequest.updatedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><EmailIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Email</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.email || 'Not provided'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Notes</Text>
              <Text style={styles.parameterCoreValueHeadlineText}>
                {selectedRequest.notes || 'No notes'}
              </Text>
            </View>
          </View>
          <View style={styles.parameterMetricRowItemUnit}>
            <Text style={styles.parameterItemSymbolIconIndicator}><SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} /></Text>
            <View>
              <Text style={styles.parameterHeaderDescriptorLabelText}>Documents</Text>
              <TouchableOpacity onPress={() => setDocModalVisible(true)}>
                <Text style={[styles.parameterCoreValueHeadlineText, styles.underlineTextActionLink]}>
                  {selectedRequest.documents && selectedRequest.documents.length > 0
                    ? `${selectedRequest.documents.length} files`
                    : 'No documents'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Submitted Form Details Section */}
      {(selectedRequest as any)?.formData && Object.keys((selectedRequest as any).formData).length > 0 && (
        <View style={styles.detailsContainerBoxCard}>
          <Text style={styles.gridPanelSectionHeadingTitleText}>All Submitted Form Details</Text>
          <View style={styles.formEntriesGrid}>
            {Object.entries((selectedRequest as any).formData)
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
      {/* Primary Dynamic App Core Data Layout Canvas Panel View */}
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
        {/* Top Header Row Panel Section */}
        {currentView === 'LIST' && (
          <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={isMobile && { marginBottom: 16 }}>
              <View style={styles.breadcrumbContainer}>
                <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
                <Text style={styles.breadcrumbSeparator}>&gt;</Text>
                <Text style={styles.breadcrumbActive}>Sales Aggregators</Text>
              </View>
              <Text style={styles.pageTitle}>Sales Aggregators (SA) Management</Text>
              <Text style={styles.pageSubtitle}>Manage all your Sales Aggregators</Text>
            </View>
            <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Sales Aggregators (name, ID, email)"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setIsSearching(true);
                }}
              />
              {isSearching ? (
                <ActivityIndicator size="small" color="#4F46E5" style={{ marginRight: 8 }} />
              ) : (
                <Text style={styles.searchIcon}>🔍</Text>
              )}
            </View>
          </View>
        )}

        {/* Dynamic Navigation Sub-View Switching Controller Frame */}
        {currentView === 'LIST' && renderListView()}
        {currentView === 'DETAILS' && renderDetailsView()}
        {currentView === 'INCOMING_REQUEST' && renderIncomingRequestView()}

        {/* ==================== SCREEN 3: INTERACTIVE DOCUMENTS VERIFICATION OVERLAY MODAL ==================== */}
        <Modal visible={docModalVisible} transparent animationType="fade" onRequestClose={() => setDocModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setDocModalVisible(false)}>
            <View style={styles.modalBackdropMask}>
              <TouchableWithoutFeedback>
                <View style={[styles.documentModalPanelCard, isMobile && { width: '92%', height: '80%', padding: 16 }]}>
                  <View style={styles.docModalHeaderContainerRow}>
                    <Text style={styles.docModalHeadlineHeadingText} numberOfLines={1}>
                      Documents provided by {selectedRequest?.contactPerson || selectedSA?.name || 'Applicant'}
                    </Text>
                    <TouchableOpacity onPress={() => setDocModalVisible(false)} style={styles.closeTouchArea}>
                      <Text style={styles.closeIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.docModalBodyHorizontalSplitLayout, isMobile && { flexDirection: 'column' }]}>
                    {/* Left Tab Links Navigation Sidebar */}
                    <View style={[styles.docModalLeftMenuTabsSidebar, isMobile && { width: '100%', borderRightWidth: 0, paddingRight: 0, marginBottom: 12 }]}>
                      <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
                        {[
                          { id: 'Front', label: 'Aadhar Card Front' },
                          { id: 'Back', label: 'Aadhar Card Back' },
                          { id: 'Pan', label: 'Pan Card' },
                          { id: 'Gst', label: 'GST Registration' }
                        ].map((docTab) => (
                          <TouchableOpacity
                            key={docTab.id}
                            style={[
                              styles.docTabSelectorRowLink,
                              selectedDocTab === docTab.id && styles.docTabSelectorRowLinkActive,
                              isMobile && { marginRight: 8, paddingVertical: 8, paddingHorizontal: 12 }
                            ]}
                            onPress={() => setSelectedDocTab(docTab.id as any)}
                          >
                            <Text style={[styles.docTabSelectorLinkLabelText, selectedDocTab === docTab.id && styles.docTabSelectorLinkLabelTextActive]}>
                              📁  {docTab.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Right Document Graphic Frame Preview canvas display placeholder */}
                    <View style={styles.docModalRightCanvasDisplayFrame}>
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600' }}
                        style={styles.identityDocumentGraphicImagePreviewCanvas}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ==================== REJECTION REASON MODAL ==================== */}
        <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowRejectModal(false)}>
            <View style={styles.modalBackdropMask}>
              <TouchableWithoutFeedback>
                <View style={[styles.documentModalPanelCard, { height: 'auto' }, isMobile && { width: '92%', padding: 16 }]}>
                  <View style={styles.docModalHeaderContainerRow}>
                    <Text style={styles.docModalHeadlineHeadingText}>Reject SA Request</Text>
                    <TouchableOpacity onPress={() => setShowRejectModal(false)} style={styles.closeTouchArea}>
                      <Text style={styles.closeIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ padding: 24 }}>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
                      Please provide a reason for rejecting this request:
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        minHeight: 100,
                        textAlignVertical: 'top',
                      }}
                      multiline
                      numberOfLines={4}
                      placeholder="Enter rejection reason..."
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowRejectModal(false);
                          setRejectionReason('');
                        }}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 20,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#D1D5DB',
                          backgroundColor: '#FFF',
                        }}
                        disabled={actionLoading}
                      >
                        <Text style={{ color: '#374151', fontSize: 14, fontWeight: '500' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectRequest()}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 20,
                          borderRadius: 6,
                          backgroundColor: '#EF4444',
                        }}
                        disabled={actionLoading || !rejectionReason.trim()}
                      >
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '500' }}>
                          {actionLoading ? 'Rejecting...' : 'Reject Request'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

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
    backgroundColor: '#4F46E5',
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
    color: '#4F46E5',
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
    backgroundColor: '#4F46E5',
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
    backgroundColor: '#FAFBFD',
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
  actionWrapperCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  documentButtonText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  acceptButton: {
    borderWidth: 1,
    borderColor: '#535CE8',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  acceptButtonText: {
    fontSize: 12,
    color: '#535CE8',
    fontWeight: '600',
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  rejectButtonText: {
    fontSize: 12,
    color: '#EF4444',
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
    borderRadius: 10,
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
  modalBackdropMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentModalPanelCard: {
    width: 820,
    height: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  docModalHeaderContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  docModalHeadlineHeadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeTouchArea: {
    padding: 4,
  },
  closeIconText: {
    fontSize: 14,
    color: '#6B7280',
  },
  docModalBodyHorizontalSplitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  docModalLeftMenuTabsSidebar: {
    width: 240,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    paddingRight: 16,
  },
  docTabSelectorRowLink: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  docTabSelectorRowLinkActive: {
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 2,
    borderColor: '#4F46E5',
  },
  docTabSelectorLinkLabelText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  docTabSelectorLinkLabelTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  docModalRightCanvasDisplayFrame: {
    flex: 1,
    paddingLeft: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  identityDocumentGraphicImagePreviewCanvas: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
  paginationInfo: {
    alignItems: 'center',
    flex: 1,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paginationSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paginationPageInfo: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
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
});
