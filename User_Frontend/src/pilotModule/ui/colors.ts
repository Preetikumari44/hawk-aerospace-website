/**
 * Hawk Aerospace design system — shared with the Customer Workspace.
 * Pilot Workspace consumes the SAME tokens so both dashboards feel like
 * one platform. Do not use raw hex values in screens/components —
 * always reference these tokens (or the semantic aliases in theme.ts).
 */
export const colors = {
  // Brand greens
  forestGreen: '#0F3D2E',
  darkGreen: '#0A2A20',
  deepGreenGradientEnd: '#071E17',
  mintGreen: '#A7DFC0',
  mintGreenSoft: '#E7F4EC',
  successGreen: '#188A4E',

  // Neutrals / surfaces
  creamBackground: '#F4F6F8',
  creamBackgroundAlt: '#EDF0F3',
  cardWhite: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textOnDark: '#F8FAFC',
  textOnDarkMuted: 'rgba(248, 250, 252, 0.74)',

  // Status
  success: '#188A4E',
  warning: '#B45309',
  error: '#C53030',
  info: '#2B5FC7',

  // Utility
  shadow: 'rgba(15, 23, 42, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.50)',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorToken = keyof typeof colors;
