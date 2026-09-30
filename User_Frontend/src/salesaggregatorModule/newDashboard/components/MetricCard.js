// src/components/MetricCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../theme/theme';

export default function MetricCard({ icon, label, value, tint = COLORS.primaryLight, valueColor = COLORS.textPrimary }) {
  return (
    <View style={styles.card}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: tint }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    minWidth: 140, gap: SPACING.sm,
  },
  iconWrap: { width: 30, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 14 },
  textWrap: { flexShrink: 1 },
  label: { ...FONT.small, color: COLORS.textSecondary },
  value: { ...FONT.value },
});
