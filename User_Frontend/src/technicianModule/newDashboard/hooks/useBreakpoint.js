import { useWindowDimensions } from 'react-native';

// Shared responsive breakpoints used by every screen/component so
// desktop, tablet and mobile (and the web build, which reports its
// browser window width through the same API) all key off one source
// of truth.
//   desktop >= 1024
//   tablet  768–1023
//   mobile  < 768
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

export function useIsDesktop() {
  return useBreakpoint() === 'desktop';
}

export function useIsMobile() {
  return useBreakpoint() === 'mobile';
}

export default useBreakpoint;
