import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  fontFamily,
  h1: { fontFamily, fontSize: 24, fontWeight: '700' },
  h2: { fontFamily, fontSize: 18, fontWeight: '700' },
  h3: { fontFamily, fontSize: 15, fontWeight: '600' },
  body: { fontFamily, fontSize: 13, fontWeight: '400' },
  bodyMedium: { fontFamily, fontSize: 13, fontWeight: '600' },
  caption: { fontFamily, fontSize: 11, fontWeight: '400' },
  statNumber: { fontFamily, fontSize: 22, fontWeight: '700' },
};

export default typography;
