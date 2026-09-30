import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import SupportCard from '../components/SupportCard';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import SearchIcon from '../assets/Icons_V02/Icons/SearchIcon.svg';
import CheckIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';
import StarIcon from '../assets/Icons_V02/Icons/StarIcon.svg';
import { getExpectedDeliveryDate } from '../../utils/locationFormat';
import { useCart } from '../store/cartStore';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const ProductDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const product = routeParams?.product || {};
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  const handleBuyNow = () => {
    onNavigate('PaymentSelectionScreen', {
      mode: 'marketplace',
      source: 'buy_now',
      product,
      quantity,
      total: Number(product.price || product.startingPrice || 0) * quantity,
    });
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')} style={styles.backButton}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <View style={styles.searchContainer}>
          <TextInput placeholder={t('Search marketplace')} style={styles.searchInput} />
          <SearchIcon width={24} height={24} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <Text style={styles.productTitle}>{product.productName || product.title || t('Marketplace Product')}</Text>
        <Text style={styles.productDesc}>
          {product.description || product.shortDescription || t('Product details from marketplace API')}
        </Text>

        <Image source={require('../assets/images/fertilizer.png')} style={styles.productImage} resizeMode="cover" />

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <CheckIcon width={14} height={14} />
            <Text style={styles.badgeText}>{t('API Product')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t(product.category) || t('Marketplace')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.vendorId || t('Vendor assigned')}</Text>
          </View>
        </View>

        <View style={styles.ratingRow}>
          <StarIcon width={20} height={20} />
          <Text style={styles.ratingText}> {product.rating || t('Rating unavailable')}</Text>
        </View>

        <Text style={styles.priceLabel}>{t('Starting from')}</Text>
        <Text style={styles.priceValue}>{t('INR {{price}}', { price: product.price || product.startingPrice || 0 })}</Text>

        <Text style={styles.sectionLabel}>{t('Quantity')}</Text>
        <View style={styles.quantityDropdown}>
          <Pressable onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}>
            <Text style={styles.quantityText}>-</Text>
          </Pressable>
          <Text style={styles.quantityText}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((prev) => prev + 1)}>
            <Text style={styles.quantityText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.totalPrice}>{t('Total: INR {{total}}', { total: Number(product.price || product.startingPrice || 0) * quantity })}</Text>
        <Text style={styles.estimatedDelivery}>
          {t('Estimated delivery:')} <Text style={{ fontWeight: '700' }}>{product.deliveryDate || getExpectedDeliveryDate(null, locale)}</Text>
        </Text>

        <View style={styles.actionButtons}>
          <Pressable style={styles.addToCartButton} onPress={handleAddToCart}>
            <Text style={styles.addToCartText}>{addedToCart ? t('Added ✓') : t('Add to cart')}</Text>
          </Pressable>
          <Pressable style={styles.buyNowButton} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>{t('Buy Now')}</Text>
          </Pressable>
        </View>

        <SupportCard onNavigate={onNavigate} />
      </ScrollView>
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
  backButton: { marginRight: 12 },
  searchContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#374151' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  productTitle: { fontSize: 18, fontWeight: '700', color: '#374151', lineHeight: 26 },
  productDesc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18, marginBottom: 16 },
  productImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151', marginLeft: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ratingText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  priceLabel: { fontSize: 14, color: '#6B7280' },
  priceValue: { fontSize: 24, fontWeight: '700', color: '#374151', marginBottom: 20 },
  sectionLabel: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  quantityDropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  quantityText: { fontSize: 15, color: '#374151' },
  totalPrice: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
  estimatedDelivery: { fontSize: 14, color: '#4B5563', marginBottom: 24 },
  actionButtons: { gap: 12, marginBottom: 30 },
  addToCartButton: {
    borderWidth: 1.5,
    borderColor: '#374151',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  buyNowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyNowText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default ProductDetailsScreen;