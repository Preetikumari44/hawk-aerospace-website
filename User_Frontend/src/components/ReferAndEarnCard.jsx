import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useLanguage } from '../i18n';

const CARD_GAP = 16;
const SIDE_PADDING = 20;
const IS_WEB = Platform.OS === 'web';
const WEB_MAX_CARD_WIDTH = 420;
const WEB_MAX_CARD_HEIGHT = 200;

/**
 * Refer & Earn carousel card — first cell in every Promotions & Offers strip.
 * Same geometry as PromoCard so it drops into existing horizontal ScrollViews.
 * onPress → navigate to the ReferAndEarnScreen (code generation happens there).
 */
const ReferAndEarnCard = ({ layout = 'carousel', onPress }) => {
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const visibleArea = windowWidth - SIDE_PADDING * 2;
  const visibleCards = windowWidth < 380 ? 1.35 : windowWidth < 480 ? 1.5 : 1.75;
  let numericCardWidth =
    layout === 'carousel'
      ? Math.max(200, Math.round((visibleArea - CARD_GAP * (visibleCards - 1)) / visibleCards))
      : visibleArea;
  if (IS_WEB) numericCardWidth = Math.min(numericCardWidth, WEB_MAX_CARD_WIDTH);
  const cardWidthStyle = layout === 'carousel' ? numericCardWidth : '100%';
  let cardHeight = layout === 'carousel' ? Math.max(128, Math.round(numericCardWidth * 0.56)) : 150;
  if (IS_WEB) cardHeight = Math.min(cardHeight, WEB_MAX_CARD_HEIGHT);
  const marginSpacing = layout === 'carousel' ? { marginRight: CARD_GAP } : { marginBottom: CARD_GAP };
  const isCompact = numericCardWidth < 230;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width: cardWidthStyle, height: cardHeight }, marginSpacing]}
    >
      <View style={[styles.badge, isCompact && styles.badgeCompact]}>
        <Text style={[styles.badgeText, isCompact && styles.badgeTextCompact]}>
          {t('● REFER & EARN')}
        </Text>
      </View>
      <Text style={[styles.bigText, isCompact && styles.bigTextCompact]}>{t('Invite, Earn ₹')}</Text>
      <Text style={[styles.subTitle, isCompact && styles.subTitleCompact]} numberOfLines={1}>
        {t('Share your link, earn credits')}
      </Text>
      <View style={styles.bottomRow}>
        <View style={[styles.cta, isCompact && styles.ctaCompact]}>
          <Text style={[styles.ctaText, isCompact && styles.ctaTextCompact]} numberOfLines={1}>
            {t('Refer Now →')}
          </Text>
        </View>
        <View style={[styles.circle, isCompact && styles.circleCompact]}>
          <Text style={[styles.circleText, isCompact && styles.circleTextCompact]}>
            {t('₹')}
            {'\n'}
            {t('EARN')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: '#1B2A6B',
    borderWidth: 1,
    borderColor: '#3B4FA3',
  },
  badge: {
    backgroundColor: '#F5A623',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '500', color: '#1E2336' },
  badgeTextCompact: { fontSize: 8 },
  bigText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginTop: 2 },
  bigTextCompact: { fontSize: 16, marginTop: 1 },
  subTitle: { fontSize: 12, fontWeight: '700', color: '#C7D2FE' },
  subTitleCompact: { fontSize: 10.5 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 6 },
  cta: { backgroundColor: '#F5A623', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 1 },
  ctaCompact: { paddingHorizontal: 9, paddingVertical: 4.5 },
  ctaText: { fontSize: 11, fontWeight: '600', color: '#0B0F19' },
  ctaTextCompact: { fontSize: 10 },
  circle: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,166,35,0.15)', flexShrink: 0,
  },
  circleCompact: { width: 32, height: 32, borderRadius: 16 },
  circleText: { fontSize: 9, fontWeight: '900', color: '#F5A623', textAlign: 'center', lineHeight: 11 },
  circleTextCompact: { fontSize: 8, lineHeight: 9.5 },
});

export default ReferAndEarnCard;
