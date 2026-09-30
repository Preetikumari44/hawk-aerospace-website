import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { useApp } from '../context/AppContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { roleSwitchOptions } from '../data/technicianData';

const FIELDS = [
  { label: 'Name', key: 'name', fallback: 'Not set' },
  { label: 'Phone', key: 'phone', fallback: 'No phone' },
  { label: 'Email', key: 'email', fallback: 'No email' },
  { label: 'Role', key: 'role', fallback: 'Technician' },
  { label: 'ID', key: 'id', fallback: 'Not assigned' },
  { label: 'Address', key: 'address', fallback: 'Address unavailable' },
];

export default function ProfileScreen() {
  const { technician } = useApp();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [pendingRole, setPendingRole] = useState(null);
  const displayName = technician.name || 'Technician';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{technician.role}</Text>
        </View>
      </View>

      <View style={[styles.row, isMobile && styles.rowMobile]}>
        <View style={isMobile ? styles.detailsCardMobile : styles.detailsCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          {FIELDS.map((f) => (
            <View key={f.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>{technician[f.key] || f.fallback}</Text>
            </View>
          ))}
        </View>

        <View style={isMobile ? styles.roleCardMobile : styles.roleCard}>
          <Text style={styles.sectionTitle}>Your Role</Text>
          {roleSwitchOptions.map((role) => {
            const isCurrent = role === technician.role;
            return (
              <TouchableOpacity
                key={role}
                style={[styles.roleRow, isCurrent && styles.roleRowActive]}
                onPress={() => !isCurrent && setPendingRole(role)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roleText, isCurrent && styles.roleTextActive]}>{role}</Text>
                {isCurrent ? <Text style={styles.currentTag}>Current</Text> : null}
              </TouchableOpacity>
            );
          })}

          {pendingRole ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>Switch to {pendingRole}?</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity onPress={() => setPendingRole(null)} style={styles.confirmCancel}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPendingRole(null)} style={styles.confirmSwitch}>
                  <Text style={styles.confirmSwitchText}>Switch</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: colors.mintSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarInitial: { color: colors.forestGreen, fontWeight: '700', fontSize: 20 },
  name: { ...typography.h2, color: colors.textPrimary },
  role: { ...typography.caption, color: colors.textSecondary },
  row: { flexDirection: 'row' },
  rowMobile: { flexDirection: 'column' },
  detailsCard: {
    flex: 1.4, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, marginRight: spacing.lg,
  },
  detailsCardMobile: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  fieldLabel: { ...typography.caption, color: colors.textMuted },
  fieldValue: { ...typography.bodyMedium, color: colors.textPrimary },
  roleCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg,
  },
  roleCardMobile: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.lg,
  },
  roleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.xs,
  },
  roleRowActive: { backgroundColor: colors.mintSoft },
  roleText: { ...typography.body, color: colors.textSecondary },
  roleTextActive: { color: colors.forestGreen, fontWeight: '700' },
  currentTag: { ...typography.caption, color: colors.forestGreen },
  confirmBox: {
    marginTop: spacing.md, backgroundColor: colors.mintSoft, borderRadius: radius.md, padding: spacing.md,
  },
  confirmText: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.sm },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  confirmCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  confirmCancelText: { ...typography.bodyMedium, color: colors.textSecondary },
  confirmSwitch: {
    backgroundColor: colors.forestGreen, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  confirmSwitchText: { ...typography.bodyMedium, color: colors.white },
});
