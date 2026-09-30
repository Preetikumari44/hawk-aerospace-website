// src/components/StatusChip.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../theme/theme';

const TONE_MAP = {
  Active: { bg: COLORS.primaryLight, fg: COLORS.primary },
  Upcoming: { bg: '#E8EEFB', fg: COLORS.info },
  Completed: { bg: '#E8F6EC', fg: COLORS.success },
  Cancelled: { bg: '#FBEAEA', fg: COLORS.danger },
  Rejected: { bg: '#FBEAEA', fg: COLORS.danger },
  Pending: { bg: '#FFF4E5', fg: COLORS.warning },
};

export default function StatusChip({ status }) {
  const tone = TONE_MAP[status] || { bg: COLORS.border, fg: COLORS.textSecondary };
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.pill, alignSelf: 'flex-start' },
  text: { ...FONT.small, fontWeight: '700' },
});
