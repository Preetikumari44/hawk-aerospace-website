import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Modal } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { serviceCentreApi, type ServiceCentreDashboard } from '../api/service-centre.api';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import DroneIcon from '../assets/icons/DroneIcon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import ActivityIcon from '../assets/icons/ActivityIcon.svg';
import RadarIcon from '../assets/icons/RadarIcon.svg';
import TrendingUpIcon from '../assets/icons/TrendingUpIcon.svg';
import DropdownArrowIcon from '../assets/icons/DropdownArrowIcon.svg';
import MenuIcon from '../assets/icons/MenuIcon.svg';
import CrossCircleIcon from '../assets/icons/CrossCircleIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

export default function ServiceCentreScreen() {
  // Responsive Width Layout Hooks (grafted from UI presentation)
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [dashboard, setDashboard] = useState<ServiceCentreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('This Month');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  const periodOptions = ['This Year', 'Quarter', 'This Month', 'This Week', 'Today'];
  const priorityOptions = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const statusOptions = ['All', 'Open', 'In Progress', 'Closed', 'Pending'];

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await serviceCentreApi.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error('Error fetching service centre dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(true);
  };

  if (loading && !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading Service Centre Dashboard...</Text>
      </View>
    );
  }

  if (error && !dashboard) {
    return (
      <View style={styles.errorContainer}>
        <CrossCircleIcon width={28} height={28} fill="#EF4444" style={{ marginBottom: 8 }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboard()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

      {/* Top Header Area with Breadcrumbs */}
      {/* UPDATED: Injected responsive properties to stack titles and actions on small widths */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Service Centre</Text>
          </View>
          <Text style={styles.pageTitle}>Service Centre Management</Text>
          <Text style={styles.pageSubtitle}>Manage your Service Centre Agents & Maintenance Tickets</Text>
        </View>

        {/* Dropdown Filters Action Group */}
        {/* Desktop View: Show all filters inline */}
        {!isMobile && (
          <View style={[styles.filterDropdownsGroup, { justifyContent: 'flex-end' }]}>
            <View style={styles.dropdownMiniCard}>
              <Text style={styles.dropdownText}>{selectedPeriod}</Text>
              <DropdownArrowIcon width={12} height={12} stroke="#6B7280" />
            </View>
            <View style={styles.dropdownMiniCard}>
              <Text style={styles.dropdownText}>{selectedPriority}</Text>
              <DropdownArrowIcon width={12} height={12} stroke="#6B7280" />
            </View>
            <View style={styles.dropdownMiniCard}>
              <Text style={styles.dropdownText}>{selectedStatus}</Text>
              <DropdownArrowIcon width={12} height={12} stroke="#6B7280" />
            </View>
            <TouchableOpacity 
              style={styles.filterMenuButton}
              onPress={() => {
                setSelectedPeriod('This Month');
                setSelectedPriority('All');
                setSelectedStatus('All');
              }}
            >
              <RefreshIcon width={18} height={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile View: Show VectorIcon with filter modal */}
        {isMobile && (
          <View style={[styles.filterDropdownsGroup, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={styles.filterIconBtn} onPress={() => setActionMenuVisible(!actionMenuVisible)}>
              <VectorIcon width={18} height={18} fill="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.filterMenuButton}
              onPress={() => {
                setSelectedPeriod('This Month');
                setSelectedPriority('All');
                setSelectedStatus('All');
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
              
              {/* Period Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Period</Text>
                <ScrollView style={styles.filterScrollView}>
                  {periodOptions.map((period) => (
                    <TouchableOpacity 
                      key={period} 
                      style={[styles.filterMenuItem, selectedPeriod === period && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setSelectedPeriod(period); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>{period}</Text>
                      {selectedPeriod === period && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Priority Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Priority</Text>
                <ScrollView style={styles.filterScrollView}>
                  {priorityOptions.map((priority) => (
                    <TouchableOpacity 
                      key={priority} 
                      style={[styles.filterMenuItem, selectedPriority === priority && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setSelectedPriority(priority); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>{priority}</Text>
                      {selectedPriority === priority && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Status Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <ScrollView style={styles.filterScrollView}>
                  {statusOptions.map((status) => (
                    <TouchableOpacity 
                      key={status} 
                      style={[styles.filterMenuItem, selectedStatus === status && styles.filterMenuItemActive]} 
                      onPress={() => { 
                        setSelectedStatus(status); 
                      }}
                    >
                      <Text style={styles.filterMenuItemText}>{status}</Text>
                      {selectedStatus === status && <Text style={styles.checkMark}>✓</Text>}
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

      {/* Core Matrix Analytics Summary Row Cards */}
      {/* 2×2 compact grid on mobile, full row on desktop */}
      <View style={[styles.metricsRow, isMobile && styles.mobileMetricsGrid]}>
        {[
          { label: 'Total Service Centre Agents', value: dashboard?.totalAgents || 0, color: '#3B82F6' },
          { label: 'Total Open Tickets',           value: dashboard?.totalOpenTickets || 0, color: '#2563EB' },
          { label: 'Total Pending Tickets',        value: dashboard?.totalPendingTickets || 0, color: '#1D4ED8' },
          { label: 'Total Completed Tickets',      value: dashboard?.totalCompletedTickets || 0, color: '#1E40AF' },
        ].map((m, i) => (
          <View key={i} style={[
            styles.metricCard,
            { backgroundColor: m.color },
            isMobile && styles.mobileMetricCard,
          ]}>
            <Text style={[styles.metricLabelText, isMobile && { fontSize: 11 }]} numberOfLines={2}>{m.label}</Text>
            <Text style={[styles.metricValueText, isMobile && { fontSize: 22, marginTop: 4 }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      {/* Tickets by Status Breakdown */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <ActivityIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Tickets by Status</Text>
        </View>
        <View style={styles.statusGrid}>
          {dashboard?.ticketsByStatus && Object.entries(dashboard.ticketsByStatus).map(([status, count]) => (
            <View key={status} style={[styles.statusItem, isMobile && { minWidth: '100%' }]}>
              <Text style={styles.statusLabel}>{status.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.statusValue}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tickets by Priority Breakdown */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <RadarIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Tickets by Priority</Text>
        </View>
        <View style={[styles.priorityGrid, isMobile && styles.priorityGridMobile]}>
          {dashboard?.ticketsByPriority && Object.entries(dashboard.ticketsByPriority).map(([priority, count]) => {
            const colors = {
              critical: '#EF4444',
              high: '#F59E0B',
              medium: '#3B82F6',
              low: '#10B981',
            };
            return (
              <View key={priority} style={[
                styles.priorityItem,
                { backgroundColor: colors[priority as keyof typeof colors] || '#6B7280' },
                isMobile && styles.priorityItemMobile,
              ]}>
                <Text style={styles.priorityLabel}>{priority.toUpperCase()}</Text>
                <Text style={styles.priorityValue}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {/* Main Chart Container Panel - Tickets Over Time */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <TrendingUpIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Tickets Count Over Time</Text>
        </View>
        {dashboard?.ticketsOverTime?.labels && dashboard.ticketsOverTime.labels.length > 0 ? (
          <View style={{ width: '100%' }}>
            <TicketsTimelineChart
              labels={dashboard.ticketsOverTime.labels}
              open={dashboard.ticketsOverTime.open}
              inProgress={dashboard.ticketsOverTime.inProgress}
              closed={dashboard.ticketsOverTime.closed}
              isMobile={isMobile}
              containerWidth={isMobile ? width - 64 : 700}
            />
          </View>
        ) : (
          <View style={styles.chartMockAreaBlock}>
            <Text style={[styles.chartAreaLabelPlaceholder, isMobile && { textAlign: 'center', paddingHorizontal: 12 }]}>No timeline data available</Text>
          </View>
        )}
      </View>
      {/* Bottom Side-by-Side Critical Summary Counters Row */}
      {/* UPDATED: Splits side panels safely to format item cards vertically below 768px */}
      <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column' }]}>
        {/* Left Card: SLA Breach Count */}
        <View style={[styles.summaryCardBox, isMobile ? { marginRight: 0, marginBottom: 12 } : { marginRight: 16 }]}>
          <Text style={styles.summaryCardLabel}>SLA Breach Count</Text>
          <View style={styles.summaryValueWrapperRow}>
            <DroneIcon width={30} height={30} fill="#9CA3AF" style={styles.titleIconPadding} />
            <Text style={styles.summaryBoldValueText}>{dashboard?.slaBreachCount || 0}</Text>
          </View>
        </View>

        {/* Right Card: Ticket Escalations */}
        <View style={styles.summaryCardBox}>
          <Text style={styles.summaryCardLabel}>Ticket Escalations</Text>
          <View style={styles.summaryValueWrapperRow}>
            <DroneIcon width={30} height={30} fill="#9CA3AF" style={styles.titleIconPadding} />
            <Text style={styles.summaryBoldValueText}>{dashboard?.ticketEscalations || 0}</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  filterDropdownsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 12,
    color: '#374151',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#6B7280',
  },
  filterMenuButton: {
    marginLeft: 10,
    padding: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  // ── Mobile metric grid — 2×2 wrap ───────────────────────────────
  mobileMetricsGrid: {
    gap: 10,
    justifyContent: 'flex-start',
  },
  metricCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    marginRight: 12,
    minHeight: 100,
    justifyContent: 'center' as const,
  },
  mobileMetricCard: {
    flexBasis: '47%',
    flex: 1,
    marginRight: 0,
    minHeight: 80,
    padding: 14,
    borderRadius: 10,
  },
  metricLabelText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  metricValueText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 24,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardSectionHeadingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    minWidth: 150,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  // 2-col grid on mobile
  priorityGridMobile: {
    gap: 10,
  },
  priorityItem: {
    flex: 1,
    minWidth: '45%' as any,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  // Mobile priority item: compact height
  priorityItemMobile: {
    flexBasis: '47%',
    flex: 1,
    padding: 12,
    marginRight: 0,
  },
  priorityLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  priorityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartMockAreaBlock: {
    height: 220,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  chartAreaLabelPlaceholder: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  chartSubtext: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  flexGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCardBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    height: 110,
    justifyContent: 'center',
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  summaryValueWrapperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryIconPrefix: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  summaryBoldValueText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
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
    marginLeft: 8,
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
    maxHeight: 120,
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
});

function TicketsTimelineChart({
  labels, open, inProgress, closed, isMobile = false, containerWidth = 700,
}: {
  labels: string[]; open: number[]; inProgress: number[]; closed: number[];
  isMobile?: boolean; containerWidth?: number;
}) {
  const W = Math.max(containerWidth, 240);
  const H = isMobile ? 180 : 220;
  const PAD = { top: 20, right: isMobile ? 12 : 30, bottom: isMobile ? 38 : 45, left: isMobile ? 28 : 40 };

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Calculate totals for each day
  const totals = labels.map((_, i) => (open[i] || 0) + (inProgress[i] || 0) + (closed[i] || 0));
  const maxVal = Math.max(...totals, 1);

  // Nice rounded max for Y-axis (e.g. 5, 10, 15, 20, 50, 100...)
  const roundedMax = maxVal <= 5 ? 5 : maxVal <= 10 ? 10 : maxVal <= 20 ? 20 : maxVal <= 50 ? 50 : Math.ceil(maxVal / 20) * 20;
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => Math.round(roundedMax * t));

  const xStep = chartW / Math.max(labels.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / roundedMax) * chartH;

  const points = totals.map((v, i) => ({ x: toX(i), y: toY(v) }));

  // Helper for smooth bezier curve
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

  // Months/Days formatting for X-axis labels
  const formatLabel = (lbl: string) => {
    const parts = lbl.split('-');
    if (parts.length < 3) return lbl;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${months[monthIdx] || ''}`;
  };

  return (
    <View style={{ width: '100%', height: H, overflow: 'hidden', padding: 8 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Dashed Grid Lines (Horizontal & Vertical) */}
        {yTicks.map((tick) => (
          <G key={tick}>
            <Line
              x1={PAD.left} y1={toY(tick)}
              x2={W - PAD.right} y2={toY(tick)}
              stroke="#E5E7EB" strokeWidth="1"
              strokeDasharray="4 4"
            />
            <SvgText x={PAD.left - 10} y={toY(tick) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="500">{tick}</SvgText>
          </G>
        ))}

        {labels.map((_, i) => (
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
          <Path d={areaPath} fill="url(#chartGradient)" />
        )}

        {/* Spline Path Line */}
        {linePath && (
          <Path d={linePath} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots on points */}
        {points.map((pt, i) => (
          <G key={i}>
            <Circle
              cx={pt.x} cy={pt.y} r="4.5"
              fill="#FFFFFF" stroke="#6366F1" strokeWidth="2.5"
            />
          </G>
        ))}

        {/* X-axis Labels */}
        {labels.map((label, i) => (
          <SvgText key={i} x={toX(i)} y={H - 16} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontWeight="500">
            {formatLabel(label)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
