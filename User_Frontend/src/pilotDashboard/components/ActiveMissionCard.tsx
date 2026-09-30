import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CalendarIcon from '../assets/icons/calendar.svg';
import LocationPinIcon from '../assets/icons/location-pin.svg';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { Button } from './ui';
import { Mission } from '../types';

const formatDate = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

interface ActiveMissionCardProps {
  mission: Mission;
  onViewDetails?: (mission: Mission) => void;
}

const ActiveMissionCard: React.FC<ActiveMissionCardProps> = ({ mission, onViewDetails }) => {
  const address = mission.address || mission.location?.address || 'Location pending';
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{mission.serviceType}</Text>
      <Text style={styles.subId}>{mission.id}</Text>

      <View style={styles.row}>
        <CalendarIcon width={16} height={16} fill={colors.textOnDark} color={colors.textOnDark} style={styles.rowIcon} />
        <Text style={styles.rowText}>{formatDate(mission.scheduledDate)} · {mission.preferredTimeSlot || 'To be scheduled'}</Text>
      </View>

      <View style={styles.row}>
        <LocationPinIcon width={14} height={14} fill={colors.textOnDark} color={colors.textOnDark} style={styles.rowIcon} />
        <Text style={styles.rowText} numberOfLines={1}>{address}</Text>
      </View>

      <View style={styles.metaRow}>
        <View>
          <Text style={styles.metaLabel}>Est. earnings</Text>
          <Text style={styles.metaValue}>{mission.estimatedEarnings || 'N/A'}</Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>ETA</Text>
          <Text style={styles.metaValue}>{mission.eta || '—'}</Text>
        </View>
      </View>

      {!!mission.nextStep && (
        <Text style={styles.nextStep}>
          Next step: <Text style={styles.nextStepValue}>{mission.nextStep}</Text>
        </Text>
      )}

      <Button label="View Details" variant="secondary" onPress={() => onViewDetails?.(mission)} style={styles.detailsBtn} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: colors.forestGreen,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  title: { ...typography.h3, color: colors.textOnDark },
  subId: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: 2, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  rowIcon: { marginRight: spacing.sm },
  rowText: { ...typography.small, color: colors.textOnDark, flexShrink: 1 },
  metaRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.md, marginBottom: spacing.md },
  metaLabel: { ...typography.caption, color: colors.textOnDarkMuted },
  metaValue: { ...typography.bodyMedium, color: colors.mintGreen, marginTop: 2 },
  nextStep: { ...typography.small, color: colors.textOnDarkMuted, marginBottom: spacing.lg },
  nextStepValue: { color: colors.textOnDark, fontWeight: '600' },
  detailsBtn: { marginTop: spacing.xs },
});

export default ActiveMissionCard;
