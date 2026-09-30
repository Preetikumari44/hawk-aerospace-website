import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';
import { useLanguage } from '../../i18n';

const DeliverablesCard = () => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Deliverables')}</Text>
      <Text style={styles.subtitle}>
        {t('All deliverables have been mailed to you. You can check the list of deliverables below')}
      </Text>

      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{t('Point Cloud')}</Text>
        <Text style={styles.itemDesc}>
          {t('Dense 3D coordinate point datasets in LAS/LAZ format, survey-grade accuracy.')}
        </Text>
      </View>

      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{t('BIM Ready Output')}</Text>
        <Text style={styles.itemDesc}>
          {t('Aligned architectural designs for Revit and Bentley - BIM workflow ready.')}
        </Text>
      </View>

      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{t('Inspection Report')}</Text>
        <Text style={styles.itemDesc}>
          {t('Compliance audit PDFs with defect severity, locations, evidence, recommendations.')}
        </Text>
      </View>

      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>{t('Measurement Report')}</Text>
        <Text style={styles.itemDesc}>
          {t('Auto-extracted heights, volumes, clearances, areas with confidence scores.')}
        </Text>
      </View>

      <View style={styles.buttonWrapper}>
        <Pressable style={styles.downloadButton}>
          <Text style={styles.downloadText}>{t('Download All')}</Text>
          {/* <MaterialIcons name="file-download" size={18} color="#FFFFFF" style={styles.icon} /> */}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  itemContainer: {
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  buttonWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  downloadButton: {
    backgroundColor: '#4F46E5', 
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  icon: {
    marginLeft: 6,
  },
});

export default DeliverablesCard;