/**
 * Hawk Aerospace design system — shared with the Customer Workspace.
 * Pilot Workspace consumes the SAME tokens so both dashboards feel like
 * one platform. Do not use raw hex values in screens/components —
 * always reference these tokens (or the semantic aliases in theme.ts).
 */
export const colors = {
  // Brand greens
  forestGreen: '#1F3A2E',
  darkGreen: '#132A20',
  deepGreenGradientEnd: '#0E211A',
  mintGreen: '#B7E4C7',
  mintGreenSoft: '#E3F5E9',
  successGreen: '#2F9E5C',

  // Neutrals / surfaces
  creamBackground: '#F6F3EC',
  creamBackgroundAlt: '#F1EDE2',
  cardWhite: '#FFFFFF',
  border: '#E5E1D6',
  borderStrong: '#D8D3C4',

  // Text
  textPrimary: '#1B1F1C',
  textSecondary: '#5C6B62',
  textMuted: '#8B968F',
  textOnDark: '#F6F3EC',
  textOnDarkMuted: 'rgba(246, 243, 236, 0.72)',

  // Status
  success: '#2F9E5C',
  warning: '#C98A2E',
  error: '#C0402F',
  info: '#3A6EA5',

  // Utility
  shadow: 'rgba(19, 42, 32, 0.10)',
  overlay: 'rgba(15, 26, 20, 0.45)',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorToken = keyof typeof colors;
