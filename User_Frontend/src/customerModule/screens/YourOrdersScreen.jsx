import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import SupportCard from '../components/SupportCard';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi } from '../../utils/api';
import { getExpectedDeliveryDate } from '../../utils/locationFormat';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const YourOrdersScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [activeTab, setActiveTab] = useState('Active');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    customerApi
      .getOrders({ limit: 50 })
      .then((response) => setOrders(response?.items || []))
      .catch((error) => console.error('Failed to load marketplace orders', error));
  }, []);

  const visibleOrders = useMemo(() => {
    if (activeTab === 'Completed') return orders.filter((order) => order.status === 'delivered');
    return orders.filter((order) => order.status !== 'delivered');
  }, [activeTab, orders]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Your Orders')}</Text>
      </View>

      <View style={styles.tabsRow}>
        {['Active', 'Completed'].map((tab) => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{t(tab)}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        {visibleOrders.map((order) => (
          <Pressable
            key={order.orderId}
            style={styles.orderCard}
            onPress={() => onNavigate('OrderDetailsScreen', { orderId: order.orderId, order })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.productName}>{order.productName}</Text>
                <Text style={styles.deliveryDate}>{order.deliveryDate || getExpectedDeliveryDate(order.createdAt, locale)}</Text>
                <Text style={styles.locationText} numberOfLines={2}>{order.deliveryLocation || t('Delivery location unavailable')}</Text>
              </View>
              <Image source={require('../assets/images/fertilizer.png')} style={styles.orderImage} />
            </View>
            <Text style={styles.statusLabel}>{t('Order Status: {{status}}', { status: t(order.status) })}</Text>
          </Pressable>
        ))}

        {!visibleOrders.length && (
          <View style={styles.completedItem}>
            <Text style={styles.compTitle}>{t('No orders found')}</Text>
            <Text style={styles.compSub}>{t('Orders created from marketplace API will appear here.')}</Text>
          </View>
        )}

        <SupportCard onNavigate={onNavigate} />
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
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
  },
  tab: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  tabActive: { backgroundColor: '#2F3542' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },
  content: {
    //paddingHorizontal: 20,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#3A4287',
    marginHorizontal: 20,
    borderRadius: 24, padding: 20,
    marginBottom: 20
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHeaderLeft: { flex: 1, paddingRight: 10 },
  productName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  deliveryDate: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  locationText: { color: '#D1D5DB', fontSize: 11, flex: 1 },
  orderImage: { width: 80, height: 60, borderRadius: 8 },
  statusLabel: { color: '#FFFFFF', fontSize: 12, marginTop: 20, marginBottom: 12 },
  completedItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  compTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  compSub: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
});

export default YourOrdersScreen;