import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { HawkRole } from '../types';
import { PersonIcon, TruckIcon, PlaneIcon, BagIcon, WrenchIcon } from '../components/RoleIcons';

const ROLES: { role: HawkRole; label: string; Icon: React.FC<{ color: string; size?: number }> }[] = [
  { role: 'Customer', label: 'Customer', Icon: PersonIcon },
  { role: 'Fleet Manager', label: 'Fleet Manager', Icon: TruckIcon },
  { role: 'Pilot', label: 'Drone Pilot', Icon: PlaneIcon },
  { role: 'Sales Aggregator', label: 'Sales Aggregator', Icon: BagIcon },
  { role: 'Technician', label: 'Technician', Icon: WrenchIcon },
];

interface RoleLauncherProps {
  visible: boolean;
  currentRole: HawkRole;
  onClose: () => void;
  onSelectRole?: (role: HawkRole) => void;
}

const RoleLauncher: React.FC<RoleLauncherProps> = ({ visible, currentRole, onClose, onSelectRole }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Hawk Aerospace Workspaces</Text>
          <View style={styles.grid}>
            {ROLES.map((r) => {
              const isCurrent = r.role === currentRole;
              return (
                <TouchableOpacity
                  key={r.role}
                  style={[styles.tile, isCurrent && styles.tileActive]}
                  activeOpacity={0.85}
                  onPress={() => onSelectRole?.(r.role)}
                >
                  <r.Icon color={isCurrent ? colors.white : colors.forestGreen} size={22} />
                  <Text style={[styles.tileLabel, isCurrent && styles.tileLabelActive]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'flex-end', padding: spacing.xl },
  panel: {
    width: 320,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginTop: 64,
    ...(shadow.raised as object),
  },
  title: { ...typography.smallMedium, color: colors.textSecondary, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '30%',
    minWidth: 84,
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tileActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  tileLabel: { ...typography.caption, color: colors.textPrimary, textTransform: 'none', textAlign: 'center' },
  tileLabelActive: { color: colors.white },
});

export default RoleLauncher;

