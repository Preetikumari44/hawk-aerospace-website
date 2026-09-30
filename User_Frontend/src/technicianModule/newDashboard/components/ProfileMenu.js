import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

// Compact quick-view opened from the header profile area. The full
// Personal Details view lives in ProfileScreen.
export default function ProfileMenu({ technician }) {
  return (
    <View style={styles.popup}>
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>{(technician.name || 'T').charAt(0)}</Text>
      </View>
      <Text style={styles.name}>{technician.name || 'Technician'}</Text>
      <Text style={styles.role}>{technician.role}</Text>
      <View style={styles.divider} />
      <Text style={styles.hint}>Open Profile from here to manage account details.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 220,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 30,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mintSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  avatarInitial: { color: colors.forestGreen, fontWeight: '700', fontSize: 16 },
  name: { ...typography.h3, color: colors.textPrimary },
  role: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, width: '100%', marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
