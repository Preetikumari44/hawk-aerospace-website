// src/screens/SalesAggregatorDashboard/index.js
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import MetricCard from '../../components/MetricCard';
import PromotionCard from '../../components/PromotionCard';
import SupportCard from '../../components/SupportCard';
import ProductCard from '../../components/ProductCard';
import StatusChip from '../../components/StatusChip';
import { COLORS, SPACING, RADIUS, FONT, BREAKPOINTS } from '../../theme/theme';
import { salesSummary, salesPerformance } from '../../data/salesData';
import { recentBookings } from '../../data/bookingsData';
import { promotions } from '../../data/promotionsData';
import { products } from '../../data/productsData';
import { useNavigation } from '../../navigation/NavigationContext';

export default function SalesAggregatorDashboard({ onSwitchRole } = {}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINTS.desktop;
  const { navigate } = useNavigation();

  return (
    <View style={styles.root}>
      <Header onSwitchRole={onSwitchRole} />
      <View style={styles.body}>
        <Sidebar />

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          <View style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Welcome back, Sales Aggregator</Text>
              <Text style={styles.bannerSubtitle}>
                Track your sales, bookings, commissions and marketplace activity from one place.
              </Text>
            </View>
            <View style={styles.bannerStats}>
              <View style={styles.bannerStatBox}>
                <Text style={styles.bannerStatLabel}>Sales Status</Text>
                <Text style={styles.bannerStatValueGreen}>{salesSummary.status}</Text>
              </View>
              <View style={styles.bannerStatBoxSolid}>
                <Text style={styles.bannerStatLabelSolid}>This Month</Text>
                <Text style={styles.bannerStatValueSolid}>₹{salesSummary.thisMonth.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Sales Overview</Text>
          <View style={styles.metricGrid}>
            <MetricCard icon="₹" label="Total Sales" value={`₹${salesSummary.totalSales.toLocaleString('en-IN')}`} />
            <MetricCard icon="⌘" label="Total Bookings" value={salesSummary.totalBookings} />
            <MetricCard icon="●" label="Active Bookings" value={salesSummary.activeBookings} tint="#E8EEFB" />
            <MetricCard icon="◷" label="Upcoming Bookings" value={salesSummary.upcomingBookings} tint="#FFF4E5" />
            <MetricCard icon="✓" label="Completed Bookings" value={salesSummary.completedBookings} tint="#E8F6EC" />
            <MetricCard icon="₹" label="Total Commission" value={`₹${salesSummary.totalCommission.toLocaleString('en-IN')}`} />
            <MetricCard icon="⏳" label="Pending Commission" value={`₹${salesSummary.pendingCommission.toLocaleString('en-IN')}`} tint="#FFF4E5" />
            <MetricCard icon="◎" label="Customers / Leads" value={salesSummary.customers} />
          </View>

          <View style={[styles.twoCol, !isDesktop && styles.stacked]}>
            <View style={[styles.panel, isDesktop && styles.colGrow]}>
              <Text style={styles.panelTitle}>Sales Performance</Text>
              <MiniBarChart data={salesPerformance.weekly} />
              <View style={styles.perfFootRow}>
                <Text style={styles.perfFootLabel}>Weekly</Text>
                <Text style={styles.perfFootLabel}>
                  Monthly avg: {Math.round(salesPerformance.monthly.reduce((a, b) => a + b, 0) / salesPerformance.monthly.length)}
                </Text>
                <Text style={styles.perfFootLabel}>Completed: {salesPerformance.completed}</Text>
              </View>
            </View>

            <View style={[styles.panel, isDesktop && styles.colGrow]}>
              <Text style={styles.panelTitle}>Booking Summary</Text>
              <View style={styles.chipRow}>
                <SummaryChip label="Active" value={salesSummary.activeBookings} status="Active" />
                <SummaryChip label="Upcoming" value={salesSummary.upcomingBookings} status="Upcoming" />
                <SummaryChip label="Completed" value={salesSummary.completedBookings} status="Completed" />
                <SummaryChip label="Cancelled" value={salesSummary.cancelledBookings} status="Cancelled" />
              </View>
            </View>
          </View>

          <View style={[styles.twoCol, !isDesktop && styles.stacked]}>
            <View style={[styles.panel, isDesktop && styles.colGrowWide]}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Recent Bookings</Text>
                <TouchableOpacity onPress={() => navigate('Bookings')}>
                  <Text style={styles.viewAll}>View All →</Text>
                </TouchableOpacity>
              </View>
              {recentBookings.map((b) => (
                <View key={b.id} style={styles.bookingRow}>
                  <Text style={[styles.rowText, styles.rowCustomer]} numberOfLines={1}>{b.customer}</Text>
                  <Text style={[styles.rowTextMuted, styles.rowService]} numberOfLines={1}>{b.service}</Text>
                  <Text style={[styles.rowTextMuted, styles.rowDate]}>{b.date}</Text>
                  <Text style={[styles.rowText, styles.rowAmount]}>{b.amount}</Text>
                  <StatusChip status={b.status} />
                </View>
              ))}
            </View>

            <View style={[styles.panel, isDesktop && styles.colGrow]}>
              <Text style={styles.panelTitle}>Commission Summary</Text>
              <View style={styles.commissionRow}>
                <Text style={styles.rowTextMuted}>Earned</Text>
                <Text style={styles.rowText}>₹{salesSummary.earnedCommission.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.rowTextMuted}>Pending</Text>
                <Text style={styles.rowText}>₹{salesSummary.pendingCommission.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.rowTextMuted}>Total</Text>
                <Text style={[styles.rowText, { color: COLORS.primary }]}>₹{salesSummary.totalCommission.toLocaleString('en-IN')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigate('Commission')}>
                <Text style={styles.viewAll}>View Commission →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.twoCol, !isDesktop && styles.stacked]}>
            <View style={[styles.panel, isDesktop && styles.colGrowWide]}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Marketplace</Text>
                <TouchableOpacity onPress={() => navigate('Marketplace')}>
                  <Text style={styles.viewAll}>View All →</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {products.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ScrollView>
            </View>

            <View style={[styles.panel, isDesktop && styles.colGrow]}>
              <Text style={styles.panelTitle}>Promotions & Offers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {promotions.map((p) => (
                  <PromotionCard key={p.id} {...p} />
                ))}
              </ScrollView>
            </View>
          </View>

          <SupportCard compact />
        </ScrollView>
      </View>
    </View>
  );
}

