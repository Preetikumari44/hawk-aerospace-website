import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import SupportCard from '../components/SupportCard';
import COLORS from '../constants/colors';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import StarIcon from '../assets/Icons_V02/Icons/StarIcon.svg';
import { customerApi } from '../../utils/api';
import { getExpectedDeliveryDate } from '../../utils/locationFormat';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const DetailRow = ({ label, value }) => {
  const { t, locale } = useLanguage();
  return (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || t('Not available')}</Text>
  </View>
  );
};

const PriceRow = ({ label, value, isTotal = false }) => {
  const { t, locale } = useLanguage();
  return (
  <View style={styles.priceRow}>
    <Text style={[styles.label, isTotal && styles.totalText]}>{label}</Text>
    <Text style={[styles.value, isTotal && styles.totalText]}>{value}</Text>
  </View>
  );
};

const OrderDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [order, setOrder] = useState(routeParams?.order || null);

  useEffect(() => {
    if (!routeParams?.orderId || routeParams?.order) {
      return;
    }

    customerApi
      .getOrder(routeParams.orderId)
      .then(setOrder)
      .catch((error) => console.error('Failed to load order details', error));
  }, [routeParams?.orderId, routeParams?.order]);

  const isPaid = order?.paymentStatus === 'paid';
  const paymentMethodLabel =
    order?.paymentMethod === 'gateway' ? t('Pay Online') : t('Cash on Delivery (COD)');

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('YourOrdersScreen')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Order Details')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <Text style={styles.sectionTitle}>{t('Order Status')}</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{t(order?.status) || t('Loading')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('Payment')}</Text>
        <View style={[styles.paymentBadge, isPaid ? styles.paymentBadgePaid : styles.paymentBadgePending]}>
          <Text style={[styles.paymentBadgeText, !isPaid && styles.paymentBadgeTextPending]}>
            {isPaid ? t('Payment Completed') : t('Payment Pending')}
          </Text>
        </View>
        {!isPaid && (
          <Pressable
            style={styles.payNowButton}
            onPress={() =>
              order &&
              onNavigate('PaymentSelectionScreen', {
                mode: 'marketplace',
                existingOrder: order,
              })
            }
            disabled={!order}
          >
            <Text style={styles.payNowButtonText}>{t('Pay Now')}</Text>
          </Pressable>
        )}
        <View style={{ marginTop: 12 }}>
          <DetailRow label={t('Payment Method:')} value={paymentMethodLabel} />
        </View>

        <Text style={styles.statusSubtitle}>
          {t('Marketplace order data is loaded from the backend order endpoint.')}
        </Text>
        <View style={styles.dashedDivider} />

        <Text style={styles.sectionTitle}>{t('Order Details')}</Text>
        <DetailRow label={t('Order ID:')} value={order?.orderId} />
        <DetailRow label={t('Order Date & Time:')} value={order?.createdAt ? new Date(order.createdAt).toLocaleString(locale) : null} />
        <DetailRow label={t('Delivery Date:')} value={order?.deliveryDate || getExpectedDeliveryDate(order?.createdAt, locale)} />
        <DetailRow label={t('Delivery Location:')} value={order?.deliveryLocation} />
        <DetailRow label={t('Vendor ID:')} value={order?.vendorId} />
        <View style={styles.dashedDivider} />

        <Text style={styles.sectionTitle}>{t('Product Details')}</Text>
        <Image source={require('../assets/images/fertilizer.png')} style={styles.productImage} />
        <Text style={styles.productTitle}>{order?.productName || t('Marketplace Product')}</Text>
        <View style={styles.ratingRow}>
          <StarIcon width={14} height={14} />
          <Text style={styles.ratingText}>{t(' Backend marketplace order')}</Text>
        </View>
        <View style={styles.dashedDivider} />

        <Text style={styles.sectionTitle}>{t('Pricing Breakdown')}</Text>
        <PriceRow label={t('Product Price')} value={t('INR {{price}}', { price: order?.price || 0 })} />
        <View style={styles.dashedDivider} />
        <PriceRow label={t('Total')} value={t('INR {{price}}', { price: order?.price || 0 })} isTotal />

        <View style={{ marginTop: 20 }}>
          <SupportCard onNavigate={onNavigate} />
        </View>
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
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '700', color: '#2F3542' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  statusCard: {
    backgroundColor: '#3A4287',
    borderRadius: 20,
    minHeight: 90,
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginBottom: 16,
  },
  statusText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  paymentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  paymentBadgePaid: { backgroundColor: '#D1FAE5' },
  paymentBadgePending: { backgroundColor: '#FEF3C7' },
  paymentBadgeText: { fontSize: 13, fontWeight: '700', color: '#059669' },
  paymentBadgeTextPending: { color: '#B45309' },
  payNowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payNowButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  statusSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginVertical: 20,
  },
  row: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700', color: '#374151' },
  productImage: { width: '100%', height: 160, borderRadius: 16, marginBottom: 12 },
  productTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  ratingText: { fontSize: 12, color: '#6B7280' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalText: { fontSize: 16, fontWeight: '700', color: '#2F3542' },
});

export default OrderDetailsScreen;