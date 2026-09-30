import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { Badge, Button, Card } from '../../components/ui';
import { Mission } from '../../types';

interface MissionDetailsScreenProps {
  mission: Mission | null;
  onBack: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const MissionDetailsScreen: React.FC<MissionDetailsScreenProps> = ({ mission, onBack }) => {
  if (!mission) {
    return (
      <Screen>
        <Text style={styles.title}>Mission not found</Text>
        <Button label="Back to Missions" variant="secondary" onPress={onBack} style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }} />
      </Screen>
    );
  }

  const address = mission.address || mission.location?.address || 'Location pending';

  return (
    <Screen>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backLink}>← Back to Missions</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{mission.serviceType}</Text>
          <Text style={styles.subId}>{mission.id}</Text>
        </View>
        <Badge label={mission.status} tone={mission.status === 'completed' ? 'success' : mission.status === 'active' ? 'info' : 'neutral'} />
      </View>

      <View style={styles.grid}>
        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Mission Information</Text>
          <InfoRow label="Service" value={mission.serviceType} />
          <InfoRow label="Status" value={mission.status} />
          <InfoRow label="Scheduled" value={formatDate(mission.scheduledDate)} />
          <InfoRow label="Time Slot" value={mission.preferredTimeSlot} />
          <InfoRow label="Estimated Earnings" value={mission.estimatedEarnings} />
          <InfoRow label="Payment Status" value={mission.paymentStatus} />
        </Card>

        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Customer & Location</Text>
          <InfoRow label="Customer" value={mission.customerName} />
          <InfoRow label="Location" value={address} />
          <InfoRow label="ETA" value={mission.eta} />
          <InfoRow label="Next Step" value={mission.nextStep} />
        </Card>

        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Fleet & Drone</Text>
          <InfoRow label="Fleet Manager" value={mission.fleetManagerName} />
          <InfoRow label="Drone Model" value={mission.drone?.model} />
          <InfoRow label="Registration" value={mission.drone?.registrationNumber} />
        </Card>

        <Card style={styles.gridCard}>
          <Text style={styles.cardTitle}>Live Mission Tracking</Text>
          <Text style={styles.trackingBody}>
            Real-time pilot location, drone location, route and operation status will appear here once connected to
            live Hawk mission telemetry.
          </Text>
          <Button label="View Live Mission" variant="secondary" style={{ marginTop: spacing.md, alignSelf: 'flex-start' }} />
        </Card>
      </View>

      {mission.status === 'assigned' && (
        <View style={styles.actionRow}>
          <Button label="Accept Mission" variant="primary" />
          <Button label="Reject Mission" variant="outline" />
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  backLink: { ...typography.smallMedium, color: colors.forestGreen, marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary },
  subId: { ...typography.small, color: colors.textMuted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  gridCard: { flexGrow: 1, flexBasis: 320, minWidth: 280 },
  cardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.small, color: colors.textSecondary },
  infoValue: { ...typography.smallMedium, color: colors.textPrimary, textAlign: 'right', flexShrink: 1, marginLeft: spacing.md },
  trackingBody: { ...typography.small, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});

export default MissionDetailsScreen;
