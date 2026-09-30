import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';

import ServiceSelection from '../components/ServiceSelection';
import PromoCard from '../../pilotModule/components/PromoCard';
import SupportCard from '../components/SupportCard';
import ScreenContainer from '../components/ScreenContainer';
import COLORS from '../constants/colors';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { formatBookingDate, resolveBookingLocationLabel } from '../../utils/bookingFormat';
import { isActiveBooking, markExpiredBookingsLocal } from '../../utils/bookingLifecycle';

const formatDate = (value, locale) => {
  if (!value) return '';
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusToTab = (booking) => {
  if (booking.status === 'cancelled') return 'Completed';
  if (booking.status === 'completed') return booking.paymentStatus === 'paid' ? 'Completed' : 'Upcoming';
  // Active ONLY when approved and the scheduled service date is today.
  // Everything else (pending approval, rejected, future approved dates) -> Upcoming.
  if (isActiveBooking(booking)) return 'Active';
  return 'Upcoming';
};

const normalizeBookings = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const BookingsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('Active');
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    customerApi
      .getBookings({ limit: 20 })
      .then((response) => {
        const items = normalizeBookings(response);
        // Display-only reconciliation for expired bookings; the backend expiry
        // cron owns actual cancellation + 100% refund.
        setBookings(markExpiredBookingsLocal(items).bookings);
      })
      .catch((error) => console.error('Failed to load bookings', error));
  }, [routeParams]);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => statusToTab(booking) === selectedTab),
    [bookings, selectedTab],
  );

  const handleServiceSelect = useCallback(
    (serviceTitle) => onNavigate('ServiceBookingScreen', { service: serviceTitle }),
    [onNavigate],
  );

  return (
    <ScreenContainer backgroundColor="#F9FAFB">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 87 }}
      >
        <ServiceSelection
          selectedService=""
          setSelectedService={handleServiceSelect}
        />

        <Text style={styles.heading}>{t('Your Bookings')}</Text>

        <View style={styles.tabsContainer}>
          {['Active', 'Upcoming', 'Completed'].map((tab) => (
            <Pressable
              key={tab}
              style={selectedTab === tab ? styles.activeTab : styles.inactiveTab}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={selectedTab === tab ? styles.activeTabText : styles.inactiveTabText}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.tabContentArea}>
          {filteredBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={selectedTab === 'Active' ? styles.activeBookingCard : styles.standardCard}
              onPress={() => onNavigate('BookingDetailsScreen', { bookingId: booking.id, serviceType: booking.serviceType })}
            >
          <Text style={selectedTab === 'Active' ? styles.whiteTitle : styles.darkTitle}>
            {booking.serviceType || 'Drone Service'}
          </Text>
          <Text style={selectedTab === 'Active' ? styles.whiteMeta : styles.darkMeta}>
            ID: #{booking.id}
          </Text>
          <Text style={selectedTab === 'Active' ? styles.whiteMeta : styles.darkMeta}>
            {formatBookingDate(booking.scheduledDate, locale) || formatDate(booking.scheduledDate, locale)}
          </Text>
              <Text style={selectedTab === 'Active' ? styles.whiteMeta : styles.darkMeta}>
                {resolveBookingLocationLabel(booking)}
              </Text>
              <Text style={selectedTab === 'Active' ? styles.whiteStatus : styles.darkStatus}>
                Status: {booking.status}
              </Text>
            </Pressable>
          ))}

          {!filteredBookings.length && (
            <View style={styles.emptyCard}>
              <Text style={styles.darkTitle}>No {selectedTab.toLowerCase()} bookings</Text>
              <Text style={styles.darkMeta}>{t('Bookings created from the backend will appear here.')}</Text>
            </View>
          )}
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.promoSectionTitle}>{t('Promotions & Offers')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
          >
            {[1, 2, 3].map((_, index) => (
              <PromoCard key={index} layout="carousel" />
            ))}
          </ScrollView>
        </View>
        <SupportCard onNavigate={onNavigate} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  promoSection: {
    paddingTop: 8,
    gap: 12,
    marginBottom: 22,
  },
  promoSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
    marginTop: 24,
    marginHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  activeTab: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F3241',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  inactiveTab: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  inactiveTabText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContentArea: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  activeBookingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  standardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  whiteTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  whiteMeta: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  whiteStatus: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  darkTitle: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  darkMeta: {
    color: '#6B7280',
    fontSize: 13,
  },
  darkStatus: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default BookingsScreen;
