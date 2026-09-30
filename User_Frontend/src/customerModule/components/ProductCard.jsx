import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';

import COLORS from '../constants/colors';
import { useLanguage } from '../../i18n';

const IS_WEB = Platform.OS === 'web';
const WEB_MAX_CARD_WIDTH = 280;

const ProductCard = ({ image, title, price, cardWidth = 220, onPress }) => {
  const { t, locale } = useLanguage();
  const isCompact = cardWidth < 170;
  const finalWidth = IS_WEB ? Math.min(cardWidth, WEB_MAX_CARD_WIDTH) : cardWidth;

  return (
    <Pressable style={[styles.card, { width: finalWidth, marginRight: 14 }]} onPress={onPress}>
      {/* Image with rounded corners all around */}
      <Image 
        source={image} 
        style={[styles.image, { height: Math.round(finalWidth * 0.58) }]} 
        resizeMode="cover" 
      />

      {/* Content directly below the image */}
      <View style={styles.content}>
        <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>

        {/* Row for Price block and Button */}
        <View style={styles.bottomRow}>
          
          {/* Stacked "Starting from" and Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, isCompact && styles.priceLabelCompact]} numberOfLines={1}>
              {t('Starting from')}
            </Text>
            <Text style={[styles.price, isCompact && styles.priceCompact]} numberOfLines={1}>
              ₹ {price}
            </Text>
          </View>

          {/* Add to Cart Button */}
          <Pressable style={[styles.button, isCompact && styles.buttonCompact]} onPress={onPress}>
            <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]} numberOfLines={1}>
              {t('Add to Cart')}
            </Text>
          </Pressable>

        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginRight: 14,
  },
  image: {
    width: '100%',
    borderRadius: 14, 
  },
  content: {
    marginTop: 8, 
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  titleCompact: {
    fontSize: 12,
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    gap: 4,
  },
  priceContainer: {
    flex: 1,
    flexShrink: 1,
    marginRight: 4,
  },
  priceLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 1,
  },
  priceLabelCompact: {
    fontSize: 9,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  priceCompact: {
    fontSize: 12,
  },
  button: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
    alignSelf: 'flex-end',
  },
  buttonCompact: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.2,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  buttonTextCompact: {
    fontSize: 10,
  },
});

export default ProductCard;
