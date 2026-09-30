import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { NAV_ITEMS, ScreenKey } from './navConfig';
import { COMMON_HEADER_HEIGHT } from './CommonHeader';

interface SidebarProps {
  active: ScreenKey;
  onNavigate: (key: ScreenKey) => void;
  onPressSupport?: () => void;
}

// Exported so AppShell can offset the main content by the same amount —
// the sidebar is taken out of normal flow (fixed) on web so it can span
// the full viewport height while the dashboard content scrolls under it.
export const SIDEBAR_WIDTH = 248;

const Sidebar: React.FC<SidebarProps> = ({ active, onNavigate, onPressSupport }) => {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>H</Text>
        </View>
        <View>
          <Text style={styles.brandName}>Hawk Aerospace</Text>
          <Text style={styles.brandSub}>Pilot Workspace</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>PILOT</Text>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key || (active === 'MissionDetails' && item.key === 'Missions') || (active === 'Payout' && item.key === 'Earnings');
          const Icon = isActive ? item.Active : item.Inactive;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              activeOpacity={0.8}
              onPress={() => onNavigate(item.key)}
            >
              <View style={styles.navIconWrap}>
                <Icon width={19} height={19} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Need help?</Text>
        <Text style={styles.footerSubtitle}>24x7 Expert Support</Text>
        <Text style={styles.footerBody}>Get help from our agricultural drone specialists anytime.</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressSupport ?? (() => onNavigate('Account'))}
        >
          <Text style={styles.footerCta}>Support →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.forestGreen,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: '100%',
    // Full-height, fixed/sticky sidebar on web: spans from beneath the
    // common Hawk Aerospace platform header to the bottom of the viewport,
    // and stays in place while the dashboard content scrolls beside it.
    // Width/color/content are unchanged — layout only.
    ...(Platform.select({
      web: {
        position: 'fixed' as any,
        top: COMMON_HEADER_HEIGHT,
        left: 0,
        height: `calc(100vh - ${COMMON_HEADER_HEIGHT}px)` as any,
        overflowY: 'auto' as any,
        zIndex: 10,
      },
      default: {},
    }) as object),
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.mintGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brandMarkText: { ...typography.h3, color: colors.darkGreen },
  brandName: { ...typography.smallMedium, color: colors.textOnDark },
  brandSub: { ...typography.small, color: colors.textOnDarkMuted, marginTop: 1 },
  sectionLabel: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  navList: { gap: spacing.xs },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  navItemActive: { backgroundColor: colors.mintGreen },
  navIconWrap: { width: 24, alignItems: 'center', marginRight: spacing.md },
  navLabel: { ...typography.bodyMedium, color: colors.textOnDarkMuted },
  navLabelActive: { color: colors.darkGreen },
  spacer: { flex: 1 },
  footerCard: {
    backgroundColor: 'rgba(183, 228, 199, 0.10)',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  footerTitle: { ...typography.smallMedium, color: colors.textOnDark },
  footerSubtitle: { ...typography.small, color: colors.mintGreen, fontWeight: '700', marginTop: spacing.xs },
  footerBody: { ...typography.small, color: colors.textOnDarkMuted, marginTop: 2 },
  footerCta: { ...typography.small, color: colors.mintGreen, fontWeight: '700', marginTop: spacing.sm },
});

export default Sidebar;
