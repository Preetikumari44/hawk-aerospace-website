import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Modal } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { useApi } from '../hooks/useApi';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useAuth } from '../context/AuthContext';
import { CLIENT_EVENTS } from '../context/SocketContext';
import { marketplaceApi, type MarketplaceOrder, type SupportTicket } from '../api/marketplace.api';
import Pagination from '../components/Pagination';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import DroneIcon from '../assets/icons/DroneIcon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import RevenueIcon from '../assets/icons/rupee-icon.svg';
import CheckCircleIcon from '../assets/icons/CheckCircleIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

// ── RBAC guard ──────────────────────────────────────────

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin' && user?.role !== 'subadmin' && user?.role !== 'super_admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12 }}>Access Denied</Text>
        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Admin role required</Text>
      </View>
    );
  }
  return <>{children}</>;
}

// ── Status pill ─────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    in_progress: { bg: '#EFF6FF', text: '#3B82F6', border: '#3B82F6' },
    delivered: { bg: '#DCFCE7', text: '#166534', border: '#22C55E' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    refunded: { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' },
    open: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    resolved: { bg: '#DCFCE7', text: '#166534', border: '#22C55E' },
  };
  const c = map[status] ?? map.pending;
  return (
    <View style={[styles.pillBadgeContainer, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.pillBadgeText, { color: c.text }]}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Text>
    </View>
  );
}

// ── Format helpers ──────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

