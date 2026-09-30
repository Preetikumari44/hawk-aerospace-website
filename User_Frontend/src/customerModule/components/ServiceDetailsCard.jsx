import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../i18n';
import { formatBookingDateTime, resolveBookingLocationLabel } from '../../utils/bookingFormat';

const AREA_UNIT_LABELS = {
  acre: 'Acres',
  hectare: 'Hectares',
  sq_m: 'Sq. Meters',
};

const formatAreaValue = (value) => {
  if (!value || value === '--') return value || '--';
  const stringVal = String(value).trim();
  const match = stringVal.match(/^([\d.,]+)\s*(\S+)?$/);
  if (!match) return stringVal;
  const numeric = match[1];
  const rawUnit = match[2];
  const unit = rawUnit ? (AREA_UNIT_LABELS[rawUnit.toLowerCase()] || rawUnit) : '';
  return `${numeric}${unit ? ` ${unit}` : ''}`;
};

const ServiceDetailsCard = ({ isMapping = false, stage = 1, service = {}, booking = null }) => {
  const { t, locale } = useLanguage();

  const serviceType = String(service?.type || booking?.serviceType || '').toLowerCase();
  const isSpraying = serviceType === 'spraying';
  const isVideography = serviceType === 'videography';
  const isSurveillance = serviceType === 'surveillance';
  const showArea = !isVideography && !isSurveillance;

  const showSubService =
    isMapping ||
    ['videography', 'surveillance', 'monitoring'].includes(booking?.serviceType);

  const locationLabel =
    service?.locationLabel ||
    service?.location ||
    (booking ? resolveBookingLocationLabel(booking) : null);
  const dateTimeLabel =
    service?.dateTime ||
    (service?.date || service?.timeSlot
      ? formatBookingDateTime(service?.date, service?.timeSlot, locale)
      : null) ||
    (booking ? formatBookingDateTime(booking?.scheduledDate, booking?.scheduledStartTime, locale) : null);

  const rows = [
    { label: t('Booking ID'), value: service?.bookingId || booking?.bookingNumber || booking?.id || t('--') },
    { label: t('Service'), value: service?.type || t('Not available') },
    ...(isMapping ? [
      { label: t('Sub-Service'), value: service?.subType || t('--') },
      { label: t('Infrastructure Type'), value: service?.infraType || t('--') },
    ] : showSubService ? [
      { label: t('Sub-Service'), value: service?.subType || t('--') },
    ] : []),
    { label: t('Location'), value: locationLabel || t('Not available') },
    { label: t('Date & Time'), value: dateTimeLabel || t('Not available') },
    ...(isSpraying ? [{ label: t('Crop Type'), value: service?.cropType || t('--') }] : []),
    ...(showArea ? [
      { label: t('Area'), value: formatAreaValue(service?.landArea) || t('--') },
      { label: isMapping ? t('Drawn Land Area') : t('Drawn Farm Area'), value: formatAreaValue(service?.drawnLandArea) || t('--') },
    ] : []),
    ...(isVideography ? [{ label: t('Minutes'), value: service?.serviceDetails?.quantity ? `${service.serviceDetails.quantity} min` : t('--') }] : []),
    ...(isSurveillance ? [{ label: t('Visits'), value: service?.serviceDetails?.quantity || t('--') }] : []),
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Service Details')}</Text>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value} numberOfLines={2}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    paddingVertical: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    //fontWeight: '500',
    color: '#374151',
    textAlign: 'right',
    flexShrink: 1,
  },
});

export default ServiceDetailsCard;
