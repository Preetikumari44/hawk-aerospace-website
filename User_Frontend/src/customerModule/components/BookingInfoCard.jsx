import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BookingDetailRow from './BookingDetailRow';
import { useLanguage } from '../../i18n';

const formatServiceName = (serviceType) => {
  if (!serviceType) {
    return 'Drone Service';
  }

  return String(serviceType)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatSchedule = (scheduledDate, locale) => {
  if (!scheduledDate) {
    return 'To be scheduled';
  }

  const date = new Date(scheduledDate);
  if (Number.isNaN(date.getTime())) {
    return String(scheduledDate);
  }

  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatArea = (booking) => {
  const area = booking?.area;
  if (area?.value) {
    return `${area.value} ${area.unit || ''}`.trim();
  }

  if (booking?.areaValue) {
    return `${booking.areaValue} ${booking.areaUnit || 'acre'}`.trim();
  }

  return 'Not available';
};

const formatStatus = (status) => {
  if (!status) {
    return 'Confirmed';
  }

  return String(status)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const BookingInfoCard = ({ booking }) => {
  const { t, locale } = useLanguage();

  return (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.heading}>{t('BOOKING DETAILS')}</Text>
      <View style={styles.statusChip}>
        <Text style={styles.statusText}>{t(formatStatus(booking?.status))}</Text>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.rowsContainer}>
      <BookingDetailRow label={t('Booking ID')} value={booking?.bookingCode || booking?.id || t('Pending')} />
      <BookingDetailRow label={t('Service')} value={t(formatServiceName(booking?.serviceType))} />
      <BookingDetailRow label={t('Date')} value={t(formatSchedule(booking?.scheduledDate, locale))} />
      <BookingDetailRow label={t('Area')} value={t(formatArea(booking))} />
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    color: '#B9BDF3',
    fontSize: 18,
    fontWeight: '500',
  },
  statusChip: {
    backgroundColor: '#CFF6D8',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
  },
  statusText: {
    color: '#0A8A44',
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  rowsContainer: {
    gap: 12,
  },
});

export default BookingInfoCard;
