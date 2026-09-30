import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import SupportCard from './SupportCard';
import { supportCard } from '../data/marketplaceData';

const WORKSPACE_ITEMS = [
  { key: 'Home', glyph: '🏠' },
  { key: 'Repairs', glyph: '🔧' },
  { key: 'Earnings', glyph: '₹' },
];

const MORE_ITEMS = [
  { key: 'Marketplace', glyph: '🛍' },
];

// Replaces the desktop/tablet sidebar on mobile — same Home/Repairs/
// Earnings destinations, plus a quick link to Marketplace since the
// header's center nav row is hidden at this width, and the same compact
// Support card the sidebar shows on desktop/tablet. Notifications,
// workspace switcher and profile stay reachable from the header itself.
export default function MobileDrawer({ visible, active, onClose, onSelect }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.panelContent}>
            <View>
              <Text style={styles.brand}>HAWK AEROSPACE</Text>
              <Text style={styles.workspace}>Technician Workspace</Text>
              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Workspace</Text>
              {WORKSPACE_ITEMS.map((item) => {
                const isActive = active === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => { onSelect(item.key); onClose(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.glyph, isActive && styles.glyphActive]}>{item.glyph}</Text>
                    <Text style={[styles.label, isActive && styles.labelActive]}>{item.key}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.sectionLabel}>More</Text>
              {MORE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.item}
                  onPress={() => { onSelect(item.key); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.glyph}>{item.glyph}</Text>
                  <Text style={styles.label}>{item.key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.supportWrap}>
              <SupportCard data={supportCard} compact />
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, flexDirection: 'row' },
  panel: {
    width: 260,
    height: '100%',
    backgroundColor: colors.white,
  },
  panelContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  supportWrap: { marginTop: spacing.lg },
  brand: { ...typography.caption, color: colors.forestGreen, fontWeight: '700', letterSpacing: 0.5 },
  workspace: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  sectionLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.xs,
  },
  itemActive: { backgroundColor: colors.mintSoft },
  glyph: { fontSize: 15, marginRight: spacing.sm, color: colors.textSecondary, width: 20, textAlign: 'center' },
  glyphActive: { color: colors.forestGreen },
  label: { ...typography.bodyMedium, color: colors.textSecondary },
  labelActive: { color: colors.forestGreen, fontWeight: '700' },
});
