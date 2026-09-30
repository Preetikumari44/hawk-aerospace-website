import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import SafetyIcon from '../assets/Icons_V02/Icons/SafetyIcon.svg';
import CalendarIcon from '../assets/Icons_V02/Icons/CalendarIcon.svg';
import { useLanguage } from '../../i18n';

const CheckHeader = ({ title, date, location }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {/* <MaterialIcons name="verified-user" size={36} color="#4B5563" /> */}
        <SafetyIcon width={36} height={36} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.infoRow}>
        {/* <MaterialIcons name="calendar-month" size={20} color="#6B7280" /> */}
        <CalendarIcon width={20} height={20} />
        <Text style={styles.infoText}>{date}</Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="location-on" size={20} color="#6B7280" />
        <Text style={styles.infoText}>{location}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginLeft: 12,
    fontSize: 20,
    color: '#2F3542',
    fontWeight: '700',
    flex: 1, // Ensures long titles wrap nicely
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#374151',
  },
});

export default CheckHeader;