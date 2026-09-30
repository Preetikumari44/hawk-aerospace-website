import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; elevated?: boolean }> = ({
  children,
  style,
  elevated = true,
}) => <View style={[styles.card, elevated && (shadow.card as ViewStyle), style]}>{children}</View>;

export const SectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({
  title,
  action,
  onAction,
  style,
}) => (
  <View style={[styles.sectionHeaderRow, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!action && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';
const toneColors: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.mintGreenSoft, fg: colors.forestGreen },
  warning: { bg: '#F7EAD3', fg: colors.warning },
  error: { bg: '#F6E0DB', fg: colors.error },
  info: { bg: '#DEEAF4', fg: colors.info },
  neutral: { bg: colors.creamBackgroundAlt, fg: colors.textSecondary },
};

export const Badge: React.FC<{ label: string; tone?: BadgeTone }> = ({ label, tone = 'neutral' }) => {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
};

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

export const Button: React.FC<{
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  fullWidth?: boolean;
}> = ({ label, onPress, variant = 'primary', style, disabled, fullWidth }) => {
  const variantStyle = {
    primary: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
    secondary: { backgroundColor: colors.mintGreenSoft, borderColor: colors.mintGreenSoft },
    outline: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
    danger: { backgroundColor: 'transparent', borderColor: colors.error },
  }[variant];
  const textColor = {
    primary: colors.white,
    secondary: colors.forestGreen,
    outline: colors.textPrimary,
    danger: colors.error,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.button, variantStyle, fullWidth && { flex: 1 }, disabled && styles.buttonDisabled, style]}
    >
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionAction: { ...typography.smallMedium, color: colors.forestGreen },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, alignSelf: 'flex-start' },
  badgeText: { ...typography.caption },
  button: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...typography.bodyMedium },
});
