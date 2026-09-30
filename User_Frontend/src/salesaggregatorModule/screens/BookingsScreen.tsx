import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import DroneIcon from '../../assets/Missions-Inactive.svg';

import ServiceSelection from '../../customerModule/components/ServiceSelection';
import ScreenContainer from '../../customerModule/components/ScreenContainer';

import SupportCard from '../../customerModule/components/SupportCard';
import { aggregatorApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { formatBookingDate, formatBookingTime, resolveBookingLocationLabel } from '../../utils/bookingFormat';
import { isActiveBooking, markExpiredBookingsLocal } from '../../utils/bookingLifecycle';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BookingItem {
  id: string;
  serviceType?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  address?: string;
  status?: string;
  farmSnapshot?: any;
  priceEstimation?: number;
  bookingNumber?: string;
  adminApprovalStatus?: string;
  paymentStatus?: string;
}

const BookingsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('Active');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleServiceSelect = (serviceTitle: string) => {
    if (onNavigate) {
      onNavigate('ServiceBookingScreen', { service: serviceTitle });
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await aggregatorApi.getBookings();
        const items = data?.items ?? data ?? [];
        // Display-only reconciliation for expired bookings; the backend expiry
        // cron owns actual cancellation + 100% refund.
        setBookings(markExpiredBookingsLocal(Array.isArray(items) ? items : []).bookings);
      } catch (error) {
        console.error('Failed to load bookings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getFilteredBookings = (tab: string) => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return tab === 'Completed';
      if (b.status === 'completed') return tab === 'Completed' ? b.paymentStatus === 'paid' : b.paymentStatus !== 'paid' && tab === 'Upcoming';
      // Active ONLY when approved and the scheduled service date is today.
      if (isActiveBooking(b)) return tab === 'Active';
      return tab === 'Upcoming';
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return formatBookingDate(dateStr, locale) || dateStr;
  };

  const renderBookingCard = (booking: BookingItem, tab: string) => {
    if (tab === 'Active') {
      return (
        <CrossPlatformGradient
          key={booking.id}
          colors={['#0F4A38', '#072A20']}
          style={styles.activeBookingCard}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.serviceTitleWhite}>{booking.serviceType || t('Booking')}</Text>
            <Text style={styles.bookingIdText}>ID: #{booking.id}</Text>
            <Pressable
              style={styles.viewButtonOutline}
              onPress={() => onNavigate('BookingDetails', { bookingId: booking.id })}
            >
              <Text style={styles.viewButtonOutlineText}>{t('View Details')}</Text>
            </Pressable>
          </View>
          <View style={styles.infoRowFlex}>
            <View style={styles.infoBoxDark}>
              <Text style={styles.infoLabelLight}>{t('Scheduled Time')}</Text>
              <Text style={styles.infoValueWhite}>{formatBookingTime(booking.scheduledStartTime, locale) || t('N/A')}</Text>
            </View>
            <View style={styles.infoBoxDarkCentered}>
              <Text style={styles.infoValueWhite}>{formatDate(booking.scheduledDate)}</Text>
            </View>
          </View>
          <View style={styles.infoRowFlex}>
            <View style={styles.infoBoxDarkSmall}>
              <Text style={styles.infoLabelLight}>{t('Status')}</Text>
              <Text style={styles.infoValueWhite}>{t(booking.status || 'N/A')}</Text>
            </View>
            <View style={styles.infoBoxDarkRow}>
              <MaterialIcons name="location-on" size={16} color="#FFFFFF" />
              <Text style={styles.locationTextWhite} numberOfLines={2}>
                {resolveBookingLocationLabel(booking)}
              </Text>
            </View>
          </View>
          {/*<Text style={styles.statusHeadingWhite}>{t('Booking Status')}</Text>
          <Text style={styles.statusTextWhite}>{t(booking.status || 'Pending')}</Text>*/}
        </CrossPlatformGradient>
      );
    }

    if (tab === 'Upcoming') {
      return (
        <View key={booking.id} style={styles.upcomingCard}>
          <Text style={styles.upcomingTitle}>{booking.serviceType || t('Booking')}</Text>
          <Text style={styles.upcomingId}>ID: #{booking.id}</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridBox}>
              <Text style={styles.gridLabel}>{t('Scheduled Time:')}</Text>
              <Text style={styles.gridValue}>{formatBookingTime(booking.scheduledStartTime, locale) || t('N/A')}</Text>
            </View>
            <View style={styles.gridBoxCenter}>
              <Text style={styles.gridValue}>{formatDate(booking.scheduledDate)}</Text>
            </View>
          </View>
          <Text style={styles.statusLineText}>
            {t('Booking Status: ')}<Text style={styles.statusGreen}>{t(booking.status || 'N/A')}</Text>
          </Text>
          <View style={styles.footerRowCenter}>
            <Pressable onPress={() => onNavigate('BookingDetails', { bookingId: booking.id })}>
              <Text style={styles.textButtonBlue}>{t('View Details')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View key={booking.id} style={styles.completedCard}>
          <Text style={styles.completedTitle}>{booking.serviceType || t('Booking')}</Text>
          <Text style={styles.completedId}>ID: #{booking.id}</Text>
          <Text style={styles.completedSubText}>
          {formatDate(booking.scheduledDate)} | {formatBookingTime(booking.scheduledStartTime, locale) || ''} - {formatBookingTime(booking.scheduledEndTime, locale) || ''}
        </Text>
        <Text style={styles.completedSubText}>{resolveBookingLocationLabel(booking)}</Text>
        <Text style={styles.statusLineTextMargin}>
          {t('Booking Status: ')}<Text style={styles.statusGreen}>{t(booking.status || 'N/A')}</Text>
        </Text>
        <View style={styles.footerRowBetween}>
          <Pressable onPress={() => onNavigate('BookingDetails', { bookingId: booking.id })}>
            <Text style={styles.textButtonBlue}>{t('View Details')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const filteredBookings = getFilteredBookings(selectedTab);

  return (
    <ScreenContainer backgroundColor="#F9FAFB">
      <View style={styles.headerRow}>
        <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" style={{ marginRight: 8 }} />
        <Text style={styles.pageTitle}>{t('Your Bookings')}</Text>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 45, paddingTop: 10, gap: 22 }}
      >
        <ServiceSelection selectedService="" setSelectedService={handleServiceSelect} />

        <Text style={styles.heading}>{t('Your Bookings')}</Text>

        <View style={styles.tabsContainer}>
          {['Active', 'Upcoming', 'Completed'].map(tab => (
            <Pressable
              key={tab}
              style={selectedTab === tab ? styles.activeTab : styles.inactiveTab}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={selectedTab === tab ? styles.activeTabText : styles.inactiveTabText}>
                {t(tab)}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0B3A2C" />
          </View>
        ) : filteredBookings.length === 0 ? (
          <Text style={styles.emptyText}>{t('No {{tab}} bookings found.', { tab: selectedTab.toLowerCase() })}</Text>
        ) : (
          <View style={styles.tabContentArea}>
            {filteredBookings.map((booking) => renderBookingCard(booking, selectedTab))}
          </View>
        )}

        <View style={styles.sectionHeaderPadding}>
          <SupportCard onNavigate={onNavigate} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 20 },
  heading: {
    fontSize: 20, fontWeight: '700', color: '#1E293B',
    marginTop: 8,
    marginHorizontal: 20
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    //marginBottom: 20
  },
  activeTab: { flex: 1, height: 44, borderRadius: 22, backgroundColor: '#2F3241', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  inactiveTab: { flex: 1, borderWidth: 0.8, borderColor: '#E2E8F0', height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  activeTabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  inactiveTabText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  tabContentArea: {
    paddingHorizontal: 20, gap: 16,
    //marginBottom: 24
  },

  activeBookingCard: { marginHorizontal: 0, borderRadius: 24, padding: 20, marginBottom: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  serviceTitleWhite: { color: '#FFFFFF', fontSize: 18, fontWeight: '500' },
  bookingIdText: { color: '#FFFFFF', fontSize: 12, fontWeight: '400', opacity: 0.8 },
  viewButtonOutline: { borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  viewButtonOutlineText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  infoRowFlex: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6
  },
  infoBoxDark: { flex: 1.2, backgroundColor: 'rgba(27, 27, 33, 0.16)', borderRadius: 12, padding: 10, justifyContent: 'center' },
  infoBoxDarkCentered: { flex: 1, backgroundColor: 'rgba(27, 27, 33, 0.16)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 10 },
  infoBoxDarkSmall: { flex: 1, backgroundColor: 'rgba(27, 27, 33, 0.16)', borderRadius: 12, padding: 10 },
  infoBoxDarkRow: { flex: 1.5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(27, 27, 33, 0.16)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  infoLabelLight: { color: '#CBD5E1', fontSize: 11 },
  infoValueWhite: { color: '#FFFFFF', fontSize: 13, fontWeight: '500', marginTop: 2 },
  locationTextWhite: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', flex: 1 },
  statusHeadingWhite: { color: '#FFFFFF', fontSize: 12, fontWeight: '500', marginTop: 10, marginBottom: 10 },
  statusTextWhite: { color: '#FFFFFF', fontSize: 12, marginTop: 8, fontWeight: '500' },

  upcomingCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 20 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: '#0B3A2C', marginBottom: 4 },
  upcomingId: { fontSize: 12, fontWeight: '400', color: '#64748B', marginBottom: 16 },
  gridRow: { flexDirection: 'row', marginBottom: 10, gap: 10 },
  gridBox: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, justifyContent: 'center', alignItems: 'center' },
  gridBoxCenter: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, justifyContent: 'center', alignItems: 'center' },
  gridLabel: { fontSize: 11, color: '#64748B' },
  gridValue: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2 },
  statusLineText: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 16 },
  statusGreen: { fontWeight: '700', color: '#188A4E' },
  footerRowCenter: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  textButtonBlue: { fontSize: 14, fontWeight: '600', color: '#0B3A2C' },
  buttonLightGray: { backgroundColor: '#F4F6F8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  buttonLightGrayText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  completedCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 20 },
  completedTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 4 },
  completedId: { fontSize: 12, fontWeight: '400', color: '#64748B', marginBottom: 10 },
  completedSubText: { fontSize: 12, color: '#475569', fontWeight: '500', marginBottom: 6 },
  statusLineTextMargin: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 16 },
  footerRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonSolidBlue: { backgroundColor: '#0B3A2C', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  buttonSolidBlueText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  sectionHeaderPadding: {
    paddingHorizontal: 20,
    //paddingTop: 16
  },
  sectionTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
  linkBlue: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC'
  },
  pageTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
});

export default BookingsScreen;
