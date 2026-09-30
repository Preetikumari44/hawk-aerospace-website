import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { AvailabilityStatus } from '../types';

interface AvailabilityToggleProps {
  status: AvailabilityStatus;
  onToggle: () => void;
}

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ status, onToggle }) => {
  const isActive = status === 'active';
  return (
    <TouchableOpacity style={[styles.pill, isActive ? styles.pillActive : styles.pillOff]} activeOpacity={0.85} onPress={onToggle}>
      <View style={[styles.dot, { backgroundColor: isActive ? colors.success : colors.error }]} />
      <View>
        <Text style={[styles.label, isActive ? styles.labelActive : styles.labelOff]}>
          {isActive ? 'Active' : 'Off-Duty'}
        </Text>
        <Text style={styles.sub}>{isActive ? 'You are Active Full Day' : 'Tap to go Active'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: colors.mintGreenSoft, borderColor: colors.mintGreen },
  pillOff: { backgroundColor: colors.creamBackgroundAlt, borderColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  label: { ...typography.bodyMedium },
  labelActive: { color: colors.forestGreen },
  labelOff: { color: colors.textPrimary },
  sub: { ...typography.small, color: colors.textSecondary, marginTop: 1 },
});

export default AvailabilityToggle;
