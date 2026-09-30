import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import SectionHeader from '../components/SectionHeader';
import ProductCard from '../components/ProductCard';
import PromotionCard from '../components/PromotionCard';
import { useApp } from '../context/AppContext';
import {
  popularProducts,
  marketplaceCategories,
  defaultCategory,
  promotion,
  deliveryAddress,
} from '../data/marketplaceData';

export default function MarketplaceScreen({ navigation }) {
  const { addToCart, cartCount } = useApp();
  const [category, setCategory] = useState(defaultCategory);
  const [search, setSearch] = useState('');

  const filtered = popularProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.deliveringLabel}>Delivering to</Text>
          <Text style={styles.deliveringAddress}>{deliveryAddress}</Text>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.iconGlyph}>🛒</Text>
            {cartCount > 0 ? (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.orderHistoryBtn} onPress={() => navigation.navigate('OrderHistory')}>
            <Text style={styles.orderHistoryText}>Order History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.pageTitle}>Marketplace Products</Text>

      <TextInput
        style={styles.search}
        placeholder="Search products"
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <SectionHeader title="Select Categories" />
      <View style={styles.chipsRow}>
        {marketplaceCategories.map((c) => {
          const active = c.id === category;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(c.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: spacing.lg }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
        ))}
      </ScrollView>

      <View style={{ height: spacing.lg }} />

      <SectionHeader title="Promotions & Offers" />
      <PromotionCard promotion={promotion} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  deliveringLabel: { ...typography.caption, color: colors.textMuted },
  deliveringAddress: { ...typography.bodyMedium, color: colors.textPrimary },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginRight: spacing.md },
  iconGlyph: { fontSize: 16 },
  cartBadge: {
    position: 'absolute', top: -6, right: -8, backgroundColor: colors.forestGreen,
    borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  orderHistoryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  orderHistoryText: { ...typography.caption, color: colors.textPrimary },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.lg, ...typography.body,
    color: colors.textPrimary,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '700' },
});
