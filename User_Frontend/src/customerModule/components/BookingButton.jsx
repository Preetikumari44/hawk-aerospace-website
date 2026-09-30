import React from 'react';
import { View, StyleSheet } from 'react-native';

import PrimaryButton from './PrimaryButton';
import COLORS from '../constants/colors';
import { useLanguage } from '../../i18n';

const buttonTitles = {
  'Spraying': 'Book Farm Spraying',
  'Mapping': 'Book Mapping',
  'Surveillance': 'Book Surveillance',
  'Videography': 'Book Videography',
  'Delivery': 'Book Goods Delivery',
};

const BookingButton = ({ selectedService, area, areaUnit, eventType, selectedDate, selectedSlots, videographyQuantity, surveillanceKey, surveillanceQuantity, onNavigate, extraParams = undefined }) => {
  const { t } = useLanguage();

  const dynamicTitle = t(buttonTitles[selectedService]);

  return (
    <View style={styles.container}>
      <PrimaryButton
        title={dynamicTitle}
        backgroundColor={COLORS.primary}
        textColor={COLORS.white}
        onPress={() => onNavigate('FarmLocationScreen', {
            serviceType: selectedService.toLowerCase(),
            areaValue: area,
            areaUnit,
            eventType,
            videographyQuantity: videographyQuantity || 30,
            surveillanceKey: surveillanceKey || '',
            surveillanceQuantity: surveillanceQuantity || 1,
            scheduledDate: selectedDate,
            selectedSlots,
            ...(extraParams || {}),
          })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
});

export default BookingButton;
