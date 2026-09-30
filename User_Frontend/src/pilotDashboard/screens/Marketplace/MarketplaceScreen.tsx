import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography, shadow } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import DataState from '../../components/DataState';
import { useAsync } from '../../hooks/useAsync';
import { pilotService } from '../../services/pilotService';

const MarketplaceScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const products = useAsync(() => pilotService.getMarketplaceProducts(), []);

  const categories = Array.from(new Set((products.data || []).map((p) => p.category)));

  return (
    <Screen>
      <Text style={styles.title}>Marketplace</Text>
      <Text style={styles.subtitle}>Parts, batteries and gear for your missions.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search products"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
      />

      {!!categories.length && (
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <View key={c} style={styles.categoryChip}>
              <Text style={styles.categoryText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      <DataState
        state={products}
        isEmpty={(d) => d.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).length === 0}
        emptyTitle="No products found"
        emptyBody="Try a different search term."
      >
        {(data) => (
          <View style={styles.grid}>
            {data
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <TouchableOpacity key={p.id} style={styles.card} activeOpacity={0.85}>
                  <View style={styles.imagePlaceholder} />
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.productCategory}>{p.category}</Text>
                  <Text style={styles.productPrice}>₹{p.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </DataState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhite,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    maxWidth: 420,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  categoryChip: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.mintGreenSoft },
  categoryText: { ...typography.caption, color: colors.forestGreen, textTransform: 'none' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  card: {
    width: 200,
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...(shadow.card as object),
  },
  imagePlaceholder: { width: '100%', height: 100, borderRadius: radii.md, backgroundColor: colors.creamBackgroundAlt, marginBottom: spacing.md },
  productName: { ...typography.smallMedium, color: colors.textPrimary, minHeight: 34 },
  productCategory: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, textTransform: 'none' },
  productPrice: { ...typography.bodyMedium, color: colors.forestGreen, marginTop: spacing.sm },
});

export default MarketplaceScreen;
