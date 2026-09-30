import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';

export default function OrderHistoryScreen() {
  const { orders } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Order History</Text>

      {orders.length === 0 ? (
        <EmptyState message="No orders yet." icon="📦" />
      ) : (
        orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderTotal}>₹{order.total}</Text>
            </View>
            <Text style={styles.orderDate}>{new Date(order.placedAt).toLocaleString()}</Text>
            {order.items.map((item) => (
              <Text key={item.product.id} style={styles.itemLine}>
                {item.quantity} × {item.product.name}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { ...typography.bodyMedium, color: colors.textPrimary },
  orderTotal: { ...typography.bodyMedium, color: colors.forestGreen },
  orderDate: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  itemLine: { ...typography.caption, color: colors.textSecondary },
});
