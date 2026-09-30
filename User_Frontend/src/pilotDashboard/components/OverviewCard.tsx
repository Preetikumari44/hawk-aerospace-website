import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';

interface OverviewCardProps {
  label: string;
  value: string;
  tone?: 'default' | 'dark';
  compact?: boolean;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ label, value, tone = 'default', compact }) => {
  const isDark = tone === 'dark';
  return (
    <View style={[styles.card, isDark && styles.cardDark, compact && styles.cardCompact]}>
      <Text style={[styles.label, isDark && styles.labelDark, compact && styles.labelCompact]}>{label}</Text>
      <Text style={[styles.value, isDark && styles.valueDark, compact && styles.valueCompact]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 200,
    minWidth: 160,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...(shadow.card as object),
  },
  cardCompact: { padding: spacing.md, minWidth: 130, flexBasis: 150 },
  cardDark: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  label: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  labelCompact: { fontSize: 11, marginBottom: 4 },
  labelDark: { color: colors.textOnDarkMuted },
  value: { ...typography.h2, color: colors.textPrimary },
  valueCompact: { fontSize: 20 },
  valueDark: { color: colors.textOnDark },
});

export default OverviewCard;
