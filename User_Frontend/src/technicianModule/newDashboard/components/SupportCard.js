import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

export default function SupportCard({ data, onPress, compact }) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconGlyph}>☎</Text>
      </View>
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.text}>{data.text}</Text>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.cta}>{data.cta} →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.mintSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  compact: { padding: spacing.md },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconGlyph: { color: colors.white, fontSize: 14 },
  title: { ...typography.h3, color: colors.textPrimary },
  text: { ...typography.caption, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  cta: { ...typography.bodyMedium, color: colors.forestGreen },
});