export default function MarketplaceManagementScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'Orders' | 'Support'>('Orders');
  const [refreshing, setRefreshing] = useState(false);

  // ── Responsive width layout hooks ───────────────────
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Filter state
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('This Month');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All States');

  // Dropdown visibility state
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  // Pagination state
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit] = useState(20);

  // Service options
  const serviceOptions = ['All', 'Drone Spraying', 'Maintenance', 'Parts & Accessories', 'Training', 'Consultation'];

  // State options (Indian states)
  const stateOptions = [
    'All States',
    'Maharashtra',
    'Karnataka',
    'Tamil Nadu',
    'Gujarat',
    'Rajasthan',
    'Uttar Pradesh',
    'Madhya Pradesh',
    'Punjab',
    'Haryana',
    'Kerala',
    'Andhra Pradesh',
    'Telangana',
    'West Bengal',
    'Bihar',
    'Odisha',
  ];

  // Build query parameters based on filters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', ordersPage.toString());
    params.append('limit', ordersLimit.toString());

    // Note: Add time period filter when backend supports it
    // if (selectedTimePeriod && selectedTimePeriod !== 'Custom') {
    //   params.append('period', selectedTimePeriod.toLowerCase().replace(' ', '_'));
    // }

    // Note: Add service filter when backend supports it
    // if (selectedService && selectedService !== 'All') {
    //   params.append('service', selectedService);
    // }

    // Note: Add state filter when backend supports it
    // if (selectedState && selectedState !== 'All States') {
    //   params.append('state', selectedState);
    // }

    return params.toString();
  };

  // ── Real backend data ───────────────────────────────
  // Note: Filters will refetch data, but backend needs to support filter params
  const stats = useApi(() => marketplaceApi.getStats(), [selectedTimePeriod, selectedService, selectedState]);
  const orders = useApi(() => marketplaceApi.getOrders(getQueryParams()), [ordersPage, selectedTimePeriod, selectedService, selectedState]);
  const tickets = useApi(() => marketplaceApi.getSupportTickets(), []);

  // ── WS realtime ─────────────────────────────────────
  useSocketEvent(CLIENT_EVENTS.ADMIN_ACTION, () => { stats.refetch(); orders.refetch(); });
  useSocketEvent(CLIENT_EVENTS.TICKET_CREATED, () => { tickets.refetch(); stats.refetch(); });
  useSocketEvent(CLIENT_EVENTS.TICKET_STATUS, () => { tickets.refetch(); stats.refetch(); });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    stats.refetch(); orders.refetch(); tickets.refetch();
    setRefreshing(false);
  }, [stats, orders, tickets]);

  const ordersData = orders.data?.items ?? [];
  const ordersTotal = orders.data?.total ?? 0;
  const ordersTotalPages = Math.ceil(ordersTotal / ordersLimit);

  const ticketsData = tickets.data ?? [];
  const s = stats.data;

  return (
    <RoleGuard>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >

      {/* Breadcrumb + Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Marketplace Management</Text>
          </View>
          <Text style={styles.pageTitle}>Marketplace Management</Text>
          <Text style={styles.pageSubtitle}>Manage your marketplace</Text>
        </View>
      </View>

      {/* Filter bar */}
      {/* Responsive: filter groups stack + scroll horizontally on compact displays */}
      <View style={[styles.timelineBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsLeftGroup, isMobile && { marginBottom: 12 }]}
        >
          {['This Year', 'Quarter', 'This Month', 'This Week', 'Day'].map((label) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.timelineChip,
                selectedTimePeriod === label && styles.timelineChipActive
              ]}
              onPress={() => setSelectedTimePeriod(label)}
            >
              <Text style={[
                styles.timelineChipText,
                selectedTimePeriod === label && styles.timelineChipTextActive
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Desktop View: Show all filters inline */}
        {!isMobile && (
          <View style={styles.chipsRightGroup}>
            {/* Service Dropdown Container */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownMiniCard}
                onPress={() => {
                  setShowServiceDropdown(!showServiceDropdown);
                  setShowStateDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {selectedService === 'All' ? 'All Services' : selectedService}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Service Dropdown Menu */}
              {showServiceDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll}>
                    {serviceOptions.map((service) => (
                      <TouchableOpacity
                        key={service}
                        style={[
                          styles.dropdownItem,
                          selectedService === service && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setSelectedService(service);
                          setShowServiceDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedService === service && styles.dropdownItemTextActive
                        ]}>
                          {service === 'All' ? 'All Services' : service}
                        </Text>
                        {selectedService === service && (
                          <CheckCircleIcon width={14} height={14} fill="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* State Dropdown Container */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownMiniCard}
                onPress={() => {
                  setShowStateDropdown(!showStateDropdown);
                  setShowServiceDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>{selectedState}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* State Dropdown Menu */}
              {showStateDropdown && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll}>
                    {stateOptions.map((state) => (
                      <TouchableOpacity
                        key={state}
                        style={[
                          styles.dropdownItem,
                          selectedState === state && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setSelectedState(state);
                          setShowStateDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedState === state && styles.dropdownItemTextActive
                        ]}>
                          {state}
                        </Text>
                        {selectedState === state && (
                          <CheckCircleIcon width={14} height={14} fill="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.filterMenuButton} 
              onPress={() => {
                setSelectedTimePeriod('This Month');
                setSelectedService('All');
                setSelectedState('All States');
              }}
            >
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
            <TouchableOpacity 
              style={styles.filterMenuButton} 
              onPress={() => {
                setSelectedTimePeriod('This Month');
                setSelectedService('All');
                setSelectedState('All States');
              }}
            >
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
                  {serviceOptions.map((service) => (
                    <TouchableOpacity 
                      key={service} 
                      style={[styles.filterMenuItem, selectedService === service && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setSelectedService(service); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>
                        {service === 'All' ? 'All Services' : service}
                      </Text>
                      {selectedService === service && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* State Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>State</Text>
                <ScrollView style={styles.filterScrollView}>
                  {stateOptions.map((state) => (
                    <TouchableOpacity 
                      key={state} 
                      style={[styles.filterMenuItem, selectedState === state && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setSelectedState(state); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>{state}</Text>
                      {selectedState === state && <Text style={styles.checkMark}>✓</Text>}
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

      {/* Metrics from backend */}
      {/* Responsive: metric cards stack vertically on mobile */}
      {stats.isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 20 }} />
      ) : stats.error ? (
        <Text style={{ color: '#EF4444', textAlign: 'center', marginVertical: 20 }}>⚠ {stats.error.message}</Text>
      ) : (
        <View style={[styles.metricsRow, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.metricCard, { backgroundColor: '#1E3A8A' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
            <Text style={styles.metricLabelText}>Total Marketplace Revenue (₹)</Text>
            <Text style={styles.metricValueText}>{s ? fmt(s.totalRevenue) : '—'}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#2563EB' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
            <Text style={styles.metricLabelText}>Total Orders</Text>
            <Text style={styles.metricValueText}>{s?.totalOrders ?? '—'}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#1D4ED8' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
            <Text style={styles.metricLabelText}>Total Customers</Text>
            <Text style={styles.metricValueText}>{s ? fmt(s.totalCustomers) : '—'}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#1E40AF' }, isMobile && { marginRight: 0 }]}>
            <Text style={styles.metricLabelText}>Total Products</Text>
            <Text style={styles.metricValueText}>{s?.totalProducts ?? '—'}</Text>
          </View>
        </View>
      )}

      {/* Charts */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Total Revenue in Lakhs over Time</Text>
        </View>
        {s?.revenueTimeSeries ? (
          <MarketplaceRevenueTimeSeriesChart data={s.revenueTimeSeries} />
        ) : (
          <View style={styles.chartMockAreaBlock}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}
      </View>
      <View style={styles.cardContainer}>
        <Text style={styles.cardSectionHeadingTitle}>🛒 Total Orders over Time</Text>
        {s?.ordersTimeSeries ? (
          <MarketplaceOrdersTimeSeriesChart data={s.ordersTimeSeries} />
        ) : (
          <View style={styles.chartMockAreaBlock}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}
      </View>

      {/* Summary cards from backend */}
      {/* Responsive: summary cards expand full-width on mobile */}
      <View style={[styles.todoGridRow, isMobile && { flexDirection: 'column' }]}>
        {[
          { title: 'Total Vendors', val: s?.totalVendors?.toString() ?? '—' },
          { title: 'Total Support Tickets', val: s?.totalSupportTickets?.toString() ?? '—' },
          { title: 'Total Refund', val: s?.totalRefunds?.toString() ?? '—' }
        ].map((task, idx) => (
          <View key={idx} style={[styles.todoItemBoxCard, isMobile && { width: '100%', marginBottom: 12 }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.todoTextWrap}>
              <Text style={styles.todoCardLabel}>{task.title}</Text>
              <Text style={styles.todoCardValue}>{task.val}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sub Tab Toggle */}
      <View style={styles.logTableHeaderFiltersBar}>
        <View style={styles.leftButtonGroupFilters}>
          <TouchableOpacity
            style={[styles.tableFilterToggleBtn, activeSubTab === 'Orders' && styles.tableFilterToggleBtnActive]}
            onPress={() => setActiveSubTab('Orders')}
          >
            <Text style={[styles.tableFilterToggleText, activeSubTab === 'Orders' && styles.tableFilterToggleTextActive]}>
              Orders ({ordersData.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tableFilterToggleBtn, activeSubTab === 'Support' && styles.tableFilterToggleBtnActive]}
            onPress={() => setActiveSubTab('Support')}
          >
            <Text style={[styles.tableFilterToggleText, activeSubTab === 'Support' && styles.tableFilterToggleTextActive]}>
              Support Tickets ({ticketsData.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders Table — real data */}
      {/* Horizontal-scroll wrapper around the wide orders catalog table */}
      {activeSubTab === 'Orders' && (
        <>
          {isMobile ? (
            <View style={{ gap: 12, marginBottom: 16 }}>
              {orders.isLoading ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
              ) : orders.error ? (
                <Text style={{ color: '#EF4444', padding: 16 }}>⚠ {orders.error.message}</Text>
              ) : ordersData.length === 0 ? (
                <Text style={{ color: '#9CA3AF', padding: 16, textAlign: 'center' }}>No orders found</Text>
              ) : (
                ordersData.map((row: MarketplaceOrder) => (
                  <View key={row.orderId} style={styles.mobileCard}>
                    <View style={styles.mobileCardHeader}>
                      <Text style={styles.mobileCardTitle} numberOfLines={1}>{row.productName}</Text>
                      <StatusPill status={row.status} />
                    </View>
                    <View style={styles.mobileCardBody}>
                      <View style={styles.mobileCardFieldRow}>
                        <Text style={styles.mobileCardLabel}>Order ID</Text>
                        <Text style={styles.mobileCardValue}>{row.orderId.slice(0, 12)}</Text>
                      </View>
                      <View style={styles.mobileCardFieldRow}>
                        <Text style={styles.mobileCardLabel}>Price</Text>
                        <Text style={styles.mobileCardValueBold}>₹{row.price.toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.mobileCardFieldRow}>
                        <Text style={styles.mobileCardLabel}>Vendor</Text>
                        <Text style={styles.mobileCardValue}>{row.vendorName || '—'}</Text>
                      </View>
                      {/* Location: stacked column so long address wraps fully */}
                      <View style={styles.mobileCardFieldColumn}>
                        <Text style={styles.mobileCardLabel}>Location</Text>
                        <Text style={styles.mobileCardValue} numberOfLines={3}>{row.deliveryLocation}</Text>
                      </View>
                      <View style={styles.mobileCardFieldRow}>
                        <Text style={styles.mobileCardLabel}>Delivery Date</Text>
                        <Text style={styles.mobileCardValue}>{row.deliveryDate || '—'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={[styles.logGridContainerCard, { width: Math.max(width - 64, 900) }]}>
                <View style={styles.gridColumnsHeaderLine}>
                  <Text style={[styles.gridHeaderCellText, { flex: 2.5 }]}>Product Name ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 1.5, textAlign: 'center' }]}>Status ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Order ID ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 1.5 }]}>Price (₹) ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 2.5 }]}>Delivery Location ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Delivery Date ▲</Text>
                  <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Vendor Name ▲</Text>
                </View>

                {orders.isLoading ? (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
                ) : orders.error ? (
                  <Text style={{ color: '#EF4444', padding: 16 }}>⚠ {orders.error.message}</Text>
                ) : ordersData.length === 0 ? (
                  <Text style={{ color: '#9CA3AF', padding: 16, textAlign: 'center' }}>No orders found</Text>
                ) : (
                  ordersData.map((row: MarketplaceOrder) => (
                    <View key={row.orderId} style={styles.gridBodyDataRow}>
                      <Text style={[styles.gridBodyCellText, styles.boldBodyCell, { flex: 2.5 }]}>{row.productName}</Text>
                      <View style={{ flex: 1.5, alignItems: 'center' }}>
                        <StatusPill status={row.status} />
                      </View>
                      <Text style={[styles.gridBodyCellText, { flex: 2, color: '#4B5563' }]}>{row.orderId.slice(0, 12)}</Text>
                      <Text style={[styles.gridBodyCellText, { flex: 1.5 }]}>₹{row.price.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.gridBodyCellText, { flex: 2.5, color: '#4B5563' }]} numberOfLines={1}>{row.deliveryLocation}</Text>
                      <Text style={[styles.gridBodyCellText, { flex: 2, color: '#4B5563' }]}>{row.deliveryDate || '—'}</Text>
                      <Text style={[styles.gridBodyCellText, { flex: 2 }]}>{row.vendorName || '—'}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* Orders Pagination */}
          {!orders.isLoading && ordersTotal > ordersLimit && (
            <Pagination
              page={ordersPage}
              totalPages={ordersTotalPages}
              totalCount={ordersTotal}
              pageSize={ordersLimit}
              onPageChange={setOrdersPage}
              itemLabel="orders"
            />
          )}
        </>
      )}

      {/* Support Tickets Table — real data */}
      {/* Horizontal-scroll wrapper around the wide support tickets table */}
      {activeSubTab === 'Support' && (
        isMobile ? (
          <View style={{ gap: 12, marginBottom: 16 }}>
            {tickets.isLoading ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
            ) : tickets.error ? (
              <Text style={{ color: '#EF4444', padding: 16 }}>⚠ {tickets.error.message}</Text>
            ) : ticketsData.length === 0 ? (
              <Text style={{ color: '#9CA3AF', padding: 16, textAlign: 'center' }}>No support tickets</Text>
            ) : (
              ticketsData.map((t: SupportTicket) => (
                <View key={t.ticketId} style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <Text style={styles.mobileCardTitle} numberOfLines={1}>{t.subject}</Text>
                    <StatusPill status={t.status} />
                  </View>
                  <View style={styles.mobileCardBody}>
                    <View style={styles.mobileCardFieldRow}>
                      <Text style={styles.mobileCardLabel}>Ticket ID</Text>
                      <Text style={styles.mobileCardValue}>{t.ticketId.slice(0, 10)}</Text>
                    </View>
                    <View style={styles.mobileCardFieldRow}>
                      <Text style={styles.mobileCardLabel}>Order ID</Text>
                      <Text style={styles.mobileCardValue}>{t.orderId?.slice(0, 10) ?? '—'}</Text>
                    </View>
                    <View style={styles.mobileCardFieldRow}>
                      <Text style={styles.mobileCardLabel}>Priority</Text>
                      <Text style={[styles.mobileCardValue, { fontWeight: '600', color: t.priority === 'high' ? '#EF4444' : '#374151' }]}>
                        {t.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.mobileCardFieldRow}>
                      <Text style={styles.mobileCardLabel}>Created</Text>
                      <Text style={styles.mobileCardValue}>{t.createdAt?.slice(0, 10) ?? '—'}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={[styles.logGridContainerCard, { width: Math.max(width - 64, 900) }]}>
              <View style={styles.gridColumnsHeaderLine}>
                <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Ticket ID</Text>
                <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Order ID</Text>
                <Text style={[styles.gridHeaderCellText, { flex: 3 }]}>Subject</Text>
                <Text style={[styles.gridHeaderCellText, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
                <Text style={[styles.gridHeaderCellText, { flex: 1, textAlign: 'center' }]}>Priority</Text>
                <Text style={[styles.gridHeaderCellText, { flex: 2 }]}>Created</Text>
              </View>

              {tickets.isLoading ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
              ) : tickets.error ? (
                <Text style={{ color: '#EF4444', padding: 16 }}>⚠ {tickets.error.message}</Text>
              ) : ticketsData.length === 0 ? (
                <Text style={{ color: '#9CA3AF', padding: 16, textAlign: 'center' }}>No support tickets</Text>
              ) : (
                ticketsData.map((t: SupportTicket) => (
                  <View key={t.ticketId} style={styles.gridBodyDataRow}>
                    <Text style={[styles.gridBodyCellText, styles.boldBodyCell, { flex: 2 }]}>{t.ticketId.slice(0, 10)}</Text>
                    <Text style={[styles.gridBodyCellText, { flex: 2, color: '#4B5563' }]}>{t.orderId?.slice(0, 10) ?? '—'}</Text>
                    <Text style={[styles.gridBodyCellText, { flex: 3 }]}>{t.subject}</Text>
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <StatusPill status={t.status} />
                    </View>
                    <Text style={[styles.gridBodyCellText, { flex: 1, textAlign: 'center', fontWeight: '600', color: t.priority === 'high' ? '#EF4444' : '#374151' }]}>
                      {t.priority.toUpperCase()}
                    </Text>
                    <Text style={[styles.gridBodyCellText, { flex: 2, color: '#4B5563' }]}>{t.createdAt?.slice(0, 10) ?? '—'}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )
      )}

    </ScrollView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { padding: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  breadcrumbHome: { fontSize: 12 },
  breadcrumbSeparator: { marginHorizontal: 6, color: '#9CA3AF', fontSize: 11 },
  breadcrumbActive: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  timelineBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, zIndex: 100 },
  chipsLeftGroup: { flexDirection: 'row' },
  timelineChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 6, marginRight: 8 },
  timelineChipActive: { backgroundColor: '#2563EB' },
  timelineChipText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  timelineChipTextActive: { color: '#FFFFFF' },
  chipsRightGroup: { flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownMiniCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8, backgroundColor: '#FFFFFF' },
  dropdownText: { fontSize: 12, color: '#374151', marginRight: 8 },
  dropdownArrow: { fontSize: 8, color: '#6B7280' },
  filterMenuButton: { marginLeft: 10, padding: 2 },

  // Dropdown Menu Styles
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
    minWidth: 200,
    maxHeight: 300,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  dropdownCheckmark: {
    fontSize: 14,
    color: '#2563EB',
  },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { flex: 1, padding: 20, borderRadius: 12, marginRight: 12 },
  metricLabelText: { fontSize: 12, color: '#FFFFFF', opacity: 0.9 },
  metricValueText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 20 },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardSectionHeadingTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  chartMockAreaBlock: { height: 180, backgroundColor: '#FAFAFA', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  chartAreaLabelPlaceholder: { color: '#9CA3AF', fontSize: 12 },
  todoGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  todoItemBoxCard: { width: '32.5%' as any, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 18, flexDirection: 'row', alignItems: 'center' },
  todoIconPrefix: { fontSize: 16, color: '#9CA3AF' },
  todoTextWrap: { marginLeft: 12, flex: 1 },
  todoCardLabel: { fontSize: 11, color: '#6B7280' },
  todoCardValue: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 4 },
  logTableHeaderFiltersBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  leftButtonGroupFilters: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tableFilterToggleBtn: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 8 },
  tableFilterToggleBtnActive: { backgroundColor: '#2563EB' },
  tableFilterToggleText: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  tableFilterToggleTextActive: { color: '#FFFFFF' },
  logGridContainerCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  gridColumnsHeaderLine: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  gridHeaderCellText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  gridBodyDataRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  gridBodyCellText: { fontSize: 12, color: '#111827' },
  boldBodyCell: { fontWeight: '600' },
  pillBadgeContainer: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pillBadgeText: { fontSize: 11, fontWeight: '600' },

  // Pagination
  paginationContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingHorizontal: 16 },
  paginationText: { fontSize: 12, color: '#6B7280' },
  paginationButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paginationButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563EB', borderRadius: 6 },
  paginationButtonDisabled: { backgroundColor: '#E5E7EB' },
  paginationButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  paginationButtonTextDisabled: { color: '#9CA3AF' },
  paginationPageText: { fontSize: 12, fontWeight: '600', color: '#374151', marginHorizontal: 8 },
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
  mobileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  mobileCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  mobileCardBody: {
    gap: 6,
  },
  mobileCardFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileCardFieldColumn: {
    flexDirection: 'column',
    gap: 2,
  },
  mobileCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  mobileCardValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  mobileCardValueBold: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
});

function MarketplaceRevenueTimeSeriesChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const W = 800;
  const H = 180;
  const PAD = { top: 15, right: 20, bottom: 35, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Convert revenue to Lakhs (1 Lakh = 100,000)
  const revenuesInLakhs = data.map((d) => d.revenue / 100000);
  const maxVal = Math.max(...revenuesInLakhs, 1);
  const roundedMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => Math.round(roundedMax * t));

  const xStep = chartW / Math.max(data.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / roundedMax) * chartH;

  const points = revenuesInLakhs.map((val, i) => ({ x: toX(i), y: toY(val) }));

  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`
    : '';

  const formatLabel = (lbl: string) => {
    const parts = lbl.split('-');
    if (parts.length < 2) return lbl;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return months[monthIdx] || parts[1];
  };

  return (
    <View style={{ width: '100%', height: H, overflow: 'hidden' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="mktRevGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick) => (
          <G key={tick}>
            <Line
              x1={PAD.left} y1={toY(tick)}
              x2={W - PAD.right} y2={toY(tick)}
              stroke="#E5E7EB" strokeWidth="1"
              strokeDasharray="4 4"
            />
            <SvgText x={PAD.left - 8} y={toY(tick) + 3} textAnchor="end" fontSize="9" fill="#9CA3AF" fontWeight="500">{tick}</SvgText>
          </G>
        ))}

        {/* Vertical grid lines */}
        {data.map((_, i) => (
          <Line
            key={i}
            x1={toX(i)} y1={PAD.top}
            x2={toX(i)} y2={H - PAD.bottom}
            stroke="#F3F4F6" strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axis base line */}
        <Line
          x1={PAD.left} y1={H - PAD.bottom}
          x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="#E5E7EB" strokeWidth="1.5"
        />

        {/* Filled Area Gradient */}
        {areaPath && (
          <Path d={areaPath} fill="url(#mktRevGradient)" />
        )}

        {/* Spline Path Line */}
        {linePath && (
          <Path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots on points */}
        {points.map((pt, i) => (
          <G key={i}>
            <Circle
              cx={pt.x} cy={pt.y} r="4"
              fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2"
            />
          </G>
        ))}

        {/* X-axis Labels */}
        {data.map((item, i) => (
          <SvgText key={i} x={toX(i)} y={H - 12} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="500">
            {formatLabel(item.date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function MarketplaceOrdersTimeSeriesChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const W = 800;
  const H = 180;
  const PAD = { top: 15, right: 20, bottom: 35, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const counts = data.map((d) => d.count);
  const maxVal = Math.max(...counts, 1);
  const roundedMax = Math.max(50, Math.ceil(maxVal / 50) * 50);
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => Math.round(roundedMax * t));

  const xStep = chartW / Math.max(data.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / roundedMax) * chartH;

  const points = counts.map((val, i) => ({ x: toX(i), y: toY(val) }));

  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`
    : '';

  const formatLabel = (lbl: string) => {
    const parts = lbl.split('-');
    if (parts.length < 2) return lbl;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return months[monthIdx] || parts[1];
  };

  return (
    <View style={{ width: '100%', height: H, overflow: 'hidden' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="mktOrdersGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick) => (
          <G key={tick}>
            <Line
              x1={PAD.left} y1={toY(tick)}
              x2={W - PAD.right} y2={toY(tick)}
              stroke="#E5E7EB" strokeWidth="1"
              strokeDasharray="4 4"
            />
            <SvgText x={PAD.left - 8} y={toY(tick) + 3} textAnchor="end" fontSize="9" fill="#9CA3AF" fontWeight="500">{tick}</SvgText>
          </G>
        ))}

        {/* Vertical grid lines */}
        {data.map((_, i) => (
          <Line
            key={i}
            x1={toX(i)} y1={PAD.top}
            x2={toX(i)} y2={H - PAD.bottom}
            stroke="#F3F4F6" strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axis base line */}
        <Line
          x1={PAD.left} y1={H - PAD.bottom}
          x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="#E5E7EB" strokeWidth="1.5"
        />

        {/* Filled Area Gradient */}
        {areaPath && (
          <Path d={areaPath} fill="url(#mktOrdersGradient)" />
        )}

        {/* Spline Path Line */}
        {linePath && (
          <Path d={linePath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots on points */}
        {points.map((pt, i) => (
          <G key={i}>
            <Circle
              cx={pt.x} cy={pt.y} r="4"
              fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="2"
            />
          </G>
        ))}

        {/* X-axis Labels */}
        {data.map((item, i) => (
          <SvgText key={i} x={toX(i)} y={H - 12} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="500">
            {formatLabel(item.date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
