import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { breakpoints } from '../theme/theme';

export type LayoutSize = 'mobile' | 'tablet' | 'desktop';

const sizeFor = (width: number): LayoutSize => {
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
};

export function useResponsive() {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub?.remove?.();
  }, []);

  const size = sizeFor(width);
  return { width, size, isDesktop: size === 'desktop', isTablet: size === 'tablet', isMobile: size === 'mobile' };
}
