import { Platform } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

const fontFamily = Platform.select({
  web: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  default: undefined,
});

export const typography = {
  fontFamily,
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  smallMedium: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(19, 42, 32, 0.08)' },
    default: {
      shadowColor: colors.darkGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
  }),
  raised: Platform.select({
    web: { boxShadow: '0 10px 30px rgba(19, 42, 32, 0.14)' },
    default: {
      shadowColor: colors.darkGreen,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 6,
    },
  }),
};

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1100,
};

export const theme = { colors, spacing, radii, typography, shadow, breakpoints };
export type Theme = typeof theme;
export default theme;
