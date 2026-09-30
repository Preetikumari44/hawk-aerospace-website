import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { Button, Card } from './ui';
import { TeamRequest, FleetManager } from '../types';

type Tab = 'Join' | 'Pending' | 'Invites';

interface MyTeamsSectionProps {
  suggested: FleetManager[];
  pending: TeamRequest[];
  invites: TeamRequest[];
  onRequestJoin?: (manager: FleetManager) => void;
  onAcceptInvite?: (req: TeamRequest) => void;
  onRejectInvite?: (req: TeamRequest) => void;
  onWithdraw?: (req: TeamRequest) => void;
  compact?: boolean;
}

const MyTeamsSection: React.FC<MyTeamsSectionProps> = ({
  suggested,
  pending,
  invites,
  onRequestJoin,
  onAcceptInvite,
  onRejectInvite,
  onWithdraw,
  compact,
}) => {
  const [tab, setTab] = useState<Tab>('Join');
  const tabs: Tab[] = ['Join', 'Pending', 'Invites'];
  const cap = (arr: unknown[]) => (compact ? (arr as any[]).slice(0, 2) : arr);

  return (
    <Card style={compact ? styles.cardCompact : undefined}>
      {!compact && <Text style={styles.title}>My Teams</Text>}

      <View style={[styles.segment, compact && styles.segmentCompact]}>
        {tabs.map((t) => {
          const isActive = tab === t;
          const count = t === 'Pending' ? pending.length : t === 'Invites' ? invites.length : undefined;
          return (
            <TouchableOpacity key={t} style={[styles.segmentItem, compact && styles.segmentItemCompact, isActive && styles.segmentItemActive]} onPress={() => setTab(t)}>
              <Text style={[styles.segmentText, compact && styles.segmentTextCompact, isActive && styles.segmentTextActive]}>
                {t}
                {count != null ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'Join' && (
        <View style={[styles.list, compact && styles.listCompact]}>
          {suggested.length === 0 && <Text style={styles.emptyText}>No suggested fleet managers right now.</Text>}
          {(cap(suggested) as FleetManager[]).map((m) => (
            <View key={m.id} style={[styles.row, compact && styles.rowCompact]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, compact && styles.rowTitleCompact]} numberOfLines={1}>{m.name}</Text>
                {!compact && <Text style={styles.rowSub}>{m.address || 'Location unavailable'} · {m.dronesCount ?? '—'} drones</Text>}
              </View>
              <Button label="Request" variant="secondary" onPress={() => onRequestJoin?.(m)} />
            </View>
          ))}
        </View>
      )}

      {tab === 'Pending' && (
        <View style={[styles.list, compact && styles.listCompact]}>
          {pending.length === 0 && <Text style={styles.emptyText}>No pending requests.</Text>}
          {(cap(pending) as TeamRequest[]).map((r) => (
            <View key={r.id} style={[styles.row, compact && styles.rowCompact]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, compact && styles.rowTitleCompact]} numberOfLines={1}>{r.managerOrPilotName || r.name}</Text>
                {!compact && <Text style={styles.rowSub}>Awaiting response</Text>}
              </View>
              <Button label="Withdraw" variant="outline" onPress={() => onWithdraw?.(r)} />
            </View>
          ))}
        </View>
      )}

      {tab === 'Invites' && (
        <View style={[styles.list, compact && styles.listCompact]}>
          {invites.length === 0 && <Text style={styles.emptyText}>No invitations right now.</Text>}
          {(cap(invites) as TeamRequest[]).map((r) => (
            <View key={r.id} style={[styles.row, compact && styles.rowCompact]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, compact && styles.rowTitleCompact]} numberOfLines={1}>{r.managerOrPilotName || r.name}</Text>
                {!compact && <Text style={styles.rowSub}>Invited you to join</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Accept" variant="primary" onPress={() => onAcceptInvite?.(r)} />
                <Button label="Reject" variant="outline" onPress={() => onRejectInvite?.(r)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  cardCompact: { padding: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.creamBackgroundAlt,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentCompact: { marginBottom: spacing.sm },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.pill, alignItems: 'center' },
  segmentItemCompact: { paddingVertical: 6 },
  segmentItemActive: { backgroundColor: colors.cardWhite },
  segmentText: { ...typography.small, color: colors.textSecondary },
  segmentTextCompact: { fontSize: 11 },
  segmentTextActive: { color: colors.forestGreen, fontWeight: '700' },
  list: { gap: spacing.md },
  listCompact: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowCompact: { paddingVertical: 4 },
  rowTitle: { ...typography.smallMedium, color: colors.textPrimary },
  rowTitleCompact: { fontSize: 11 },
  rowSub: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  emptyText: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.md },
});

export default MyTeamsSection;
