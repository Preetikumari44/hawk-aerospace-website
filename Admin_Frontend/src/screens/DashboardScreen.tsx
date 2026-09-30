import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, Modal, Alert } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Line, Text as SvgText, Path, G, Circle } from 'react-native-svg';

import { useAuth } from '../context/AuthContext';
import { dashboardApi, DashboardData, TimeFilter, type TimeSeriesData } from '../api/dashboard.api';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import SettingsIcon from '../assets/icons/settings.svg';
import SearchIcon from '../assets/icons/SearchIcon.svg';
import NotificationIconIdle from '../assets/icons/NotificationIconIdle.svg';
import TrendingUpIcon from '../assets/icons/TrendingUpIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';
import DroneIcon from '../assets/icons/DroneIcon.svg';
import VectorIcon from '../assets/icons/Vector.svg';// newly added icon
import PilotIcon from '../assets/icons/PilotIcon.svg';
import TechnicianIcon from '../assets/icons/technician-icon.svg';
import IncidentIcon from '../assets/icons/incident-icon.svg'; 

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('month');
  const [error, setError] = useState<string | null>(null);

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    console.log('🔴 handleLogout CALLED - showing confirmation dialog');
    
    // Use Alert for cross-platform compatibility
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        console.log('🔴 User confirmed logout - starting logout process');
        setShowUserMenu(false);
        console.log('🔴 Menu closed, calling logout()...');
        
        (async () => {
          try {
            console.log('🔴 BEFORE await logout()');
            await logout();
            console.log('✅ AFTER await logout() - User logged out successfully');
          } catch (error) {
            console.error('❌ Logout error caught:', error);
          }
          console.log('🔴 handleLogout completed');
        })();
      } else {
        console.log('🔴 User cancelled logout');
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            onPress: () => console.log('🔴 User cancelled logout'),
            style: 'cancel'
          },
          {
            text: 'Logout',
            onPress: async () => {
              console.log('🔴 User confirmed logout - starting logout process');
              setShowUserMenu(false);
              console.log('🔴 Menu closed, calling logout()...');
              
              try {
                console.log('🔴 BEFORE await logout()');
                await logout();
                console.log('✅ AFTER await logout() - User logged out successfully');
              } catch (error) {
                console.error('❌ Logout error caught:', error);
              }
              console.log('🔴 handleLogout completed');
            },
            style: 'destructive'
          }
        ]
      );
    }
  };

  const handleActionMenuOption = async (action: string) => {
    setActionMenuVisible(false);
    
    switch (action) {
      case 'refresh':
        // Refresh dashboard data
        await fetchDashboardData();
        break;
      case 'export':
        // Export dashboard data
        console.log('Export dashboard data', dashboardData);
        // TODO: Implement export functionality
        break;
      case 'settings':
        // Open dashboard settings
        console.log('Open dashboard settings');
        // TODO: Navigate to settings screen
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardApi.getDashboard({ timeFilter: selectedFilter });
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: TimeFilter) => {
    setSelectedFilter(filter);
  };

  const formatNumber = (num: number | undefined): string => {
    if (!num || typeof num !== 'number') return '0';
    if (num >= 100000) return `${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (!amount || typeof amount !== 'number') return '₹0';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const displayName = user?.displayName || user?.email || 'User';
  const userRole = user?.role || 'User';
  const initials = getInitials(displayName);

  if (loading && !dashboardData) {
    return (
      <View style={[styles.mainWrapper, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && !dashboardData) {
    return (
      <View style={[styles.mainWrapper, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <View style={[styles.topHeader, isMobile && styles.topHeaderMobile]}>
        <View style={isMobile && { flex: 1 }}>
          <Text style={[styles.headerTitle, isMobile && { fontSize: 16 }]}>Dashboard Overview</Text>
          {!isMobile && <Text style={styles.headerSubtitle}>Welcome Back . Here's an overview of your platform</Text>}
        </View>

        <View style={styles.headerRightControls}>
          {/* Search bar — hidden on mobile */}
          {!isMobile && (
            <View style={styles.searchBarContainer}>
              <TextInput 
                style={styles.searchInput} 
                placeholder="Hinted search text" 
                placeholderTextColor="#9CA3AF"
              />
              <SearchIcon width={18} height={18} fill="#9CA3AF" />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => console.log('Notification clicked')}
          >
            <NotificationIconIdle width={20} height={20} fill="#4B5563" />
          </TouchableOpacity>
          
          {!isMobile && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => console.log('Settings clicked')}
            >
              <SettingsIcon width={20} height={20} fill="#4B5563" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.profileBadge}
            onPress={() => setShowUserMenu(!showUserMenu)}
          >
            <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initials}</Text></View>
            {!isMobile && (
              <View style={styles.profileMeta}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.profileRole}>{userRole}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. TIMELINE FILTER CHIPS BAR */}
      <View style={styles.filterChipsContainer}>
        {/* Chips scroll takes all available space, icon is fixed to the right */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.leftChipsGroup, isMobile && { gap: 4 }]}
        >
          {[
            { label: 'This Year', value: 'year' as TimeFilter },
            { label: 'Quarter', value: 'quarter' as TimeFilter },
            { label: 'This Month', value: 'month' as TimeFilter },
            { label: 'This Week', value: 'week' as TimeFilter },
            { label: 'Today', value: 'day' as TimeFilter },
          ].map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.chip,
                selectedFilter === value && styles.chipActive,
                isMobile && styles.chipMobile,
              ]}
              onPress={() => handleFilterChange(value)}
            >
              <Text style={[
                styles.chipText,
                selectedFilter === value && styles.chipTextActive,
                isMobile && styles.chipTextMobile,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter icon — decorative only, not clickable */}
        <View style={styles.filterIconBtn}>
          <VectorIcon width={18} height={18} fill="#4B5563" />
        </View>
      </View>

      {/* Action Menu Modal — bottom sheet on mobile, centered card on desktop */}
      <Modal
        transparent={true}
        visible={actionMenuVisible}
        animationType={isMobile ? 'slide' : 'fade'}
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlayBackground,
            isMobile && { justifyContent: 'flex-end' },
          ]}
          activeOpacity={1}
          onPress={() => setActionMenuVisible(false)}
        >
          {/* Stop inner card from closing the modal when tapped */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { /* prevent bubble */ }}
            style={[
              styles.filterMenuDropdownCard,
              isMobile && styles.filterMenuBottomSheet,
            ]}
          >
            {/* Handle bar on mobile */}
            {isMobile && (
              <View style={styles.bottomSheetHandle} />
            )}

            <Text style={styles.actionSheetTitle}>Dashboard Actions</Text>

            <TouchableOpacity
              style={styles.actionMenuItemRow}
              onPress={() => handleActionMenuOption('refresh')}
            >
              <Text style={styles.actionMenuItemIcon}>🔄</Text>
              <Text style={styles.actionMenuItemText}>Refresh Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItemRow}
              onPress={() => handleActionMenuOption('export')}
            >
              <Text style={styles.actionMenuItemIcon}>📤</Text>
              <Text style={styles.actionMenuItemText}>Export Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionMenuItemRow, { borderBottomWidth: 0 }]}
              onPress={() => handleActionMenuOption('settings')}
            >
              <Text style={styles.actionMenuItemIcon}>⚙️</Text>
              <Text style={styles.actionMenuItemText}>Dashboard Settings</Text>
            </TouchableOpacity>

            {isMobile && (
              <TouchableOpacity
                style={styles.bottomSheetCancelBtn}
                onPress={() => setActionMenuVisible(false)}
              >
                <Text style={styles.bottomSheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollContainerPadding, isMobile && { padding: 12, paddingBottom: 32 }]}>
        {/* 3. CORE ANALYTICS METRIC GRADIENT CARDS */}
        {isMobile ? (
          /* ── Mobile: compact 2×2 wrap grid, same gradients ── */
          <View style={styles.mobileMetricsGrid}>
            <View style={[styles.mobileMetricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.mobileMetricLabel}>Active Bookings</Text>
              <Text style={styles.mobileMetricValue}>{formatNumber(dashboardData?.metrics.totalActiveBookings)}</Text>
              {dashboardData && dashboardData.metrics.bookingsGrowth !== 0 && (
                <Text style={styles.mobileMetricGrowth}>
                  {dashboardData.metrics.bookingsGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardData.metrics.bookingsGrowth).toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={[styles.mobileMetricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.mobileMetricLabel}>Upcoming</Text>
              <Text style={styles.mobileMetricValue}>{formatNumber(dashboardData?.metrics.totalUpcomingBookings)}</Text>
            </View>
            <View style={[styles.mobileMetricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.mobileMetricLabel}>Completed</Text>
              <Text style={styles.mobileMetricValue}>{formatNumber(dashboardData?.metrics.totalCompletedBookings)}</Text>
            </View>
            <View style={[styles.mobileMetricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.mobileMetricLabel}>Total Revenue</Text>
              <Text style={styles.mobileMetricValue}>{formatCurrency(dashboardData?.metrics.totalRevenue)}</Text>
              {dashboardData && dashboardData.metrics.revenueGrowth !== 0 && (
                <Text style={styles.mobileMetricGrowth}>
                  {dashboardData.metrics.revenueGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardData.metrics.revenueGrowth).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        ) : (
          /* ── Desktop: gradient-style cards row ── */
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.metricLabelText}>Total Active Bookings</Text>
              <Text style={styles.metricValueText}>{formatNumber(dashboardData?.metrics.totalActiveBookings)}</Text>
              {dashboardData && dashboardData.metrics.bookingsGrowth !== 0 && (
                <Text style={styles.metricGrowthText}>
                  {dashboardData.metrics.bookingsGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardData.metrics.bookingsGrowth).toFixed(1)}%
                </Text>
              )}
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.metricLabelText}>Total Completed</Text>
              <Text style={styles.metricValueText}>{formatNumber(dashboardData?.metrics.totalCompletedBookings)}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.metricLabelText}>Upcoming Bookings</Text>
              <Text style={styles.metricValueText}>{formatNumber(dashboardData?.metrics.totalUpcomingBookings)}</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#1a3a9e' }]}>
              <Text style={styles.metricLabelText}>Total Revenue</Text>
              <Text style={styles.metricValueText}>{formatCurrency(dashboardData?.metrics.totalRevenue)}</Text>
              {dashboardData && dashboardData.metrics.revenueGrowth !== 0 && (
                <Text style={styles.metricGrowthText}>
                  {dashboardData.metrics.revenueGrowth > 0 ? '↗' : '↘'} {Math.abs(dashboardData.metrics.revenueGrowth).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        )}


        {/* 4. REVENUE LINE CHART & CATEGORY USER BAR CHART ROW */}
        <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column' }]}>
          {/* Revenue Spline Block */}
          <View style={[styles.cardContainer, { flex: 1 }, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 16 }]}>
            <View style={styles.titleWithIconRow}>
              <DroneIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
              <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Total Revenue in Lakhs</Text>
            </View>
            {dashboardData?.revenueTimeSeries && dashboardData.revenueTimeSeries.length > 0 ? (
              <RevenueTimeSeriesChart data={dashboardData.revenueTimeSeries} />
            ) : (
              <View style={styles.mockChartArea}>
                <Text style={styles.mockChartPlaceholderText}>No revenue data available</Text>
              </View>
            )}
          </View>

          {/* User Category Horizontal Bars Block */}
          <View style={[styles.cardContainer, { flex: 1 }]}>
            <View style={styles.titleWithIconRow}>
              <PersonIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
              <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Users per Category</Text>
            </View>
            <View style={styles.barChartContainer}>
              {dashboardData && [
                { label: 'Customers', value: dashboardData.userCategoryMetrics.customers },
                { label: 'Drone Pilots', value: dashboardData.userCategoryMetrics.pilots },
                { label: 'Fleet Managers', value: dashboardData.userCategoryMetrics.fleetManagers },
                { label: 'Technicians', value: dashboardData.userCategoryMetrics.technicians },
                { label: 'Sales Aggregators', value: dashboardData.userCategoryMetrics.salesAggregators },
                { label: 'Marketplace Vendors', value: dashboardData.userCategoryMetrics.marketplaceVendors },
              ].map((item, idx) => {
                const maxValue = Math.max(
                  dashboardData.userCategoryMetrics.customers,
                  dashboardData.userCategoryMetrics.pilots,
                  dashboardData.userCategoryMetrics.fleetManagers,
                  dashboardData.userCategoryMetrics.technicians,
                  dashboardData.userCategoryMetrics.salesAggregators,
                  dashboardData.userCategoryMetrics.marketplaceVendors,
                );
                const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                return (
                  <View key={idx} style={styles.barChartItemRow}>
                    <Text style={[styles.barChartLabelText, isMobile && { fontSize: 11, width: 90 }]}>{item.label}</Text>
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.serviceValueText}>{item.value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 5. USER DENSITY WAVE GRAPH SECTION */}
        <View style={styles.cardContainer}>
          <View style={styles.titleWithIconRow}>
            <TrendingUpIcon width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Users per Category over Time</Text>
          </View>
          {dashboardData?.timeSeriesData && dashboardData.timeSeriesData.length > 0 ? (
            isMobile ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ width: 700 }}>
                  <UserDensityTimeSeriesChart data={dashboardData.timeSeriesData} />
                </View>
              </ScrollView>
            ) : (
              <UserDensityTimeSeriesChart data={dashboardData.timeSeriesData} />
            )
          ) : (
            <View style={[styles.mockChartArea, { height: 200 }]}>
              <Text style={styles.mockChartPlaceholderText}>No user density timeline data available</Text>
            </View>
          )}
        </View>

        {/* 6. INDIA DISTRIBUTION GEOGRAPHIC AREA & MAP SIDEBAR */}
        <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column' }]}>
          {/* Left: Map Box Graphic */}
          <View style={[styles.cardContainer, { flex: 1.5 }, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 16 }]}>
            <View style={styles.titleWithIconRow}>
              <DroneIcon width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} fill="#374151" style={styles.titleIconPadding} />
              <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Distribution of Bookings Count Over Nation</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <TouchableOpacity style={styles.activeMapSubChip}><Text style={styles.activeMapSubChipText}>Bookings</Text></TouchableOpacity>
              <TouchableOpacity style={styles.inactiveMapSubChip}><Text style={styles.inactiveMapSubChipText}>Completed</Text></TouchableOpacity>
              <TouchableOpacity style={styles.inactiveMapSubChip}><Text style={styles.inactiveMapSubChipText}>Revenue</Text></TouchableOpacity>
              <TouchableOpacity style={styles.inactiveMapSubChip}><Text style={styles.inactiveMapSubChipText}>Tickets</Text></TouchableOpacity>
            </ScrollView>

            <View style={[styles.indiaMapGraphicsArea, isMobile && { height: 220 }]}>
              <Text style={styles.mapCoreGraphicText}>[ India Geopolitical Map Overlay Engine Active ]</Text>
              
              {/* Floating Tooltip matching Rajasthan anchor */}
              <View style={styles.mapTooltipFloating}>
                <Text style={styles.tooltipTitle}>📍 Rajasthan</Text>
                <Text style={styles.tooltipValue}>4,631 bookings</Text>
                <Text style={styles.tooltipSub}>↗ 12% vs last month</Text>
              </View>
            </View>
          </View>

          {/* Right: State Density Table Progress Side Panel */}
          <View style={[styles.cardContainer, { flex: 1 }]}>
            <Text style={styles.cardHeadingTitle}>Bookings by State</Text>
            <ScrollView style={styles.stateScrollContainer} nestedScrollEnabled>
              {dashboardData && dashboardData.stateDistribution.slice(0, 10).map((item, index) => {
                const maxCount = dashboardData.stateDistribution[0]?.count || 1;
                const percentage = (item.count / maxCount) * 100;
                return (
                  <View key={index} style={styles.stateProgressRow}>
                    <Text style={styles.stateNameLabel}>{item.state}</Text>
                    <View style={styles.stateBarTrack}>
                      <View style={[styles.stateBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.stateCountValue}>{item.count}</Text>
                  </View>
                );
              })}
              {(!dashboardData || dashboardData.stateDistribution.length === 0) && (
                <Text style={styles.emptyStateText}>No data available</Text>
              )}
            </ScrollView>
          </View>
        </View>

        {/* 7. BOOKINGS SERVICE CATEGORY ROW */}
        <View style={styles.cardContainer}>
          <View style={styles.titleWithIconRow}>
            <PersonIcon width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Distribution of Bookings as per Service category</Text>
          </View>
          <View style={styles.barChartContainer}>
            {dashboardData && dashboardData.serviceDistribution.map((item, idx) => {
              const maxCount = dashboardData.serviceDistribution[0]?.count || 1;
              const percentage = (item.count / maxCount) * 100;
              return (
                <View key={idx} style={styles.barChartItemRow}>
                  <Text style={[styles.barChartLabelText, isMobile && { fontSize: 11, width: 90 }]}>{item.service}</Text>
                  <View style={styles.progressBarWrapper}>
                    <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.serviceValueText}>{item.count}</Text>
                </View>
              );
            })}
            {(!dashboardData || dashboardData.serviceDistribution.length === 0) && (
              <Text style={styles.emptyStateText}>No service data available</Text>
            )}
          </View>
        </View>

        {/* 8. MARKETPLACE SUB-SECTION OVERVIEW BLOCK */}
        <Text style={[styles.subSectionSeparatorTitle, isMobile && { fontSize: 13, marginBottom: 8 }]}>Marketplace Stats</Text>
        <View style={[styles.flexGridRow, isMobile && { flexDirection: 'column' }]}>
          {/* Active + Completed mini-cards — side by side on mobile */}
          <View style={[{ flex: 1, justifyContent: 'space-between' }, isMobile ? { marginRight: 0, marginBottom: 12, flexDirection: 'row' } : { marginRight: 16 }]}>
            <View
              style={[styles.metricCard, { backgroundColor: '#1E3A8A' }, isMobile && { flex: 1, minHeight: 80, padding: 14, marginBottom: 0, marginRight: 10 }]}
            >
              <Text style={[styles.metricLabelText, isMobile && { fontSize: 10 }]}>Active Orders</Text>
              <Text style={[styles.metricValueText, isMobile && { fontSize: 22, marginTop: 4 }]}>
                {formatNumber(dashboardData?.marketplaceMetrics.totalActiveOrders)}
              </Text>
            </View>
            <View
              style={[styles.metricCard, { backgroundColor: '#1D4ED8' }, isMobile && { flex: 1, minHeight: 80, padding: 14, marginBottom: 0 }]}
            >
              <Text style={[styles.metricLabelText, isMobile && { fontSize: 10 }]}>Completed Orders</Text>
              <Text style={[styles.metricValueText, isMobile && { fontSize: 22, marginTop: 4 }]}>
                {formatNumber(dashboardData?.marketplaceMetrics.totalCompletedOrders)}
              </Text>
            </View>
          </View>

          <View style={[styles.cardContainer, { flex: 2 }]}>
            <View style={styles.titleWithIconRow}>
              <DroneIcon width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} fill="#374151" style={styles.titleIconPadding} />
              <Text style={[styles.cardHeadingTitle, isMobile && { fontSize: 13 }]}>Total Marketplace Revenue</Text>
            </View>
            <View style={[styles.mockChartArea, { height: 130 }]}>
              <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>
                {formatCurrency(dashboardData?.marketplaceMetrics.totalRevenue)}
              </Text>
              {dashboardData && dashboardData.marketplaceMetrics.revenueGrowth !== 0 && (
                <Text style={styles.growthIndicatorText}>
                  {dashboardData.marketplaceMetrics.revenueGrowth > 0 ? '↗' : '↘'}{' '}
                  {Math.abs(dashboardData.marketplaceMetrics.revenueGrowth).toFixed(1)}% vs previous period
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 9. TASKS TO DO GRID BLOCK SECTION */}
        <Text style={styles.subSectionSeparatorTitle}>Tasks To Do</Text>
        <View style={styles.todoGridFooterRow}>
          {dashboardData && [
            { 
              title: 'Fleet Manager Approvals', 
              val: dashboardData.taskMetrics.pendingFleetManagerApprovals, 
              IconComponent: DroneIcon 
            },
            { 
              title: 'Pilot Approvals', 
              val: dashboardData.taskMetrics.pendingPilotApprovals, 
              IconComponent: PilotIcon 
            },
            { 
              title: 'Technician Approvals', 
              val: dashboardData.taskMetrics.pendingTechnicianApprovals, 
              IconComponent: TechnicianIcon 
            },
            { 
              title: 'Open Complaint Tickets', 
              val: dashboardData.taskMetrics.totalOpenComplaintTickets, 
              IconComponent: IncidentIcon 
            }
          ].map((task, idx) => {
            const IconComp = task.IconComponent;
            return (
              <View key={idx} style={styles.todoItemBoxCard}>
                <View style={styles.todoIconWrapper}>
                  <IconComp width={24} height={24} fill="#3B82F6" />
                </View>
                <View style={styles.todoTextWrap}>
                  <Text style={styles.todoCardLabel} numberOfLines={2}>{task.title}</Text>
                  <Text style={styles.todoCardValue}>{task.val}</Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* User Dropdown Menu - Positioned at root level to avoid overflow issues */}
      {showUserMenu && (
        <View style={[styles.userDropdownMenuOverlay, isMobile && { right: 8, top: 60, minWidth: 200 }]}>
          <View style={styles.userDropdownHeader}>
            <Text style={styles.userDropdownName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.userDropdownEmail} numberOfLines={1}>{user?.email || ''}</Text>
            <Text style={styles.userDropdownRole}>{userRole}</Text>
          </View>
          <View style={styles.userDropdownDivider} />
          <TouchableOpacity 
            style={styles.userDropdownItem}
            onPress={() => {
              console.log('🔴 LOGOUT BUTTON CLICKED!');
              handleLogout();
            }}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.userDropdownItemText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    overflow: 'visible' as any,
  },
  topHeader: {
    height: 70,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    overflow: 'visible' as any,
  },
  topHeaderMobile: {
    height: 56,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible' as any,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    width: 220,
    height: 36,
    marginRight: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  searchIcon: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  controlIconText: {
    fontSize: 14,
  },
  profileBadgeContainer: {
    position: 'relative',
    marginLeft: 8,
    overflow: 'visible' as any,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  profileMeta: {
    marginLeft: 10,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  profileRole: {
    fontSize: 10,
    color: '#6B7280',
  },
  userDropdownMenu: {
    position: 'absolute' as any,
    top: 48,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 10,
    minWidth: 220,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userDropdownMenuOverlay: {
    position: 'absolute' as any,
    top: 70,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 10,
    minWidth: 220,
    zIndex: 9999,
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
  filterChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  leftChipsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  rightChipsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginRight: 4,
  },
  chipMobile: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 2,
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextMobile: {
    fontSize: 10,
  },
  arrowIcon: {
    fontSize: 8,
    marginLeft: 6,
    color: '#6B7280',
  },
  filterIconBtn: {
    marginLeft: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainerPadding: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    marginBottom: 20,
    gap: 10,
  },
  metricsRowMobile: {
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    minHeight: 144,
    justifyContent: 'center',
    minWidth: 130,
  },
  metricCardMobile: {
    flexBasis: '47%',
    flex: 0,
    padding: 14,
    borderRadius: 10,
    minWidth: 0,
  },

  // ── Mobile compact 2×2 metric grid ──────────────────────────
  mobileMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 16,
  },
  mobileMetricCard: {
    flexBasis: '47%',
    flex: 1,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'flex-start',
    minHeight: 90,
  },
  mobileMetricLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.85,
    fontWeight: '500',
    marginBottom: 6,
  },
  mobileMetricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  mobileMetricGrowth: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  metricLabelText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  metricValueText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  flexGridRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleIconPadding: {
    marginRight: 8,
    alignSelf: 'center',
  },
  cardHeadingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  mockChartArea: {
    height: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockChartPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  barChartContainer: {
    justifyContent: 'center',
  },
  barChartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barChartLabelText: {
    width: 110,
    fontSize: 12,
    color: '#4B5563',
  },
  progressBarWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  serviceValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    width: 30,
    textAlign: 'right',
  },
  mapSubFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activeMapSubChip: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  activeMapSubChipText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  inactiveMapSubChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  inactiveMapSubChipText: {
    fontSize: 11,
    color: '#6B7280',
  },
  indiaMapGraphicsArea: {
    height: 320,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapCoreGraphicText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  mapTooltipFloating: {
    position: 'absolute',
    top: '35%',
    left: '32%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  tooltipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  tooltipValue: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  tooltipSub: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  stateScrollContainer: {
    maxHeight: 350,
  },
  stateProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stateNameLabel: {
    width: 100,
    fontSize: 12,
    color: '#374151',
  },
  stateBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  stateBarFill: {
    height: '100%',
    backgroundColor: '#1E3A8A',
  },
  stateCountValue: {
    width: 30,
    fontSize: 12,
    color: '#111827',
    textAlign: 'right',
    fontWeight: '500',
  },
  subSectionSeparatorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 14,
  },
  todoGridFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  todoItemBoxCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  todoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoIconPrefix: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  todoTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  todoCardLabel: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  todoCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
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
  chipActive: {
    backgroundColor: '#3B82F6',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  metricGrowthText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  growthIndicatorText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
    fontSize: 12,
  },
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterMenuDropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 220,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
    elevation: 12,
  },
  filterMenuBottomSheet: {
    width: '100%',
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    minWidth: undefined,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionMenuItemIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  actionMenuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  bottomSheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  bottomSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});

function RevenueTimeSeriesChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const W = 500;
  const H = 180;
  const PAD = { top: 15, right: 20, bottom: 35, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const revenues = data.map((d) => d.revenue);
  const maxVal = Math.max(...revenues, 1);
  const roundedMax = Math.max(10, Math.ceil(maxVal / 10) * 10);
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => Math.round(roundedMax * t));

  const xStep = chartW / Math.max(data.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / roundedMax) * chartH;

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.revenue) }));

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
          <SvgLinearGradient id="dashboardRevGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </SvgLinearGradient>
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

        {areaPath && (
          <Path d={areaPath} fill="url(#dashboardRevGradient)" />
        )}

        {linePath && (
          <Path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {points.map((pt, i) => (
          <G key={i}>
            <Circle
              cx={pt.x} cy={pt.y} r="4"
              fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5"
            />
          </G>
        ))}

        {data.map((d, i) => (
          <SvgText key={i} x={toX(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="500">
            {formatLabel(d.date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function UserDensityTimeSeriesChart({ data }: { data: TimeSeriesData[] }) {
  const W = 800;
  const H = 200;
  const PAD = { top: 20, right: 30, bottom: 45, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Calculate totals and find maximum value across all categories and totals
  const timeSeriesWithTotals = data.map((d) => {
    const total = d.customers + d.pilots + d.fleetManagers + d.technicians + d.salesAggregators + d.marketplaceVendors;
    return { ...d, total };
  });

  const allValues = timeSeriesWithTotals.flatMap((d) => [
    d.total,
    d.customers,
    d.pilots,
    d.fleetManagers,
    d.technicians,
    d.salesAggregators,
    d.marketplaceVendors
  ]);

  const maxVal = Math.max(...allValues, 1);
  const roundedMax = Math.max(50, Math.ceil(maxVal / 50) * 50);
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => Math.round(roundedMax * t));

  const xStep = chartW / Math.max(data.length - 1, 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / roundedMax) * chartH;

  const categories = [
    { key: 'total', name: 'Total Users', color: '#8B5CF6', isBold: true },
    { key: 'customers', name: 'Customers', color: '#A78BFA', isBold: false },
    { key: 'pilots', name: 'Drone Pilots', color: '#F87171', isBold: false },
    { key: 'fleetManagers', name: 'Fleet Managers', color: '#06B6D4', isBold: false },
    { key: 'technicians', name: 'Technicians', color: '#F59E0B', isBold: false },
    { key: 'salesAggregators', name: 'Sales Aggregators', color: '#2563EB', isBold: false },
    { key: 'marketplaceVendors', name: 'Marketplace Vendors', color: '#10B981', isBold: false },
  ];

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

  const formatLabel = (lbl: string) => {
    const parts = lbl.split('-');
    if (parts.length < 2) return lbl;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return months[monthIdx] || parts[1];
  };

  return (
    <View style={{ width: '100%', alignItems: 'center', padding: 8 }}>
      <View style={{ width: '100%', height: H, overflow: 'hidden' }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
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

          {/* Draw lines for each category */}
          {categories.map((cat) => {
            const pts = timeSeriesWithTotals.map((d, i) => ({
              x: toX(i),
              y: toY((d as any)[cat.key] || 0)
            }));
            const linePath = getBezierPath(pts);

            return (
              <G key={cat.key}>
                {linePath && (
                  <Path
                    d={linePath}
                    fill="none"
                    stroke={cat.color}
                    strokeWidth={cat.isBold ? 2.5 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Dots on points */}
                {pts.map((pt, i) => (
                  <Circle
                    key={i}
                    cx={pt.x} cy={pt.y} r={cat.isBold ? 3.5 : 2.5}
                    fill="#FFFFFF" stroke={cat.color} strokeWidth={cat.isBold ? 2 : 1.5}
                  />
                ))}
              </G>
            );
          })}

          {/* X-axis Labels */}
          {data.map((d, i) => (
            <SvgText key={i} x={toX(i)} y={H - 12} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="500">
              {formatLabel(d.date)}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Legends */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, gap: 12 }}>
        {categories.map((cat) => (
          <View key={cat.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: cat.color, marginRight: 6, borderRadius: 1.5 }} />
            <Text style={{ fontSize: 9, color: '#4B5563', fontWeight: '500' }}>{cat.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
