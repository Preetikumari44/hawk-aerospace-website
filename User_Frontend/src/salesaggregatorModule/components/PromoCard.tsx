import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Platform, useWindowDimensions } from 'react-native';
import CartIcon from '../../assets/CartIcon.svg';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

// WEB ONLY: cap the carousel card so it can never exceed the visible content
// area on large monitors. Native keeps the original PEEK_WIDTH behaviour.
const IS_WEB = Platform.OS === 'web';
const WEB_MAX_CARD_WIDTH = 420;
const WEB_MAX_CARD_HEIGHT = 200;

interface PromoCardProps {
    layout?: 'carousel' | 'list';
}

const PromoCard: React.FC<PromoCardProps> = ({ layout = 'carousel' }) => {
    const { t, locale } = useLanguage();
    const { width: windowWidth } = useWindowDimensions();
    const cardWidth: number = layout === 'carousel'
        ? (IS_WEB ? Math.min(windowWidth * 0.82, WEB_MAX_CARD_WIDTH) : PEEK_WIDTH)
        : Math.round(windowWidth);
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    return (
        <View style={[styles.promoCard, { width: cardWidth }, marginSpacing]}>
            <Image source={require('../../assets/PromoCardType01.png')} style={styles.promoBgImage} resizeMode="cover" />
            <CrossPlatformGradient
                colors={['rgba(255, 255, 255, 0.23)', 'rgba(11, 59, 30, 0.65)']}
                style={StyleSheet.absoluteFill} children={undefined}
            />

            <View style={styles.offerBadgePill}>
                <Text style={styles.offerBadgeText}>{t('● AGRI OFFER')}</Text>
            </View>
            <Text style={styles.promoBigText}>{t('10% OFF')}</Text>
            <Text style={styles.promoSubTitle}>{t('Your First Spray Mission')}</Text>
            <View style={styles.promoCartRow}>
                <CartIcon width={14} height={14} fill="#A7F3D0" color="#A7F3D0" style={{ marginRight: 6 }} />
                <Text style={styles.promoCartText}>{t('Applied automatically on checkout')}</Text>
            </View>
            <View style={styles.promoBottomFlex}>
                <TouchableOpacity style={styles.redeemBtn} activeOpacity={0.85}>
                    <Text style={styles.redeemBtnText}>{t('Redeem Now →')}</Text>
                </TouchableOpacity>
                <View style={styles.discountCircleBadge}>
                    <Text style={styles.discountCircleText}>{t('10%')}{"\n"}{t('OFF')}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    promoCard: { height: IS_WEB ? Math.min(230, WEB_MAX_CARD_HEIGHT) : 230, borderRadius: 28, overflow: 'hidden', padding: 20, justifyContent: 'space-between' },
    promoBgImage: { ...StyleSheet.absoluteFill, width: 360, height: 280, opacity: 1 },
    promoDarkOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(11, 59, 30, 0.65)' },
    offerBadgePill: { backgroundColor: '#F5A623', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
    offerBadgeText: { fontSize: 10, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E2336' },
    promoBigText: { fontSize: 44, fontFamily: 'Roboto-Medium', fontWeight: '900', color: '#FFFFFF', letterSpacing: -1, marginTop: 4 },
    promoSubTitle: { fontSize: 17, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    promoCartRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    promoCartText: { fontSize: 13, fontFamily: 'Roboto-Regular', color: '#A7F3D0' },
    promoBottomFlex: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
    redeemBtn: { backgroundColor: '#F5A623', borderRadius: 100, paddingHorizontal: 18, paddingVertical: 10 },
    redeemBtnText: { fontSize: 14, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#0B0F19' },
    discountCircleBadge: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 59, 30, 0.5)' },
    discountCircleText: { fontSize: 11, fontFamily: 'Roboto-Medium', fontWeight: '900', color: '#F5A623', textAlign: 'center' },
});

export default PromoCard;