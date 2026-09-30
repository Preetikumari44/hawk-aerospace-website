import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import EarningsGraph from '../components/EarningsGraph';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { earningsOverview, earningsGraphMeta, rewards } from '../data/dashboardData';

export default function EarningsScreen() {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Manage your Earnings</Text>

      <View style={[styles.overviewRow, isMobile && styles.overviewRowMobile]}>
        <View style={isMobile ? styles.overviewCardMobile : styles.overviewCard}>
          <Text style={styles.overviewLabel}>Earnings</Text>
          <Text style={styles.overviewValue}>₹{earningsOverview.earnings}</Text>
        </View>
        <View style={[isMobile ? styles.overviewCardMobile : styles.overviewCard, { marginRight: 0 }]}>
          <Text style={styles.overviewLabel}>Pending Earnings</Text>
          <Text style={styles.overviewValue}>₹{earningsOverview.pendingEarnings}</Text>
          <Text style={styles.overviewNote}>{earningsOverview.pendingNote}</Text>
        </View>
      </View>

      <View style={[styles.row, isMobile && styles.rowMobile]}>
        <View style={isMobile ? styles.chartColMobile : styles.chartCol}>
          <EarningsGraph graph={earningsGraphMeta} />
        </View>
        <View style={isMobile ? {} : styles.sideCol}>
          <SectionHeader title="Rewards" />
          <EmptyState message={rewards.emptyMessage} icon="🏅" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  overviewRow: { flexDirection: 'row', marginBottom: spacing.lg },
  overviewRowMobile: { flexDirection: 'column' },
  overviewCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginRight: spacing.md,
  },
  overviewCardMobile: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  overviewLabel: { ...typography.caption, color: colors.textSecondary },
  overviewValue: { ...typography.statNumber, color: colors.forestGreen, marginTop: 4 },
  overviewNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  row: { flexDirection: 'row' },
  rowMobile: { flexDirection: 'column' },
  chartCol: { flex: 1.6, marginRight: spacing.lg },
  chartColMobile: { marginBottom: spacing.lg },
  sideCol: { flex: 1 },
});
