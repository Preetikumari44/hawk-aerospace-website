import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { MarketplaceProduct } from '../types';

const ProductMiniCard: React.FC<{ product: MarketplaceProduct; onAddToCart?: () => void }> = ({ product, onAddToCart }) => (
  <View style={styles.card}>
    <View style={styles.imagePlaceholder} />
    <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
    <Text style={styles.startingFrom}>Starting from</Text>
    <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
    <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={onAddToCart}>
      <Text style={styles.addBtnText}>Add to Cart</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: 128,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...(shadow.card as object),
  },
  imagePlaceholder: { width: '100%', height: 48, borderRadius: radii.sm, backgroundColor: colors.mintGreenSoft, marginBottom: 6 },
  name: { fontSize: 11, fontWeight: '600', color: colors.textPrimary, minHeight: 28 },
  startingFrom: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
  price: { ...typography.smallMedium, color: colors.forestGreen, marginTop: 1, marginBottom: 6 },
  addBtn: { backgroundColor: colors.mintGreenSoft, borderRadius: radii.sm, paddingVertical: 5, alignItems: 'center' },
  addBtnText: { fontSize: 9, fontWeight: '700', color: colors.forestGreen },
});

export default ProductMiniCard;
