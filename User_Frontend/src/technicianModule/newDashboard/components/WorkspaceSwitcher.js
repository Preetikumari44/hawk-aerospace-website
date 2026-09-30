import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { workspaces, currentWorkspace } from '../data/technicianData';

// Popover (not a full page) opened from the header's workspace/grid icon.
// When `inline` is true, the caller (Header) is already positioning this
// inside an absolutely positioned anchor View, so this renders without
// its own absolute positioning to avoid double-offsetting.
export default function WorkspaceSwitcher({ onClose, onSelect, inline }) {
  return (
    <View style={[styles.popup, inline && styles.popupInline]}>
      <Text style={styles.title}>Hawk Aerospace Workspaces</Text>
      <View style={styles.grid}>
        {workspaces.map((w) => {
          const active = w.id === currentWorkspace;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.tile, active && styles.tileActive]}
              activeOpacity={0.8}
              onPress={() => {
                onSelect && onSelect(w);
                onClose && onClose();
              }}
            >
              <Text style={[styles.tileIcon, active && styles.tileIconActive]}>{w.icon}</Text>
              <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>{w.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 260,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 30,
  },
  popupInline: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    backgroundColor: colors.mintSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tileActive: { backgroundColor: colors.forestGreen },
  tileIcon: { fontSize: 18, color: colors.forestGreen, marginBottom: 4 },
  tileIconActive: { color: colors.mint },
  tileLabel: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
  tileLabelActive: { color: colors.white, fontWeight: '700' },
});
