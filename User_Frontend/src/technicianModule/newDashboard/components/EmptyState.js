import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

// Compact, polished empty-state block used across Home / Repairs / Earnings
// so absence of data never reads as a broken layout or dead whitespace.
export default function EmptyState({ title, message, icon }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconDot}>
        <Text style={styles.iconGlyph}>{icon || '—'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconGlyph: { color: colors.forestGreen, fontSize: 13 },
  title: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: 2 },
  message: { ...typography.caption, color: colors.textSecondary },
});
