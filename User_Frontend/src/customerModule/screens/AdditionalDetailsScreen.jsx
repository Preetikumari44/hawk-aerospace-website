import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';

import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import SubServiceCard from '../components/SubServiceCard';
import CropSelectionModal from '../components/CropSelectionModal';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import DropdownIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';
import { customerApi } from '../../utils/api';
import { calculateServicePrice } from '../../utils/servicePricing';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const CATALOG_SUB_SERVICES = {
  'Crop Health Monitoring (NDVI)': { serviceType: 'monitoring', key: 'crop_health_monitoring' },
  'Precision Spraying': { serviceType: 'spraying', key: 'precision_spraying' },
};

const AdditionalDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const subServices = [
    { title: 'Fertilizer Spraying', image: require('../assets/images/subservice.png') },
    { title: 'Pesticides Spraying', image: require('../assets/images/subservice.png') },
    { title: 'Insecticides Spraying', image: require('../assets/images/subservice.png') },
    { title: 'Crop Health Monitoring (NDVI)', image: require('../assets/images/subservice.png') },
    { title: 'Precision Spraying', image: require('../assets/images/subservice.png') },
  ];

  const crops = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Millets', 'Pulses'];
  const [selectedSubService, setSelectedSubService] = useState('Fertilizer Spraying');
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [instructions, setInstructions] = useState('');
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [estimate, setEstimate] = useState(null);

  const catalogEntry = CATALOG_SUB_SERVICES[selectedSubService];

  useEffect(() => {
    if (catalogEntry) {
      setEstimate(
        calculateServicePrice({
          serviceType: catalogEntry.serviceType,
          key: catalogEntry.key,
          unit: 'per_acre',
          quantity: Number(routeParams?.areaValue || 1),
        }),
      );
      return;
    }

    customerApi
      .estimateBookingPrice({
        cropType: selectedCrop,
        areaValue: routeParams?.areaValue || 1,
        areaUnit: routeParams?.areaUnit || 'acre',
        serviceType: routeParams?.serviceType || 'spraying',
      })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [selectedCrop, routeParams?.areaValue, routeParams?.serviceType, catalogEntry]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Additional Details')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('Select Sub-Service')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {subServices.map((item) => (
            <SubServiceCard
              key={item.title}
              title={t(item.title)}
              image={item.image}
              selected={selectedSubService === item.title}
              onPress={() => setSelectedSubService(item.title)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{t('Select your Crop')}</Text>
        <Pressable style={styles.cropSelector} onPress={() => setCropModalVisible(true)}>
          <Text style={styles.cropText}>{t(selectedCrop)}</Text>
          <DropdownIcon width={24} height={24} />
        </Pressable>

        <View style={styles.labelRow}>
          <Text style={styles.sectionTitleNoMargin}>{t('Any Special Instructions?')}</Text>
        </View>

        <Text style={styles.label}>{t('label')} <Text style={styles.asterisk}>*</Text></Text>
        <TextInput
          multiline
          value={instructions}
          onChangeText={setInstructions}
          placeholder={t('Enter Special instructions for the booking')}
          placeholderTextColor="#9CA3AF"
          style={styles.instructions}
        />

        <View style={styles.dashedDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoTitle}>{t('Estimated Price:')}</Text>
          <Text style={styles.infoValue}>
            {catalogEntry && estimate?.baseAmount
              ? `${t('₹ {{estimatedAmount}}', { estimatedAmount: estimate.baseAmount })} (${t('excl. GST')})`
              : estimate?.estimatedAmount
                ? `₹ ${estimate.estimatedAmount}`
                : t('Calculating...')}
          </Text>
        </View>

        <View style={styles.dashedDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoTitle}>{t('Estimated Service Time:')}</Text>
          <Text style={styles.infoValue}>
            {estimate?.estimatedFlightHours ? `${estimate.estimatedFlightHours} hrs` : t('30 min - 45 min')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.confirmButton}
            onPress={() => {
              const ndviMode = selectedSubService === 'Crop Health Monitoring (NDVI)';
              const precisionMode = selectedSubService === 'Precision Spraying';

              onNavigate('FarmLocationScreen', {
                ...routeParams,
                additionalDetailsCollected: true,
                serviceType: ndviMode ? 'monitoring' : 'spraying',
                cropType: selectedCrop,
                subService: selectedSubService,
                monitoringSubType: ndviMode ? 'crop_health_monitoring' : routeParams?.monitoringSubType,
                unit: ndviMode || precisionMode ? 'per_acre' : routeParams?.unit,
                quantity:
                  ndviMode || precisionMode
                    ? Number(routeParams?.areaValue || 1)
                    : routeParams?.quantity,
                instructions,
                estimate,
              });
            }}
          >
            <Text style={styles.confirmButtonText}>{t('Confirm Booking')}</Text>
          </Pressable>
        </View>

        <CropSelectionModal
          visible={cropModalVisible}
          onClose={() => setCropModalVisible(false)}
          crops={crops}
          selectedCrop={selectedCrop}
          onSelectCrop={setSelectedCrop}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 20 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '600', color: '#2F3542' },
  sectionTitle: { marginTop: 24, marginBottom: 16, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', color: '#374151' },
  sectionTitleNoMargin: { fontSize: 16, fontWeight: '700', color: '#374151' },
  labelRow: { paddingHorizontal: 20, marginTop: 24 },
  horizontalScroll: { paddingHorizontal: 20 },
  cropSelector: {
    height: 54,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  label: { marginTop: 8, marginBottom: 8, paddingHorizontal: 20, fontSize: 14, color: '#6B7280' },
  asterisk: { color: '#EF4444' },
  instructions: {
    marginHorizontal: 20,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    textAlignVertical: 'top',
    color: '#374151',
  },
  dashedDivider: { marginHorizontal: 20, marginTop: 24, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB' },
  infoRow: { marginTop: 24, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  infoValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  buttonContainer: { marginTop: 40, paddingHorizontal: 20 },
  confirmButton: { height: 56, backgroundColor: COLORS.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default AdditionalDetailsScreen;
