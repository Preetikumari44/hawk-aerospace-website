import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import CartIcon from '../../assets/CartIcon.svg';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const CARD_GAP = 16;
const SIDE_PADDING = 20;
const IS_WEB = Platform.OS === 'web';
const WEB_MAX_CARD_WIDTH = 420;
const WEB_MAX_CARD_HEIGHT = 200;

interface PromoCardProps {
    layout?: 'carousel' | 'list';
}

const PromoCard: React.FC<PromoCardProps> = ({ layout = 'carousel' }) => {
    const { t } = useLanguage();
    const { width: windowWidth } = useWindowDimensions();
    const visibleArea = windowWidth - SIDE_PADDING * 2;
    
    // Adapt visible cards dynamically based on screen width
    const visibleCards = windowWidth < 380 ? 1.35 : (windowWidth < 480 ? 1.5 : 1.75);
    let numericCardWidth = layout === 'carousel'
        ? Math.max(200, Math.round((visibleArea - CARD_GAP * (visibleCards - 1)) / visibleCards))
        : visibleArea;
    
    // Cap card width on web for larger screens
    if (IS_WEB) {
        numericCardWidth = Math.min(numericCardWidth, WEB_MAX_CARD_WIDTH);
    }
    
    const cardWidthStyle = layout === 'carousel' ? numericCardWidth : '100%';
    
    // Enforce a minimum card height so text, button, and badge circle never clip vertically
    let cardHeight = layout === 'carousel'
        ? Math.max(128, Math.round(numericCardWidth * 0.56))
        : 150;
    
    // Cap card height on web for larger screens
    if (IS_WEB) {
        cardHeight = Math.min(cardHeight, WEB_MAX_CARD_HEIGHT);
    }
    
    const marginSpacing = layout === 'carousel' ? { marginRight: CARD_GAP } : { marginBottom: CARD_GAP };
    
    const isCompact = numericCardWidth < 230;

    return (
        <View style={[styles.promoCard, { width: cardWidthStyle, height: cardHeight }, marginSpacing]}>
            <Image source={require('../../assets/PromoCardType01.png')} style={styles.promoBgImage} resizeMode="cover" />
            <CrossPlatformGradient
                colors={['rgba(255, 255, 255, 0.23)', 'rgba(11, 59, 30, 0.65)']}
                style={StyleSheet.absoluteFill} children={undefined}
            />
            <View style={[styles.offerBadgePill, isCompact && styles.offerBadgePillCompact]}>
                <Text style={[styles.offerBadgeText, isCompact && styles.offerBadgeTextCompact]}>{t('● AGRI OFFER')}</Text>
            </View>
            <Text style={[styles.promoBigText, isCompact && styles.promoBigTextCompact]}>{t('10% OFF')}</Text>
            <Text style={[styles.promoSubTitle, isCompact && styles.promoSubTitleCompact]} numberOfLines={1}>{t('Your First Spray Mission')}</Text>
            {/*<View style={styles.promoCartRow}>
                <CartIcon width={12} height={12} fill="#A7F3D0" color="#A7F3D0" style={{ marginRight: 4 }} />
                <Text style={styles.promoCartText} numberOfLines={1}>{t('Applied automatically on checkout')}</Text>
            </View>*/}
            <View style={styles.promoBottomFlex}>
                <TouchableOpacity style={[styles.redeemBtn, isCompact && styles.redeemBtnCompact]} activeOpacity={0.85}>
                    <Text style={[styles.redeemBtnText, isCompact && styles.redeemBtnTextCompact]} numberOfLines={1}>{t('Redeem Now →')}</Text>
                </TouchableOpacity>
                <View style={[styles.discountCircleBadge, isCompact && styles.discountCircleBadgeCompact]}>
                    <Text style={[styles.discountCircleText, isCompact && styles.discountCircleTextCompact]}>{t('10%')}{"\n"}{t('OFF')}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    promoCard: { borderRadius: 20, overflow: 'hidden', padding: 12, justifyContent: 'space-between' },
    promoBgImage: { ...StyleSheet.absoluteFill, width: '120%', height: '180%' },
    promoDarkOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11, 59, 30, 0.65)' },
    offerBadgePill: { backgroundColor: '#F5A623', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    offerBadgePillCompact: { paddingHorizontal: 8, paddingVertical: 3 },
    offerBadgeText: { fontSize: 9, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E2336' },
    offerBadgeTextCompact: { fontSize: 8 },
    promoBigText: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginTop: 2 },
    promoBigTextCompact: { fontSize: 16, marginTop: 1 },
    promoSubTitle: { fontSize: 12, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#FFFFFF' },
    promoSubTitleCompact: { fontSize: 10.5 },
    promoCartRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    promoCartText: { fontSize: 11, fontFamily: 'Roboto-Regular', color: '#A7F3D0' },
    promoBottomFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 6 },
    redeemBtn: { backgroundColor: '#F5A623', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 1 },
    redeemBtnCompact: { paddingHorizontal: 9, paddingVertical: 4.5 },
    redeemBtnText: { fontSize: 11, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#0B0F19' },
    redeemBtnTextCompact: { fontSize: 10 },
    discountCircleBadge: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 59, 30, 0.5)', flexShrink: 0 },
    discountCircleBadgeCompact: { width: 32, height: 32, borderRadius: 16 },
    discountCircleText: { fontSize: 9, fontFamily: 'Roboto-Medium', fontWeight: '900', color: '#F5A623', textAlign: 'center', lineHeight: 11 },
    discountCircleTextCompact: { fontSize: 8, lineHeight: 9.5 },
});

export default PromoCard;