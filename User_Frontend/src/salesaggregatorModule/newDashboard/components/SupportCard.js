// src/components/SupportCard.js
// Dashboard's existing 24x7 Expert Support section — content unchanged.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../theme/theme';
import { support } from '../data/supportData';

export default function SupportCard({ compact = true }) {
  const handlePress = () => {
    // eslint-disable-next-line no-alert
    window.alert(`${support.title}\n\nCall ${support.phone}\nor email ${support.email}`);
  };

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{support.title}</Text>
        <Text style={styles.subtitle}>{support.subtitle}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handlePress}>
        <Text style={styles.btnText}>{support.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#4A4E8C', borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  compact: { paddingVertical: SPACING.sm },
  textWrap: { flex: 1 },
  title: { color: COLORS.textInverse, ...FONT.h3 },
  subtitle: { color: 'rgba(255,255,255,0.85)', ...FONT.small, marginTop: 2 },
  btn: { backgroundColor: COLORS.textInverse, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  btnText: { color: '#4A4E8C', ...FONT.h3 },
});
