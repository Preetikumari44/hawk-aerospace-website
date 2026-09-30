import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../i18n';

const InfoRow = ({ title, value }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.dot} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40, // Brought in tighter to match Figma
    marginBottom: 16, // Space between rows
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981', // Figma green dot
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});

export default InfoRow;