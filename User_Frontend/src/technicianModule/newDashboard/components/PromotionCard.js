import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

export default function PromotionCard({ promotion, onRedeem }) {
  return (
    <View style={styles.card}>
      <View style={styles.circle}>
        <Text style={styles.circleText}>{promotion.discountLabel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.badge}>{promotion.badge}</Text>
        <Text style={styles.title}>{promotion.title}</Text>
        <TouchableOpacity onPress={() => onRedeem && onRedeem(promotion)} activeOpacity={0.7}>
          <Text style={styles.cta}>{promotion.cta} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.forestGreen,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  circleText: { ...typography.caption, color: colors.forestGreenDark, fontWeight: '700' },
  badge: { ...typography.caption, color: colors.mint, letterSpacing: 0.5 },
  title: { ...typography.h3, color: colors.white, marginTop: 2, marginBottom: 4 },
  cta: { ...typography.bodyMedium, color: colors.mint },
});
