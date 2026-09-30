import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { revenueApi, RevenueDashboard, RevenueChart } from '../api/revenue.api';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import DroneIcon from '../assets/icons/DroneIcon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import RevenueIcon from '../assets/icons/rupee-icon.svg';
import TrendingUpIcon from '../assets/icons/TrendingUpIcon.svg';
import CalendarIcon from '../assets/icons/CalendarIcon.svg';

type TimeFilter = 'day' | 'week' | 'month' | 'quarter' | 'year';

export default function RevenueScreen() {
  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null);
  const [serviceChart, setServiceChart] = useState<RevenueChart | null>(null);
  const [stateChart, setStateChart] = useState<RevenueChart | null>(null);
  const [trendChart, setTrendChart] = useState<RevenueChart | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('month');
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on filter
  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    let dateFrom = new Date();

    switch (filter) {
      case 'day':
        dateFrom.setDate(now.getDate());
        break;
      case 'week':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: now.toISOString(),
    };
  };

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateRange = getDateRange(selectedFilter);
      const params = {
        ...dateRange,
        period: selectedFilter === 'day' ? 'daily' : selectedFilter === 'week' ? 'weekly' : 'monthly',
      };

      console.log('📊 Fetching revenue data with params:', params);

      // Fetch all data in parallel
      const [dashboardData, serviceData, stateData, trendData] = await Promise.all([
        revenueApi.getDashboard(params),
        revenueApi.getBookingsByService(params),
        revenueApi.getBookingsByState(params),
        revenueApi.getTrend(params),
      ]);

      console.log('✅ Dashboard data received:', dashboardData);
      console.log('✅ Service data received:', serviceData);
      console.log('✅ State data received:', stateData);
      console.log('✅ Trend data received:', trendData);

      setDashboard(dashboardData.data);
      setServiceChart(serviceData.data);
      setStateChart(stateData.data);
      setTrendChart(trendData.data);

      console.log('✅ State updated successfully');
    } catch (err: any) {
      console.error('❌ Failed to fetch revenue data:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      setError(err?.response?.data?.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [selectedFilter]);

  const formatCurrency = (amount: number | undefined | null): string => {
    if (!amount || typeof amount !== 'number' || isNaN(amount)) {
      return '₹0';
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleFilterChange = (filter: TimeFilter) => {
    setSelectedFilter(filter);
  };

  if (loading) {
    console.log('🔄 Rendering loading state');
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading revenue data...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    console.log('❌ Rendering error state:', { error, hasDashboard: !!dashboard });
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error || 'No data available'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRevenueData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('✅ Rendering dashboard with data:', {
    totalRevenue: dashboard.totalRevenue,
    totalBookings: dashboard.totalBookings,
    hasServices: !!dashboard.byService,
    hasStates: !!dashboard.byState
  });

  // Calculate marketplace revenue (estimated as 40% for demo)
  const marketplaceRevenue = dashboard.totalRevenue * 0.4;
  const bookingsRevenue = dashboard.totalRevenue * 0.6;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Top Breadcrumb & Header Title */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Revenue</Text>
          </View>
          <Text style={styles.pageTitle}>Revenue Management</Text>
          <Text style={styles.pageSubtitle}>Manage and track all system streams of income</Text>
        </View>
      </View>

      {/* Filter and Timeline Control Bar */}
      {/* UPDATED: Allows horizontal flex chips to slide smoothly on small screen devices */}
      <View style={[styles.timelineBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={[styles.chipsLeftGroup, isMobile && { marginBottom: 12 }]}
        >
          {[
            { label: 'This Year', value: 'year' as TimeFilter },
            { label: 'Quarter', value: 'quarter' as TimeFilter },
            { label: 'This Month', value: 'month' as TimeFilter },
            { label: 'This Week', value: 'week' as TimeFilter },
            { label: 'Day', value: 'day' as TimeFilter },
          ].map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.timelineChip,
                selectedFilter === value && styles.timelineChipActive,
              ]}
              onPress={() => handleFilterChange(value)}
            >
              <Text
                style={[
                  styles.timelineChipText,
                  selectedFilter === value && styles.timelineChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[styles.chipsRightGroup, isMobile && { justifyContent: 'flex-end', width: '100%' }]}>
          <TouchableOpacity style={styles.filterMenuButton} onPress={fetchRevenueData}>
            <Text>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Core Revenue Analytics Matrix Grid */}
      {/* UPDATED: Cards dynamically cascade on phone layouts */}
      <View style={[styles.metricsRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.metricCard, { backgroundColor: '#3B82F6' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Bookings Revenue</Text>
          <Text style={styles.metricValueText}>{formatCurrency(bookingsRevenue)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#2563EB' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Marketplace Revenue</Text>
          <Text style={styles.metricValueText}>{formatCurrency(marketplaceRevenue)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#1D4ED8' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Revenue</Text>
          <Text style={styles.metricValueText}>{formatCurrency(dashboard.totalRevenue)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#1E40AF' }, isMobile && { marginRight: 0 }]}>
          <Text style={styles.metricLabelText}>Avg Revenue / Booking</Text>
          <Text style={styles.metricValueText}>{formatCurrency(dashboard.avgRevenuePerBooking)}</Text>
        </View>
      </View>

      {/* Growth Indicator */}
      <View style={styles.growthIndicatorCard}>
        <Text style={styles.growthLabel}>Revenue Growth</Text>
        <Text style={[styles.growthValue, dashboard.growthPercent >= 0 ? styles.growthPositive : styles.growthNegative]}>
          {dashboard.growthPercent >= 0 ? '↗' : '↘'} {Math.abs(dashboard.growthPercent).toFixed(2)}%
        </Text>
        <Text style={styles.growthSubtext}>vs previous period</Text>
      </View>

      {/* Main Spline Revenue Over Time Chart Area Wrapper */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <TrendingUpIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Total Revenue in Lakhs Over Time</Text>
        </View>
        <View style={styles.chartMockAreaBlock}>
          {trendChart && trendChart.datasets && trendChart.datasets[0] ? (
            <View style={{ padding: 20, width: '100%' }}>
              {/* Simple bar chart visualization */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140 }}>
                {trendChart.datasets[0].data.slice(0, 10).map((value, index) => {
                  const maxValue = Math.max(...trendChart.datasets[0].data);
                  const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  const heightPx = (heightPercent / 100) * 120;
                  return (
                    <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 9, color: '#6B7280', marginBottom: 4 }}>
                        {formatCurrency(value)}
                      </Text>
                      <View
                        style={{
                          width: 20,
                          height: Math.max(heightPx, 5),
                          backgroundColor: '#3B82F6',
                          borderRadius: 4,
                        }}
                      />
                      <Text style={{ fontSize: 8, color: '#9CA3AF', marginTop: 4 }}>
                        {trendChart.labels[index]?.substring(5, 10) || `D${index + 1}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 11, marginTop: 12 }}>
                Revenue trend over {trendChart.labels.length} periods
              </Text>
            </View>
          ) : (
            <Text style={[styles.chartAreaLabelPlaceholder, isMobile && { textAlign: 'center', paddingHorizontal: 12 }]}>No trend data available</Text>
          )}
        </View>
      </View>

      {/* Side-by-Side Donut / Distribution Share Breakdown Cards */}
      {/* UPDATED: Side panels re-orient into singular fluid sections below 768px */}
      <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column', marginBottom: 0 }]}>
        {/* Left Card: Distribution by Source */}
        <View style={[styles.cardContainer, { flex: 1 }, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 16 }]}>
          <View style={styles.cardHeadingRow}>
            <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.cardSectionHeadingTitle}>Distribution of Revenue as per Source</Text>
          </View>
          <View style={[styles.donutChartWrapperCenter, isMobile && { height: 'auto', paddingVertical: 16 }]}>
            <View style={[styles.mockDonutCircle, isMobile && { marginVertical: 12 }]}>
              <Text style={styles.mockDonutInnerCoreTitleText}>{formatCurrency(dashboard.totalRevenue)}</Text>
            </View>
            {/* Legend Indicators - Now using real data */}
            <View style={[styles.donutAbsoluteLabelLeft, isMobile && { position: 'relative', left: 0, top: 0, alignSelf: 'flex-start', marginBottom: 8 }]}>
              <Text style={styles.sourceLabelSubText}>Marketplace</Text>
              <Text style={[styles.sourceLabelBoldValueText, { color: '#EF4444' }]}>
                {formatCurrency(marketplaceRevenue)} {((marketplaceRevenue / dashboard.totalRevenue) * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={[styles.donutAbsoluteLabelRight, isMobile && { position: 'relative', right: 0, top: 0, alignSelf: 'flex-start' }]}>
              <Text style={styles.sourceLabelSubText}>Bookings</Text>
              <Text style={[styles.sourceLabelBoldValueText, { color: '#6366F1' }]}>
                {formatCurrency(bookingsRevenue)} {((bookingsRevenue / dashboard.totalRevenue) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
          {/* Sub-Averages Badge row footer */}
          <View style={[styles.donutFooterBadgesRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.miniFooterBadgeBox, { backgroundColor: '#FEF2F2' }, isMobile && { width: '100%', marginBottom: 8 }]}>
              <Text style={[styles.miniBadgeLabel, { color: '#EF4444' }]}>Avg Revenue Per Order</Text>
              <Text style={styles.miniBadgeValue}>{formatCurrency(marketplaceRevenue / Math.max(1, dashboard.totalBookings * 0.4))}</Text>
            </View>
            <View style={[styles.miniFooterBadgeBox, { backgroundColor: '#EFF6FF' }, isMobile && { width: '100%' }]}>
              <Text style={[styles.miniBadgeLabel, { color: '#2563EB' }]}>Avg Revenue Per Booking</Text>
              <Text style={styles.miniBadgeValue}>{formatCurrency(dashboard.avgRevenuePerBooking)}</Text>
            </View>
          </View>
        </View>

        {/* Right Card: Distribution of Gross Items & Insight Badge */}
        <View style={[styles.cardContainer, { flex: 1 }, isMobile && { marginBottom: 16 }]}>
          <View style={styles.cardHeadingRow}>
            <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.cardSectionHeadingTitle}>Distribution of Revenue</Text>
          </View>
          <View style={[{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            {/* Mock Ring Circle */}
            <View style={[styles.multiColoredCircleMock, isMobile && { alignSelf: 'center', marginBottom: 16 }]} />
            {/* Vertical Legend List Column - Using Real Commission Data */}
            <View style={[isMobile ? { marginLeft: 0 } : { marginLeft: 20 }, { flex: 1 }]}>
              {[
                {
                  name: 'Net Income',
                  value: dashboard.totalRevenue - dashboard.totalCommission,
                  dot: '#3B82F6'
                },
                {
                  name: 'Platform Commission',
                  value: dashboard.totalCommission,
                  dot: '#EF4444'
                },
                {
                  name: 'Vendor Share',
                  value: dashboard.byVendor['vendor_001'] || 0,
                  dot: '#10B981'
                },
              ].map((element, idx) => {
                const percentage = dashboard.totalRevenue > 0
                  ? ((element.value / dashboard.totalRevenue) * 100).toFixed(1)
                  : '0.0';
                return (
                  <View key={idx} style={styles.legendRowItem}>
                    <View style={[styles.legendIndicatorDot, { backgroundColor: element.dot }]} />
                    <Text style={styles.legendTextLabel}>
                      {element.name} <Text style={{ color: '#9CA3AF' }}>{percentage}%</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          {/* Growth Margin Callouts Footer Box */}
          <View style={[styles.insightsRowWrapper, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.growthBadgeCalloutBox, isMobile && { width: '100%', marginBottom: 12 }]}>
              <Text style={styles.growthArrowMarkerIcon}>{dashboard.growthPercent >= 0 ? '↗' : '↘'}</Text>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.growthLabelMiniText}>REVENUE GROWTH</Text>
                <Text style={styles.growthValueBoldText}>{dashboard.growthPercent >= 0 ? '+' : ''}{dashboard.growthPercent.toFixed(1)}%</Text>
              </View>
            </View>
            <View style={[styles.efficiencyInsightMessageBox, isMobile && { width: '100%' }]}>
              <Text style={styles.efficiencyInsightIcon}>📈</Text>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.efficiencyHeadingText}>Revenue Insight</Text>
                <Text style={styles.efficiencyMessageBodyText}>
                  Total revenue of <Text style={{ fontWeight: '700' }}>{formatCurrency(dashboard.totalRevenue)}</Text> from {dashboard.totalBookings} bookings with {dashboard.growthPercent.toFixed(1)}% growth.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Services Distribution Horizontals Stack Card */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Distribution of Revenue as per Service category</Text>
        </View>
        <View style={{ marginTop: 12 }}>
          {serviceChart && dashboard.byService && Object.entries(dashboard.byService).map(([service, revenue], idx) => {
            const maxRevenue = Math.max(...Object.values(dashboard.byService));
            const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
            return (
              <View key={idx} style={styles.srvItemRow}>
                <Text style={styles.srvLabelCellText}>{service}</Text>
                <View style={styles.srvTrackBackground}>
                  <View style={[styles.srvFillProgress, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.srvCountCellText}>{formatCurrency(revenue)}</Text>
              </View>
            );
          })}
          {(!dashboard.byService || Object.keys(dashboard.byService).length === 0) && (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>No service data available</Text>
          )}
        </View>
      </View>

      {/* State Distribution */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <RevenueIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Revenue by State</Text>
        </View>
        <View style={{ marginTop: 12 }}>
          {dashboard.byState && Object.entries(dashboard.byState)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([state, revenue], idx) => {
              const maxRevenue = Math.max(...Object.values(dashboard.byState));
              const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
              return (
                <View key={idx} style={styles.srvItemRow}>
                  <Text style={styles.srvLabelCellText}>{state}</Text>
                  <View style={styles.srvTrackBackground}>
                    <View style={[styles.srvFillProgress, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.srvCountCellText}>{formatCurrency(revenue)}</Text>
                </View>
              );
            })}
          {(!dashboard.byState || Object.keys(dashboard.byState).length === 0) && (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>No state data available</Text>
          )}
        </View>
      </View>

      {/* Bookings Summary */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeadingRow}>
          <CalendarIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
          <Text style={styles.cardSectionHeadingTitle}>Booking Statistics</Text>
        </View>
        <View style={[styles.statsRow, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.statItem, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.statLabel}>Total Bookings</Text>
            <Text style={styles.statValue}>{dashboard.totalBookings}</Text>
          </View>
          <View style={[styles.statItem, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.statLabel}>Paid Bookings</Text>
            <Text style={styles.statValue}>{dashboard.paidBookings}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Platform Commission</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboard.totalCommission)}</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  timelineBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chipsLeftGroup: {
    flexDirection: 'row',
  },
  timelineChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginRight: 8,
  },
  timelineChipActive: {
    backgroundColor: '#3B82F6',
  },
  timelineChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  timelineChipTextActive: {
    color: '#FFFFFF',
  },
  chipsRightGroup: {
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
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    marginRight: 12,
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
  growthIndicatorCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  growthLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  growthValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  growthPositive: {
    color: '#10B981',
  },
  growthNegative: {
    color: '#EF4444',
  },
  growthSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 20,
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardSectionHeadingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  chartMockAreaBlock: {
    height: 180,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartAreaLabelPlaceholder: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  flexGridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  donutChartWrapperCenter: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  mockDonutCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
    borderColor: '#6366F1',
    borderLeftColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockDonutInnerCoreTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  donutAbsoluteLabelLeft: {
    position: 'absolute',
    left: 20,
    top: '40%',
  },
  donutAbsoluteLabelRight: {
    position: 'absolute',
    right: 20,
    top: '40%',
  },
  sourceLabelSubText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sourceLabelBoldValueText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  donutFooterBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  miniFooterBadgeBox: {
    width: '49%',
    padding: 10,
    borderRadius: 8,
  },
  miniBadgeLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  miniBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  multiColoredCircleMock: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 20,
    borderColor: '#3B82F6',
    borderTopColor: '#EF4444',
    borderRightColor: '#10B981',
    borderBottomColor: '#F59E0B',
  },
  legendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendTextLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  insightsRowWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  growthBadgeCalloutBox: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthArrowMarkerIcon: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
  growthLabelMiniText: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  growthValueBoldText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  efficiencyInsightMessageBox: {
    width: '65%',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  efficiencyInsightIcon: {
    fontSize: 14,
  },
  efficiencyHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  efficiencyMessageBodyText: {
    fontSize: 10,
    color: '#1E40AF',
    marginTop: 2,
    lineHeight: 14,
  },
  srvItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  srvLabelCellText: {
    width: 100,
    fontSize: 12,
    color: '#4B5563',
  },
  srvTrackBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  srvFillProgress: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  srvCountCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    width: 80,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  titleIconPadding: {
    marginRight: 8,
    alignSelf: 'center',
  },
});