function SummaryChip({ label, value, status }) {
  return (
    <View style={styles.summaryChip}>
      <StatusChip status={status} />
      <Text style={styles.summaryChipLabel}>{label}</Text>
      <Text style={styles.summaryChipValue}>{value}</Text>
    </View>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.chart}>
      {data.map((v, i) => (
        <View key={i} style={styles.chartBarWrap}>
          <View style={[styles.chartBar, { height: `${(v / max) * 100}%` }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
  mainContent: { padding: SPACING.lg, gap: SPACING.md },

  banner: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  bannerTitle: { color: COLORS.textInverse, ...FONT.h1 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.8)', ...FONT.body, marginTop: 4, maxWidth: 460 },
  bannerStats: { flexDirection: 'row', gap: SPACING.sm },
  bannerStatBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.sm, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, alignItems: 'center' },
  bannerStatLabel: { color: 'rgba(255,255,255,0.7)', ...FONT.small },
  bannerStatValueGreen: { color: '#7BE2A8', ...FONT.h3, marginTop: 2 },
  bannerStatBoxSolid: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, alignItems: 'center' },
  bannerStatLabelSolid: { color: 'rgba(255,255,255,0.85)', ...FONT.small },
  bannerStatValueSolid: { color: COLORS.textInverse, ...FONT.h3, marginTop: 2 },

  sectionTitle: { ...FONT.h2, color: COLORS.textPrimary, marginTop: SPACING.xs },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },

  twoCol: { flexDirection: 'row', gap: SPACING.md },
  stacked: { flexDirection: 'column' },
  colGrow: { flex: 1 },
  colGrowWide: { flex: 1.4 },

  panel: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.xs },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { ...FONT.h3, color: COLORS.textPrimary },
  viewAll: { ...FONT.small, color: COLORS.primary, fontWeight: '700' },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 6, marginTop: SPACING.xs },
  chartBarWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 3, minHeight: 4 },
  perfFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  perfFootLabel: { ...FONT.small, color: COLORS.textSecondary },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  summaryChip: { width: '47%', backgroundColor: COLORS.background, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 4 },
  summaryChipLabel: { ...FONT.small, color: COLORS.textSecondary },
  summaryChipValue: { ...FONT.h2, color: COLORS.textPrimary },

  bookingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowText: { ...FONT.body, color: COLORS.textPrimary },
  rowTextMuted: { ...FONT.small, color: COLORS.textSecondary },
  rowCustomer: { flex: 1.4 },
  rowService: { flex: 1 },
  rowDate: { flex: 0.8 },
  rowAmount: { flex: 0.9, fontWeight: '700' },

  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: COLORS.border },
});
