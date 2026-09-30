import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

const RANGES = ['Last 1 year', 'Last 6 months', 'Last 30 days'];
const AXIS_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// Looks like a real analytics component (axis, grid, labels) even while
// the account has no earnings data yet — never fabricates values.
export default function EarningsGraph({ graph }) {
  const [range, setRange] = useState(graph.defaultRange || RANGES[0]);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Earnings Graph</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.7}>
          <Text style={styles.dropdownText}>{range}</Text>
          <Text style={styles.dropdownCaret}>{open ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {open ? (
        <View style={styles.menu}>
          {RANGES.map((r) => (
            <TouchableOpacity key={r} style={styles.menuItem} onPress={() => { setRange(r); setOpen(false); }}>
              <Text style={styles.menuItemText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.chartArea}>
        {[0, 1, 2, 3].map((row) => (
          <View key={row} style={styles.gridLine} />
        ))}
        {!graph.hasData ? (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyText}>{graph.emptyMessage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.axisRow}>
        {AXIS_LABELS.map((l, i) => (
          <Text key={i} style={styles.axisLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dropdownText: { ...typography.caption, color: colors.textPrimary, marginRight: 6 },
  dropdownCaret: { fontSize: 9, color: colors.forestGreen },
  menu: {
    position: 'absolute',
    top: 34,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  menuItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  menuItemText: { ...typography.caption, color: colors.textPrimary },
  chartArea: {
    height: 90,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  gridLine: { height: 1, backgroundColor: colors.border },
  emptyOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.caption, color: colors.textMuted },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
});
