import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../i18n';

const PersonalDetailsCard = ({ customerName, customerPhone, customerEmail }) => {
  const { t } = useLanguage();
  const rows = [
    { label: t('Name'), value: customerName || t('Not provided') },
    { label: t('Phone'), value: customerPhone || t('Not provided') },
    { label: t('Email'), value: customerEmail || t('Not provided') },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Personal Details')}</Text>
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
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    color: '#2F3542',
    textAlign: 'right',
    flexShrink: 1,
  },
});

export default PersonalDetailsCard;