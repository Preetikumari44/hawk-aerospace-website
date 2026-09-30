import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useLanguage } from '../../i18n';

const BookingDetailRow = ({
  label,
  value,
}) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // REMOVED: marginTop: 18. The parent component will handle the spacing!
  },

  label: {
    fontSize: 16,
    color: '#B9BDF3',
  },

  value: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default BookingDetailRow;