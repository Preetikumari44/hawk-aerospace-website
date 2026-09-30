// src/components/Sidebar.js
// Main nav: Home, Bookings, Commission — nothing else (no Account, no
// Marketplace, no Solutions/Technology/Platforms; those live in the
// header). Support is pinned to the very bottom of the sidebar via
// `marginTop: 'auto'` on its wrapper, so it stays at the bottom
// regardless of viewport height.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../theme/theme';
import { useNavigation } from '../navigation/NavigationContext';
import { IconHome, IconBookings, IconCommission } from './icons';
import { support } from '../data/supportData';

export const SIDEBAR_ITEMS = [
  { key: 'Home', label: 'Home', Icon: IconHome, route: 'SalesAggregatorDashboard' },
  { key: 'Bookings', label: 'Bookings', Icon: IconBookings, route: 'Bookings' },
  { key: 'Commission', label: 'Commission', Icon: IconCommission, route: 'Commission' },
];

export default function Sidebar() {
  const { routeName, navigate } = useNavigation();

  const handleSupportPress = () => {
    const msg = `${support.title}\n\nCall ${support.phone}\nor email ${support.email}`;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      window.alert(msg);
    }
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>H</Text></View>
        <View>
          <Text style={styles.brand}>Hawk Aerospace</Text>
          <Text style={styles.role}>Sales Aggregator</Text>
        </View>
      </View>

      <View style={styles.navList}>
        {SIDEBAR_ITEMS.map((item) => {
          const active = item.route === routeName;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => navigate(item.route)}
            >
              <item.Icon size={16} color={active ? COLORS.textInverse : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.navLabel, active && styles.navTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Support — pinned to the bottom of the sidebar */}
      <View style={styles.supportWrap}>
        <Text style={styles.needHelp}>Need help?</Text>
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>{support.title}</Text>
          <Text style={styles.supportSubtitle}>{support.subtitle}</Text>
          <TouchableOpacity onPress={handleSupportPress}>
            <Text style={styles.supportCta}>{support.ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 200, backgroundColor: COLORS.primaryDark, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md, flexDirection: 'column' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  logoMark: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { color: COLORS.textInverse, fontWeight: '700', fontSize: 13 },
  brand: { color: COLORS.textInverse, fontWeight: '700', fontSize: 13 },
  role: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  navList: { gap: SPACING.xs },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderRadius: RADIUS.sm },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  navLabel: { color: 'rgba(255,255,255,0.7)', ...FONT.body },
  navTextActive: { color: COLORS.textInverse, fontWeight: '600' },

  // marginTop: 'auto' pushes this block to the bottom of the flex column
  // regardless of sidebar/viewport height.
  supportWrap: { marginTop: 'auto' },
  needHelp: { color: 'rgba(255,255,255,0.6)', ...FONT.small, marginBottom: SPACING.xs },
  supportCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  supportTitle: { color: COLORS.textInverse, ...FONT.h3 },
  supportSubtitle: { color: 'rgba(255,255,255,0.75)', ...FONT.small, lineHeight: 16 },
  supportCta: { color: '#7BE2A8', ...FONT.h3, marginTop: SPACING.xs },
});
