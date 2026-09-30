import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RupeeIcon from '../assets/icons/rupeeIcon.svg';
import CalendarIcon from '../assets/icons/calendar.svg';
import LocationPinIcon from '../assets/icons/location-pin.svg';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { Button } from './ui';
import { Mission } from '../types';

const formatDate = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

interface AssignedMissionCardProps {
  mission: Mission;
  onAccept?: (mission: Mission) => void;
  onReject?: (mission: Mission) => void;
  onViewDetails?: (mission: Mission) => void;
}

const AssignedMissionCard: React.FC<AssignedMissionCardProps> = ({ mission, onAccept, onReject, onViewDetails }) => {
  const address = mission.address || mission.location?.address || 'Location pending';
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{mission.serviceType}</Text>
        <Text style={styles.link} onPress={() => onViewDetails?.(mission)}>
          View Details
        </Text>
      </View>
      <Text style={styles.subId}>{mission.id}{mission.customerName ? ` · ${mission.customerName}` : ''}</Text>

      <View style={styles.row}>
        <RupeeIcon width={14} height={14} fill={colors.textSecondary} color={colors.textSecondary} style={styles.rowIcon} />
        <Text style={styles.rowText}>
          Est. earnings: <Text style={styles.rowStrong}>{mission.estimatedEarnings || 'N/A'}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <CalendarIcon width={14} height={14} fill={colors.textSecondary} color={colors.textSecondary} style={styles.rowIcon} />
        <Text style={styles.rowText}>
          {formatDate(mission.scheduledDate)} · <Text style={styles.rowStrong}>{mission.preferredTimeSlot || 'To be scheduled'}</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <LocationPinIcon width={14} height={14} fill={colors.textSecondary} color={colors.textSecondary} style={styles.rowIcon} />
        <Text style={styles.rowText} numberOfLines={1}>{address}</Text>
      </View>

      <View style={styles.actionRow}>
        <Button label="Accept" variant="primary" fullWidth onPress={() => onAccept?.(mission)} />
        <Button label="Reject" variant="outline" fullWidth onPress={() => onReject?.(mission)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...(shadow.card as object),
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { ...typography.bodyMedium, color: colors.textPrimary, flexShrink: 1, marginRight: spacing.sm },
  link: { ...typography.small, color: colors.forestGreen, fontWeight: '600' },
  subId: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  rowIcon: { marginRight: spacing.sm },
  rowText: { ...typography.small, color: colors.textSecondary, flexShrink: 1 },
  rowStrong: { color: colors.textPrimary, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

export default AssignedMissionCard;
