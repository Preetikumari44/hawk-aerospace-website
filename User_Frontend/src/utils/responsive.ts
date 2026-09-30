import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;
export const WIDE_DESKTOP_BREAKPOINT = 1440;

export const useLayoutTier = (): 'mobile' | 'tablet' | 'desktop' | 'wide' => {
    const { width } = useWindowDimensions();

    // Force mobile layout on native apps regardless of screen width (e.g., iPads)
    // unless you want iPad native to use desktop layouts.
    if (Platform.OS !== 'web') return 'mobile';

    if (width >= WIDE_DESKTOP_BREAKPOINT) return 'wide';
    if (width >= DESKTOP_BREAKPOINT) return 'desktop';
    if (width >= TABLET_BREAKPOINT) return 'tablet';
    return 'mobile';
};

export const useIsDesktop = () => {
    const tier = useLayoutTier();
    return tier === 'desktop' || tier === 'wide';
};

/**
 * Returns responsive bottom padding for screens with TabBar.
 * Accounts for TabBar height, safe area insets, and platform differences.
 */
export const useTabBarPadding = () => {
    const insets = useSafeAreaInsets();
    const tier = useLayoutTier();
    
    // TabBar heights vary by platform and screen size
    const TAB_BAR_HEIGHT = 64; // Base TabBar height
    const SPACING_BUFFER = 16; // Additional spacing above content
    
    // Calculate total bottom padding
    // iOS: 24-32 bottom margin + 64 TabBar + 16 buffer + safe area
    // Android: 12-16 bottom margin + 64 TabBar + 16 buffer + safe area
    // Web/Desktop: May not need as much spacing
    
    if (tier === 'desktop' || tier === 'wide') {
        // Desktop has different TabBar positioning
        return 24;
    }
    
    if (Platform.OS === 'ios') {
        return TAB_BAR_HEIGHT + SPACING_BUFFER + Math.max(insets.bottom, 24);
    }
    
    if (Platform.OS === 'android') {
        return TAB_BAR_HEIGHT + SPACING_BUFFER + Math.max(insets.bottom, 12);
    }
    
    // Web mobile view
    return TAB_BAR_HEIGHT + SPACING_BUFFER + insets.bottom;
};