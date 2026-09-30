import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { useResponsive } from '../hooks/useResponsive';
import RoleLauncher from './RoleLauncher';
import { HawkRole } from '../types';

export const COMMON_HEADER_HEIGHT = 52;

// Placeholder nav items shared with the rest of the Hawk Aerospace platform
// (SkyMap, Customer/Fleet Manager/Sales Aggregator dashboards). Only
// Marketplace is wired up here — Solutions/Technology/Platforms are
// platform-level destinations outside this Pilot project's scope, kept as
// integration-ready labels rather than invented pages.
const PLATFORM_NAV = ['Solutions', 'Technology', 'Platforms'];

interface CommonHeaderProps {
  onPressMarketplace: () => void;
  onSwitchRole?: (role: string) => void;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ onPressMarketplace, onSwitchRole }) => {
  const [roleLauncherOpen, setRoleLauncherOpen] = React.useState(false);
  const { isDesktop } = useResponsive();
  return (
    <>
      <View style={styles.bar}>
        <View style={styles.left}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>H</Text>
          </View>
          <Text style={styles.brand}>HAWK AEROSPACE</Text>
        </View>

        {isDesktop && (
          <View style={styles.nav}>
            {PLATFORM_NAV.map((label) => (
              <Text key={label} style={styles.navItem}>
                {label}
              </Text>
            ))}
            <TouchableOpacity onPress={onPressMarketplace} activeOpacity={0.75}>
              <Text style={[styles.navItem, styles.navItemActive]}>Marketplace</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.right}>
          <TouchableOpacity onPress={() => setRoleLauncherOpen(true)} activeOpacity={0.8} style={styles.dotsButton}>
            <Text style={styles.dotsText}>⠿</Text>
          </TouchableOpacity>
          {!isDesktop && (
            <TouchableOpacity onPress={onPressMarketplace} activeOpacity={0.75} style={{ marginRight: spacing.md }}>
              <Text style={[styles.navItem, styles.navItemActive]}>Marketplace</Text>
            </TouchableOpacity>
          )}
          <View style={styles.sessionPill}>
            <Text style={styles.sessionPillText}>Pilot Session</Text>
          </View>
        </View>
      </View>

      <RoleLauncher
        visible={roleLauncherOpen}
        currentRole="Pilot"
        onClose={() => setRoleLauncherOpen(false)}
        onSelectRole={(role: HawkRole) => {
          setRoleLauncherOpen(false);
          const map: Record<HawkRole, string> = {
            Customer: 'customer',
            'Fleet Manager': 'fleet',
            Pilot: 'pilot',
            'Sales Aggregator': 'sales',
            Technician: 'technician',
          };
          if (role !== 'Pilot') onSwitchRole?.(map[role]);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: COMMON_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.darkGreen,
    ...(Platform.select({ web: { position: 'fixed' as any, top: 0, left: 0, right: 0, zIndex: 20 }, default: {} }) as object),
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.mintGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { fontSize: 13, fontWeight: '800', color: colors.darkGreen },
  brand: { ...typography.caption, color: colors.textOnDark, letterSpacing: 1.2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  navItem: { ...typography.small, color: colors.textOnDarkMuted, textTransform: 'none' },
  navItemActive: { color: colors.mintGreen, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center' },
  dotsButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, backgroundColor: 'rgba(255,255,255,0.08)' },
  dotsText: { color: colors.mintGreen, fontSize: 22, lineHeight: 22, fontWeight: '800' },
  sessionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(183, 228, 199, 0.14)',
  },
  sessionPillText: { ...typography.caption, color: colors.mintGreen, textTransform: 'none' },
});

export default CommonHeader;
