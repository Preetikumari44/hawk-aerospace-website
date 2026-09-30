import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const CustomerRefundsScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    customerApi
      .getBookings({ limit: 50 })
      .then((response) => setBookings(response?.items || []))
      .catch((error) => console.error('Failed to load refunds source data', error));
  }, []);

  const refunds = useMemo(
    () => bookings.filter((booking) => booking.status === 'cancelled' || booking.refund),
    [bookings],
  );

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Account')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Your Refunds')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        {refunds.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.reasonText}>{t(item.refund?.reason) || t(item.status)}</Text>
              <View style={[styles.badge, item.refund?.status === 'completed' ? styles.badgeCompleted : styles.badgeActive]}>
                <Text style={[styles.badgeText, item.refund?.status === 'completed' ? styles.textCompleted : styles.textActive]}>
                  {t(item.refund?.status) || t('pending')}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Order ID: ')}</Text>
              <Text style={styles.value}>{item.id}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Refund Amount: ')}</Text>
              <Text style={styles.value}>INR {item.refund?.amount ?? item.finalPrice ?? item.priceEstimation ?? 0}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Date & Time: ')}</Text>
              <Text style={styles.value}>{item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale) : t('Not available')}</Text>
            </View>
            <Pressable style={styles.viewOrderButton} onPress={() => onNavigate('BookingDetailsScreen', { bookingId: item.id })}>
              <Text style={styles.viewOrderText}>{t('View Booking')}</Text>
            </Pressable>
          </View>
        ))}

        {!refunds.length && (
          <View style={styles.card}>
            <Text style={styles.reasonText}>{t('No refunds found')}</Text>
            <Text style={styles.value}>{t('Cancelled bookings with backend refund data will appear here.')}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '500', color: '#2F3542' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    padding: 20,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reasonText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  badgeActive: { borderColor: '#10B981' },
  badgeCompleted: { borderColor: '#6B7280' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  textActive: { color: '#10B981' },
  textCompleted: { color: '#6B7280' },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { fontSize: 13, color: '#6B7280', width: 110 },
  value: { flex: 1, fontSize: 13, fontWeight: '700', color: '#2F3542' },
  viewOrderButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewOrderText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
});

export default CustomerRefundsScreen;
