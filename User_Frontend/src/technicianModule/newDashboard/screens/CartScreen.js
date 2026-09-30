import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateCartQuantity, cartSubtotal, checkout } = useApp();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const onCheckout = () => {
    const order = checkout();
    if (order) {
      Alert.alert('Order placed', `Order ${order.id} placed successfully.`);
      navigation.navigate('OrderHistory');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Your Cart</Text>

      {cartItems.length === 0 ? (
        <EmptyState message="Your cart is empty." icon="🛒" />
      ) : (
        <>
          {cartItems.map((item) => (
            <View key={item.product.id} style={[styles.row, isMobile && styles.rowMobile]}>
              <View style={isMobile ? styles.infoMobile : { flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.price}>₹{item.product.startingFrom} each</Text>
              </View>

              <View style={[styles.actionsRow, isMobile && styles.actionsRowMobile]}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.subtotal}>₹{item.product.startingFrom * item.quantity}</Text>

                <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{cartSubtotal}</Text>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} activeOpacity={0.85}>
            <Text style={styles.checkoutText}>Continue to Checkout</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  rowMobile: { flexDirection: 'column', alignItems: 'stretch' },
  infoMobile: { marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  actionsRowMobile: { justifyContent: 'space-between' },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  price: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md },
  qtyBtn: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.mintSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: colors.forestGreen, fontWeight: '700' },
  qtyValue: { ...typography.bodyMedium, color: colors.textPrimary, marginHorizontal: spacing.sm, minWidth: 18, textAlign: 'center' },
  subtotal: { ...typography.bodyMedium, color: colors.forestGreen, width: 70, textAlign: 'right' },
  removeBtn: { marginLeft: spacing.md },
  removeText: { ...typography.caption, color: colors.danger },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
  },
  summaryLabel: { ...typography.h3, color: colors.textPrimary },
  summaryValue: { ...typography.h3, color: colors.forestGreen },
  checkoutBtn: {
    backgroundColor: colors.forestGreen, borderRadius: radius.pill, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.md,
  },
  checkoutText: { ...typography.bodyMedium, color: colors.white },
});
