import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { PromoOffer } from '../types';

// Restrained, on-brand accent tones layered over the existing Hawk palette —
// no unrelated/neon colors, per the design brief.
const TONES: Record<PromoOffer['tone'], { bg: string; badgeBg: string; badgeFg: string; title: string }> = {
  green: { bg: colors.forestGreen, badgeBg: colors.mintGreen, badgeFg: colors.darkGreen, title: colors.mintGreen },
  amber: { bg: '#8A5A22', badgeBg: '#F2D9A8', badgeFg: '#6B4315', title: '#F6E3BE' },
  blue: { bg: '#264A63', badgeBg: '#CFE4F2', badgeFg: '#1D3A4D', title: '#CFE4F2' },
};

const PromoCard: React.FC<{ offer: PromoOffer; onPress?: () => void }> = ({ offer, onPress }) => {
  const tone = TONES[offer.tone];
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: tone.bg }]} activeOpacity={0.88} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: tone.badgeBg }]}>
        <Text style={[styles.badgeText, { color: tone.badgeFg }]}>{offer.badge}</Text>
      </View>
      <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>{offer.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{offer.subtitle}</Text>
      <Text style={styles.cta} numberOfLines={1}>{offer.ctaLabel} →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 176,
    borderRadius: radii.md,
    padding: spacing.sm,
    ...(shadow.card as object),
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.pill, marginBottom: 4 },
  badgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  title: { ...typography.smallMedium, fontSize: 15, marginBottom: 1 },
  subtitle: { fontSize: 10, color: colors.textOnDarkMuted, marginBottom: 4 },
  cta: { fontSize: 11, fontWeight: '700', color: colors.textOnDark },
});

export default PromoCard;
