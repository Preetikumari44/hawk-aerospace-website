import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import SupportCard from '../components/SupportCard';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { useCart } from '../store/cartStore';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const getProductId = (product) => product.productId || product.id;

const CartScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
    const { t } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const { items, total, removeFromCart, updateCartQuantity, clearCart } = useCart();

    const handleCheckout = () => {
        if (!items.length) return;
        onNavigate('PaymentSelectionScreen', {
            mode: 'marketplace',
            source: 'cart',
            items: items.map((item) => ({ product: item.product, quantity: item.quantity })),
            total,
        });
    };

    return (
        <ScreenContainer backgroundColor="#FAFAFA">
            <View style={styles.header}>
                <Pressable onPress={() => onNavigate('Back')}>
                    <ArrowBackwardIcon width={28} height={28} />
                </Pressable>
                <Text style={styles.heading}>{t('Your Cart')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
                {items.map((item) => {
                    const product = item.product;
                    const id = getProductId(product);
                    const price = Number(product.price || product.startingPrice || 0);

                    return (
                        <View key={id} style={styles.cartCard}>
                            <Image
                                source={require('../assets/images/fertilizer.png')}
                                style={styles.productImage}
                                resizeMode="cover"
                            />

                            <View style={styles.cartInfo}>
                                <View>
                                    <Text style={styles.productTitle} numberOfLines={2}>
                                        {product.productName || t('Marketplace Product')}
                                    </Text>
                                    <Text style={styles.priceText}>{t('INR {{price}}', { price })}</Text>
                                </View>

                                <View style={styles.bottomRow}>
                                    <View style={styles.quantityStepper}>
                                        <Pressable
                                            style={styles.stepperButton}
                                            onPress={() => updateCartQuantity(id, item.quantity - 1)}
                                        >
                                            <Text style={styles.stepperText}>-</Text>
                                        </Pressable>
                                        <Text style={styles.quantityValue}>{item.quantity}</Text>
                                        <Pressable
                                            style={styles.stepperButton}
                                            onPress={() => updateCartQuantity(id, item.quantity + 1)}
                                        >
                                            <Text style={styles.stepperText}>+</Text>
                                        </Pressable>
                                    </View>

                                    <Pressable onPress={() => removeFromCart(id)}>
                                        <Text style={styles.removeText}>{t('Remove')}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {!items.length && (
                    <View style={styles.emptyState}>
                        <Text style={styles.productTitle}>{t('Your cart is empty')}</Text>
                        <Text style={styles.emptySubtext}>
                            {t('Items you add to cart from the marketplace will appear here.')}
                        </Text>
                        <Pressable style={styles.browseButton} onPress={() => onNavigate('Marketplace')}>
                            <Text style={styles.browseButtonText}>{t('Browse Marketplace')}</Text>
                        </Pressable>
                    </View>
                )}

                {!!items.length && (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('Total')}</Text>
                            <Text style={styles.summaryValue}>{t('INR {{amount}}', { amount: total })}</Text>
                        </View>
                    </View>
                )}

                <SupportCard onNavigate={onNavigate} />
            </ScrollView>

            {!!items.length && (
                <View style={styles.checkoutBar}>
                    <Pressable
                        style={styles.checkoutButton}
                        onPress={handleCheckout}
                    >
                        <Text style={styles.checkoutButtonText}>
                            {t('Checkout • INR {{total}}', { total })}
                        </Text>
                    </Pressable>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    heading: { marginLeft: 16, fontSize: 20, fontWeight: '700', color: '#2F3542' },
    content: {
        //paddingHorizontal: 20,
        paddingBottom: 120
    },
    cartCard: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    productImage: {
        width: 110,
        height: 100,
        borderRadius: 16,
    },
    cartInfo: {
        flex: 1,
        marginLeft: 14,
        height: 100,
        justifyContent: 'space-between',
    },
    productTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    priceText: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 32,
    },
    stepperButton: {
        paddingHorizontal: 6,
    },
    stepperText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
    },
    quantityValue: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
        marginHorizontal: 8,
    },
    removeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#DC2626',
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        marginHorizontal: 20,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    browseButton: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    browseButtonText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        marginHorizontal: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2F3542',
    },
    checkoutBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        backgroundColor: '#FAFAFA',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    checkoutButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkoutButtonDisabled: {
        opacity: 0.6,
    },
    checkoutButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default CartScreen;