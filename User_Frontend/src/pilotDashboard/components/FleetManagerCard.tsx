import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LocationPinIcon from '../assets/icons/location-pin.svg';
import PhoneIcon from '../assets/icons/phone.svg';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { FleetManager } from '../types';

const FleetManagerCard: React.FC<{ manager: FleetManager; compact?: boolean }> = ({ manager, compact }) => (
  <View style={[styles.card, compact && styles.cardCompact]}>
    <View style={styles.topRow}>
      <View style={[styles.avatar, compact && styles.avatarCompact]}>
        <Text style={[styles.avatarInitial, compact && { fontSize: 12 }]}>{manager.name.charAt(0)}</Text>
      </View>
      <View style={styles.infoCol}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>{manager.name}</Text>
        <Text style={[styles.drones, compact && styles.dronesCompact]}>Drones: <Text style={styles.dronesBold}>{manager.dronesCount ?? '—'}</Text></Text>
      </View>
      {!compact && !!manager.phone && (
        <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.8}>
          <PhoneIcon width={16} height={16} fill={colors.forestGreen} color={colors.forestGreen} />
        </TouchableOpacity>
      )}
    </View>
    {!!manager.address && (
      <View style={[styles.addressRow, compact && { marginTop: 6 }]}>
        <LocationPinIcon width={12} height={12} fill={colors.textSecondary} color={colors.textSecondary} style={{ marginRight: 5 }} />
        <Text style={[styles.address, compact && styles.addressCompact]} numberOfLines={1}>{manager.address}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...(shadow.card as object),
  },
  cardCompact: { width: 190, padding: spacing.sm, borderRadius: radii.md },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mintGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarCompact: { width: 28, height: 28, borderRadius: 14, marginRight: spacing.sm },
  avatarInitial: { ...typography.bodyMedium, color: colors.forestGreen },
  infoCol: { flex: 1 },
  name: { ...typography.smallMedium, color: colors.textPrimary },
  nameCompact: { fontSize: 12 },
  drones: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  dronesCompact: { fontSize: 10, marginTop: 1 },
  dronesBold: { color: colors.textPrimary, fontWeight: '700' },
  phoneBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mintGreenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  address: { ...typography.small, color: colors.textSecondary, flexShrink: 1 },
  addressCompact: { fontSize: 10 },
});

export default FleetManagerCard;
