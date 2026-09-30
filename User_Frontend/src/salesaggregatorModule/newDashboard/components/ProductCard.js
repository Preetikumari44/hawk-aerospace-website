// src/components/ProductCard.js
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT } from '../theme/theme';
import { useCart } from '../utils/CartContext';

export default function ProductCard({ product, compact = true }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.priceLabel}>Starting from</Text>
      <Text style={styles.price}>{product.price}</Text>
      <TouchableOpacity style={[styles.btn, added && styles.btnAdded]} onPress={handleAdd}>
        <Text style={[styles.btnText, added && styles.btnTextAdded]}>{added ? 'Added ✓' : 'Add to Cart'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 140, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm },
  compact: { width: 130 },
  imageWrap: { height: 70, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: SPACING.xs },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.primaryLight },
  name: { ...FONT.h3, color: COLORS.textPrimary, minHeight: 32 },
  priceLabel: { ...FONT.small, color: COLORS.textSecondary, marginTop: 2 },
  price: { ...FONT.h3, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  btn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 5, alignItems: 'center' },
  btnAdded: { backgroundColor: COLORS.primary },
  btnText: { color: COLORS.primary, ...FONT.small, fontWeight: '700' },
  btnTextAdded: { color: COLORS.textInverse },
});
