import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../i18n';

const PriceRow = ({ label, value, isTotal = false }) => (
  <View style={styles.row}>
    <Text style={[styles.label, isTotal && styles.totalText]}>{label}</Text>
    <Text style={[styles.value, isTotal && styles.totalText]}>{value}</Text>
  </View>
);

const PricingBreakdownCard = ({ paymentStatus = 'Payment Pending', pricing = {} }) => {
  const { t, locale } = useLanguage();
  const isPaid = paymentStatus === 'Payment Completed';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Estimated Pricing Breakdown')}</Text>

      <PriceRow label={t('Service Price')} value={pricing?.servicePrice || t('Not available')} />
      <PriceRow label={t('Platform Fee')} value={pricing?.platformFee || t('Not available')} />
      <PriceRow label={t('GST (18%)')} value={pricing?.gst || t('Not available')} />

      <View style={styles.dashedDivider} />

      <PriceRow label={t('Total')} value={pricing?.total || t('Not available')} isTotal={true} />

      <View style={styles.paymentStatusRow}>
        <Text style={styles.label}>{t('Payment Status:')}</Text>
        <Text style={[styles.statusText, isPaid ? styles.greenText : styles.redText]}>
          {t(paymentStatus)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA', // Matches screen background (no card box)
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginVertical: 12,
  },
  paymentStatusRow: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  redText: {
    color: '#DC2626',
  },
  greenText: {
    color: '#10B981',
  },
});

export default PricingBreakdownCard;
