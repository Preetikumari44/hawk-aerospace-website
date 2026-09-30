import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';

import { useLanguage } from '../../i18n';
import {
  findServiceEntry,
  calculateServicePrice,
  formatPrice,
} from '../../utils/servicePricing';

const AREA_TO_ACRES = { acre: 1, hectare: 2.47105, sq_m: 1 / 4046.8564224 };

const PriceEstimateCard = ({
  selectedService,
  area,
  areaUnit,
  eventType,
  videographyQuantity,
  surveillanceKey,
  surveillanceQuantity,
  scheduledDate,
  timeSlot,
}) => {
  const { t } = useLanguage();

  const hasTimeSlot = Array.isArray(timeSlot) && timeSlot.length > 0;
  const preferredTime = Array.isArray(timeSlot) && timeSlot[0] ? timeSlot[0] : timeSlot;

  let estimate = null;

  if (selectedService === 'Videography') {
    const selectedEntry = findServiceEntry('videography', eventType);
    if (selectedEntry) {
      estimate = calculateServicePrice({
        serviceType: 'videography',
        key: eventType,
        unit: selectedEntry.defaultUnit,
        quantity: videographyQuantity,
        scheduledDate,
        preferredTime,
      });
    }
  } else if (selectedService === 'Surveillance') {
    const selectedEntry = findServiceEntry('surveillance', surveillanceKey);
    if (selectedEntry) {
      estimate = calculateServicePrice({
        serviceType: 'surveillance',
        key: surveillanceKey,
        unit: selectedEntry.defaultUnit,
        quantity: surveillanceQuantity,
        scheduledDate,
        preferredTime,
      });
    }
  } else if (selectedService === 'Spraying' || selectedService === 'Mapping') {
    const farmKey = selectedService === 'Spraying' ? 'precision_spraying' : 'basic_aerial_mapping';
    const areaInAcres = Math.round((Number(area) * (AREA_TO_ACRES[areaUnit] ?? 1)) * 100) / 100;
    estimate = calculateServicePrice({
      serviceType: selectedService.toLowerCase(),
      key: farmKey,
      unit: 'per_acre',
      quantity: areaInAcres,
      scheduledDate,
      preferredTime,
    });
  }

  if (!hasTimeSlot || !estimate) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/*<Text style={styles.heading}>{t('Estimated Price')}</Text>*/}
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>{t('Estimated price')} ({t('excl. GST')}):</Text>
        <Text style={styles.priceValue}>{formatPrice(estimate.subtotal)}</Text>
        {/*<Text style={styles.priceSub}>
          {t('Base')} {formatPrice(estimate.baseAmount)}
          {estimate.factors.length > 0
            ? ` ${t('+ factors')}: ${estimate.factors.map((f) => t(f.label)).join(', ')}`
            : ''}
        </Text>*/}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  priceBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  priceLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: '#4B5563',
  },
  priceValue: {
    ...TYPOGRAPHY.titleSmall,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  priceSub: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default PriceEstimateCard;
