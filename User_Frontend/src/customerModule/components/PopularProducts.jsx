import React from 'react';
import { ActivityIndicator, View, Text, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';

import ProductCard from './ProductCard';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

const CARD_GAP = 14;
const SIDE_PADDING = 20;
const IS_WEB = Platform.OS === 'web';
const WEB_MAX_CARD_WIDTH = 280;

const PopularProducts = ({ products = [], onViewAll, onSelectProduct, loading }) => {
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const visibleArea = windowWidth - SIDE_PADDING * 2;
  const visibleCards = windowWidth < 380 ? 1.85 : 2.2;
  let cardWidth = Math.max(155, Math.round((visibleArea - CARD_GAP * (visibleCards - 1)) / visibleCards));
  // Cap card width on web for larger screens
  if (IS_WEB) {
    cardWidth = Math.min(cardWidth, WEB_MAX_CARD_WIDTH);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('Popular Products')}</Text>
        <Text style={styles.viewAll} onPress={onViewAll}>{t('View All')}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5060D3" />
          <Text style={styles.loadingText}>{t('Loading products...')}</Text>
        </View>
      ) : (
        <View style={styles.carouselViewport}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
          >
            {products.slice(0, 5).map((product) => (
              <ProductCard
                key={product.productId || product.id || product.title}
                image={require('../assets/images/fertilizer.png')}
                title={product.productName || product.name || product.title || t('Marketplace Product')}
                price={product.price ?? product.startingPrice ?? '0'}
                cardWidth={cardWidth}
                onPress={() => onSelectProduct?.(product)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  heading: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    color: '#2F3542',
    fontWeight: '500',
    paddingLeft: 20
  },
  viewAll: {
    ...TYPOGRAPHY.labelLargeEmphasized,
    color: '#6B7280',
  },
  carouselViewport: {
    //paddingRight: 20,
  },
  carouselContent: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default PopularProducts;