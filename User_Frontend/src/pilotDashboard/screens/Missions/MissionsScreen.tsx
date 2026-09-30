import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography, shadow } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { SectionHeader, Badge } from '../../components/ui';
import DataState from '../../components/DataState';
import { useAsync } from '../../hooks/useAsync';
import { pilotService } from '../../services/pilotService';
import { Mission } from '../../types';

type Tab = 'Active' | 'Upcoming' | 'Completed';

interface MissionsScreenProps {
  onOpenMissionDetails: (mission: Mission) => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const MissionRow: React.FC<{ mission: Mission; onPress: () => void }> = ({ mission, onPress }) => (
  <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{mission.serviceType}</Text>
        <Badge
          label={mission.status === 'completed' ? (mission.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending') : mission.status}
          tone={mission.status === 'completed' ? (mission.paymentStatus === 'paid' ? 'success' : 'warning') : mission.status === 'active' ? 'info' : 'neutral'}
        />
      </View>
      <Text style={styles.rowMeta}>{mission.id} · {mission.address || mission.location?.address || 'Location pending'}</Text>
      <Text style={styles.rowMeta}>
        {formatDate(mission.scheduledDate || mission.completedDate)}
        {mission.preferredTimeSlot ? ` · ${mission.preferredTimeSlot}` : ''}
        {mission.estimatedEarnings ? ` · ${mission.estimatedEarnings}` : ''}
      </Text>
    </View>
    <Text style={styles.viewDetails}>View Details</Text>
  </TouchableOpacity>
);

const MissionsScreen: React.FC<MissionsScreenProps> = ({ onOpenMissionDetails }) => {
  const [tab, setTab] = useState<Tab>('Active');

  const activeMissions = useAsync(() => pilotService.getActiveMissions(), []);
  const upcomingMissions = useAsync(() => pilotService.getUpcomingMissions(), []);
  const completedMissions = useAsync(() => pilotService.getCompletedMissions(), []);
  const assignedRequests = useAsync(() => pilotService.getAssignedMissions(), []);

  const currentState = tab === 'Active' ? activeMissions : tab === 'Upcoming' ? upcomingMissions : completedMissions;

  return (
    <Screen>
      <Text style={styles.title}>Your Missions</Text>

      <View style={styles.segment}>
        {(['Active', 'Upcoming', 'Completed'] as Tab[]).map((t) => {
          const isActive = tab === t;
          return (
            <TouchableOpacity key={t} style={[styles.segmentItem, isActive && styles.segmentItemActive]} onPress={() => setTab(t)}>
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <DataState
        state={currentState}
        isEmpty={(d) => d.length === 0}
        emptyTitle={`No ${tab.toLowerCase()} missions`}
        emptyBody={tab === 'Active' ? 'Missions in progress will appear here.' : tab === 'Upcoming' ? 'Accepted missions scheduled ahead will appear here.' : 'Your finished missions will appear here.'}
      >
        {(data) => (
          <View style={styles.list}>
            {data.map((m) => (
              <MissionRow key={m.id} mission={m} onPress={() => onOpenMissionDetails(m)} />
            ))}
          </View>
        )}
      </DataState>

      <SectionHeader title="Assigned Requests" style={styles.sectionSpacing} />
      <DataState state={assignedRequests} isEmpty={(d) => d.length === 0} emptyTitle="No pending requests" emptyBody="Incoming mission requests needing your response will show here.">
        {(data) => (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg }}>
            {data.map((m) => (
              <TouchableOpacity key={m.id} style={styles.assignedCard} activeOpacity={0.85} onPress={() => onOpenMissionDetails(m)}>
                <Text style={styles.rowTitle}>{m.serviceType}</Text>
                <Text style={styles.rowMeta}>{m.id}</Text>
                <View style={styles.assignedActions}>
                  <Badge label="Accept" tone="success" />
                  <Badge label="Reject" tone="error" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </DataState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.creamBackgroundAlt,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.xl,
    maxWidth: 420,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.pill, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.cardWhite, ...(shadow.card as object) },
  segmentText: { ...typography.small, color: colors.textSecondary },
  segmentTextActive: { color: colors.forestGreen, fontWeight: '700' },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  rowMeta: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  viewDetails: { ...typography.smallMedium, color: colors.forestGreen },
  sectionSpacing: { marginTop: spacing.xxl },
  assignedCard: {
    width: 220,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  assignedActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

export default MissionsScreen;
