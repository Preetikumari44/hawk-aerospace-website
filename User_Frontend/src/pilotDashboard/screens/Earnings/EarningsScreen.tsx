import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { Card, Button, Badge } from '../../components/ui';
import DataState from '../../components/DataState';
import OverviewCard from '../../components/OverviewCard';
import EarningsChart from '../../components/EarningsChart';
import { useAsync } from '../../hooks/useAsync';
import { pilotService } from '../../services/pilotService';

type TimeFilter = 'Last 1 year' | 'Last month' | 'Last 3 months' | 'Last 6 months';

interface EarningsScreenProps {
  onOpenPayout: () => void;
}

const EarningsScreen: React.FC<EarningsScreenProps> = ({ onOpenPayout }) => {
  const [filter, setFilter] = useState<TimeFilter>('Last 1 year');
  const summary = useAsync(() => pilotService.getEarningsSummary(), []);
  const series = useAsync(() => pilotService.getEarningsSeries(), [filter]);
  const payoutMethods = useAsync(() => pilotService.getPayoutMethods(), []);

  return (
    <Screen>
      <Text style={styles.title}>Manage Your Earnings</Text>

      <View style={styles.overviewRow}>
        <DataState state={summary} emptyTitle="No earnings data available">
          {(data) => (
            <>
              <OverviewCard label="Total Earnings" value={`${data.currency}${data.totalEarnings.toLocaleString()}`} tone="dark" />
              <OverviewCard label="Pending Earnings" value={`${data.currency}${data.pendingEarnings.toLocaleString()}`} />
            </>
          )}
        </DataState>
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Earnings Graph</Text>
          <View style={styles.filterRow}>
            {(['Last month', 'Last 3 months', 'Last 6 months', 'Last 1 year'] as TimeFilter[]).map((f) => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <DataState state={series} isEmpty={(d) => d.length === 0} emptyTitle="No earnings data available">
          {(data) => <EarningsChart data={data} />}
        </DataState>
      </Card>

      <Card style={styles.payoutCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Current Payout Methods</Text>
          <Button label="Add New Payout Method" variant="secondary" onPress={onOpenPayout} />
        </View>
        <DataState
          state={payoutMethods}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No payout method added"
          emptyBody="Add a bank account or UPI ID to receive withdrawals."
        >
          {(data) => (
            <View style={{ gap: spacing.md }}>
              {data.map((m) => (
                <View key={m.id} style={styles.methodRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodLabel}>{m.label}</Text>
                    <Text style={styles.methodSub}>{m.type === 'bank' ? 'Bank Account' : 'UPI'} {m.isPrimary ? '· Selected for Payout' : '· Secondary method'}</Text>
                  </View>
                  <Badge
                    label={m.verificationStatus === 'verified' ? 'Verified' : m.verificationStatus === 'pending' ? 'Pending' : 'Unverified'}
                    tone={m.verificationStatus === 'verified' ? 'success' : m.verificationStatus === 'pending' ? 'warning' : 'neutral'}
                  />
                </View>
              ))}
            </View>
          )}
        </DataState>
        <View style={styles.payoutActions}>
          <Button label="Withdraw" variant="primary" />
          <Button label="History" variant="outline" />
          <Button label="Refunds" variant="outline" />
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  overviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.xl },
  chartCard: { marginBottom: spacing.xl },
  chartHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  cardTitle: { ...typography.h3, color: colors.textPrimary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.creamBackgroundAlt },
  filterChipActive: { backgroundColor: colors.mintGreenSoft },
  filterText: { ...typography.caption, color: colors.textSecondary, textTransform: 'none' },
  filterTextActive: { color: colors.forestGreen },
  payoutCard: {},
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  methodLabel: { ...typography.smallMedium, color: colors.textPrimary },
  methodSub: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  payoutActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});

export default EarningsScreen;
