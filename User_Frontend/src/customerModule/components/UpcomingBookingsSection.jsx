import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useLanguage } from '../../i18n';
import Locationpin from '../../assets/Icons/SVG/Light/LocationIcon.svg';
import {
  compactAddressOmitStatePincode,
  formatBookingDate,
  formatBookingServiceTitle,
  formatBookingTime,
  isUpcomingBooking,
  resolveBookingApprovalLabel,
  resolveBookingLocationLabel,
  resolveBookingSubServiceTitle,
} from '../../utils/bookingFormat';

const CARD_GAP = 12;
const SIDE_PADDING = 20;
const MIN_CARD_WIDTH = 210;
const MAX_CARD_WIDTH = 340;

const STATUS_TONES = {
  pending: { background: '#FEF3C7', border: '#FDE68A', dot: '#D97706', text: '#B45309' },
  rejected: { background: '#FEE2E2', border: '#FCA5A5', dot: '#DC2626', text: '#B91C1C' },
};

export const UpcomingBookingCard = ({ booking, onSelectBooking, width }) => {
  const { t, locale } = useLanguage();
  const approval = String(booking?.adminApprovalStatus || '').toLowerCase();
  const tone = STATUS_TONES[approval] || STATUS_TONES.pending;
  const title = t(formatBookingServiceTitle(booking));
  const subServiceTitle = resolveBookingSubServiceTitle(booking);
  const statusLabel = t(resolveBookingApprovalLabel(booking));

  const datePart =
    formatBookingDate(booking?.scheduledDate || booking?.date, locale) ||
    booking?.scheduledDate ||
    booking?.date;
  const timePart =
    formatBookingTime(
      booking?.scheduledStartTime || booking?.timeSlot || booking?.scheduledTime,
      locale,
    ) ||
    booking?.timeSlot ||
    booking?.scheduledStartTime;
  const dateTimeDisplay = [datePart, timePart].filter(Boolean).join(' | ');

  const fullAddress = resolveBookingLocationLabel(booking);
  const displayAddress = compactAddressOmitStatePincode(fullAddress);

  const cardElement = (
    <Pressable
      style={styles.card}
      onPress={() => onSelectBooking?.(booking)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${statusLabel}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardId} numberOfLines={1} ellipsizeMode="tail">
          ID: {booking.id}
        </Text>
      </View>

      {subServiceTitle ? (
        <Text style={styles.subServiceText} numberOfLines={1}>
          {t(subServiceTitle)}
        </Text>
      ) : null}

      {dateTimeDisplay ? (
        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTimeText} numberOfLines={1}>
            {dateTimeDisplay}
          </Text>
        </View>
      ) : null}

      {displayAddress ? (
        <View style={styles.locationRow}>
          <Locationpin width={14} height={14} />
          <Text style={styles.locationText} numberOfLines={1}>
            {displayAddress}
          </Text>
        </View>
      ) : null}

      <View
        
      >
        {/*<View style={[styles.statusDot, { backgroundColor: tone.dot }]} />*/}
        <View style={styles.statusTextContainer}>
          <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
            Status: {statusLabel}
          </Text>
          <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
            Assignment: Pending
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (width !== undefined) {
    return <View style={{ width, marginRight: CARD_GAP }}>{cardElement}</View>;
  }

  return cardElement;
};

/**
 * Compact carousel of bookings awaiting admin review (the same set surfaced by
 * the Upcoming tab of the bookings screens). Renders nothing - heading included -
 * when there is nothing upcoming.
 */
const UpcomingBookingsSection = ({ bookings, onSelectBooking }) => {
  const { t, locale } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();

  const upcomingBookings = useMemo(
    () => (Array.isArray(bookings) ? bookings.filter((b) => isUpcomingBooking(b)) : []),
    [bookings],
  );

  if (!upcomingBookings.length) {
    return null;
  }

  const isWide = Platform.OS === 'web' || windowWidth > 600;
  const availableWidth = Math.max(windowWidth - SIDE_PADDING * 2, MIN_CARD_WIDTH);
  // Peek the next card when there is more than one, so the row stays scannable.
  const visibleCards = upcomingBookings.length === 1 ? 1 : 1.15;
  const rawCardWidth = (availableWidth - CARD_GAP * (visibleCards - 1)) / visibleCards;
  const cardWidth = Math.round(
    Math.max(MIN_CARD_WIDTH, Math.min(rawCardWidth, isWide ? MAX_CARD_WIDTH : availableWidth)),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{t('Upcoming Bookings')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: SIDE_PADDING, paddingRight: 4 }}
      >
        {upcomingBookings.map((booking) => (
          <UpcomingBookingCard
            key={booking.id}
            booking={booking}
            onSelectBooking={onSelectBooking}
            width={cardWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingTop: 4,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    paddingHorizontal: SIDE_PADDING,
  },
  card: {
    backgroundColor: '#FFFFFF',
    justifyContent:'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
    minHeight: 220,
    ...Platform.select({ web: { cursor: 'pointer' }, default: {} }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5060D3',
    flexShrink: 1,
  },
  cardId: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    flexShrink: 0,
  },
  subServiceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: -2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  statusTextContainer: {
    flex: 1,
    gap: 4,
  },
});

export default UpcomingBookingsSection;
