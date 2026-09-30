import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageGlyph}>🌱</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {product.description}
      </Text>
      <Text style={styles.priceLabel}>Starting from</Text>
      <Text style={styles.price}>
        {product.currency === 'INR' ? '₹' : product.currency} {product.startingFrom}
      </Text>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => onAddToCart && onAddToCart(product)}
      >
        <Text style={styles.buttonText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  imagePlaceholder: {
    height: 70,
    borderRadius: radius.sm,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  imageGlyph: { fontSize: 22 },
  name: { ...typography.bodyMedium, color: colors.textPrimary, minHeight: 34 },
  description: { ...typography.caption, color: colors.textSecondary, marginTop: 2, minHeight: 28 },
  priceLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  price: { ...typography.h3, color: colors.forestGreen, marginBottom: spacing.sm },
  button: {
    backgroundColor: colors.forestGreen,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonText: { ...typography.bodyMedium, color: colors.white },
});
