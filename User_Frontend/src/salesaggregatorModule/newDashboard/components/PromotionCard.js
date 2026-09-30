// src/components/PromotionCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../theme/theme';

export default function PromotionCard({ badge, title, subtitle, ctaLabel = 'Redeem Now →', tone = 'green' }) {
  const bg = tone === 'amber' ? COLORS.amber : COLORS.primaryDark;

  const handlePress = () => {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n"${subtitle}" has been applied to your account.`);
  };

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      <TouchableOpacity onPress={handlePress}>
        <Text style={styles.cta}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 190, borderRadius: RADIUS.md, padding: SPACING.sm, justifyContent: 'space-between', minHeight: 92 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginBottom: SPACING.xs },
  badgeText: { color: COLORS.textInverse, fontSize: 10, fontWeight: '700' },
  title: { color: COLORS.textInverse, fontSize: 15, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', ...FONT.small, marginTop: 2, marginBottom: SPACING.xs },
  cta: { color: COLORS.textInverse, ...FONT.h3 },
});
