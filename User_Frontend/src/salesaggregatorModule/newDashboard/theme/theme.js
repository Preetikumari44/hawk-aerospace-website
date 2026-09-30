// src/theme/theme.js
export const COLORS = {
  primaryDark: '#0B3D2E',
  primaryDarker: '#082B21',
  primary: '#1F6F4A',
  primaryLight: '#E7F3EC',
  background: '#F4F6F4',
  card: '#FFFFFF',
  border: '#E6E8E6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  success: '#1F9D55',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  amber: '#B45309',
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const RADIUS = { sm: 8, md: 12, lg: 16, pill: 999 };
export const FONT = {
  h1: { fontSize: 20, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '700' },
  h3: { fontSize: 14, fontWeight: '600' },
  body: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 11, fontWeight: '400' },
  value: { fontSize: 18, fontWeight: '700' },
};
export const BREAKPOINTS = { desktop: 1024, tablet: 768 };

export default { COLORS, SPACING, RADIUS, FONT, BREAKPOINTS };
