import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PhoneIcon from '../../assets/icons/phone.svg';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { Card, Button } from '../../components/ui';
import { Pilot } from '../../types';

interface AccountScreenProps {
  pilot: Pilot | null;
}

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const AccountScreen: React.FC<AccountScreenProps> = ({ pilot }) => {
  return (
    <Screen>
      <Text style={styles.title}>Account</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(pilot?.name || 'P').charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{pilot?.name || 'Pilot'}</Text>
          <Text style={styles.roleLabel}>Current Role: <Text style={styles.roleValue}>Drone Pilot</Text></Text>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <InfoRow label="Name" value={pilot?.name} />
        <InfoRow label="Phone" value={pilot?.phone} />
        <InfoRow label="Email" value={pilot?.email} />
        <InfoRow label="Current Role" value="Drone Pilot" />
      </Card>

      <Card style={styles.supportCard}>
        <Text style={styles.cardTitle}>Support</Text>
        <Text style={styles.supportBody}>Need help with a mission, payout or your account? Our team is available anytime.</Text>
        <View style={styles.supportActions}>
          <Button label="Contact Support" variant="primary" />
          <View style={styles.supportPhoneChip}>
            <PhoneIcon width={14} height={14} fill={colors.forestGreen} color={colors.forestGreen} />
            <Text style={styles.supportPhoneText}>+91 80 4000 4000</Text>
          </View>
        </View>
      </Card>

      <TouchableOpacity style={styles.signOutRow} activeOpacity={0.7}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h2, color: colors.mintGreen },
  name: { ...typography.h3, color: colors.textPrimary },
  roleLabel: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  roleValue: { color: colors.forestGreen, fontWeight: '700' },
  infoCard: { marginBottom: spacing.lg, maxWidth: 480 },
  cardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.small, color: colors.textSecondary },
  infoValue: { ...typography.smallMedium, color: colors.textPrimary },
  supportCard: { marginBottom: spacing.lg, maxWidth: 480 },
  supportBody: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.lg },
  supportActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  supportPhoneChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.mintGreenSoft, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill },
  supportPhoneText: { ...typography.smallMedium, color: colors.forestGreen },
  signOutRow: { paddingVertical: spacing.lg },
  signOutText: { ...typography.bodyMedium, color: colors.error },
});

export default AccountScreen;
