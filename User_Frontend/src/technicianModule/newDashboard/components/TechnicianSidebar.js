import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import SupportCard from './SupportCard';
import { supportCard } from '../data/marketplaceData';

// Technician sidebar: Home, Repairs, Earnings up top, compact 24x7
// Support pinned to the bottom. Shown on desktop (full) and tablet
// (collapsed to icon-only, Support hidden to save space); on mobile
// it's replaced by MobileDrawer.
const ITEMS = [
  { key: 'Home', glyph: '🏠' },
  { key: 'Repairs', glyph: '🔧' },
  { key: 'Earnings', glyph: '₹' },
];

export default function TechnicianSidebar({ active, onSelect, collapsed, onSupportPress }) {
  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      <View style={styles.top}>
        {!collapsed ? (
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>HAWK AEROSPACE</Text>
            <Text style={styles.workspace}>Technician Workspace</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        {ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.item,
                collapsed && styles.itemCollapsed,
                isActive && styles.itemActive,
              ]}
              onPress={() => onSelect(item.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.glyph, isActive && styles.glyphActive]}>{item.glyph}</Text>
              {!collapsed ? (
                <Text style={[styles.label, isActive && styles.labelActive]}>{item.key}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {!collapsed ? (
        <View style={styles.bottom}>
          <SupportCard data={supportCard} onPress={onSupportPress} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  sidebarCollapsed: {
    width: 60,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  top: { width: '100%' },
  bottom: { width: '100%' },
  brandBlock: { marginBottom: spacing.md },
  brand: { ...typography.caption, color: colors.forestGreen, fontWeight: '700', letterSpacing: 0.5 },
  workspace: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md, width: '100%' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    width: '100%',
  },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  itemActive: { backgroundColor: colors.mintSoft },
  glyph: { fontSize: 14, marginRight: spacing.sm, color: colors.textSecondary, width: 18, textAlign: 'center' },
  glyphActive: { color: colors.forestGreen },
  label: { ...typography.bodyMedium, color: colors.textSecondary },
  labelActive: { color: colors.forestGreen, fontWeight: '700' },
});
