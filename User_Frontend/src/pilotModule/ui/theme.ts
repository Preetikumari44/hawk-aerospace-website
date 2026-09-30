import { Platform } from 'react-native';
import { colors } from './colors';

/**
 * Pilot design tokens ported from the Hawk Pilot dashboard.
 * Fonts use SuperApp's bundled Roboto family so text renders identically
 * to the rest of the app (no new font assets required).
 */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 };
export const radii = { sm: 6, md: 10, lg: 12, xl: 16, xxl: 20, pill: 999 };

const medium = { fontFamily: 'Roboto-Medium', fontWeight: '500' as const };
const regular = { fontFamily: 'Roboto-Regular', fontWeight: '400' as const };

export const typography = {
  h1: { ...medium, fontSize: 26, letterSpacing: -0.4 },
  h2: { ...medium, fontSize: 22, letterSpacing: -0.3 },
  h3: { ...medium, fontSize: 17 },
  body: { ...regular, fontSize: 15 },
  bodyMedium: { ...medium, fontSize: 15 },
  small: { ...regular, fontSize: 13 },
  smallMedium: { ...medium, fontSize: 13 },
  caption: { ...medium, fontSize: 11, letterSpacing: 0.6 },
};

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.05)' },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
  }),
  raised: Platform.select({
    web: { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)' },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 6,
    },
  }),
};

export const theme = { colors, spacing, radii, typography, shadow };
export default theme;
