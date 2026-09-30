import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import CrossIcon from '../assets/Icons_V02/Icons/CrossIcon.svg';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import DropdownArrowIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';
import { customerApi } from '../../utils/api';
import { findServiceEntry, calculateServicePrice } from '../../utils/servicePricing';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const subServices = [
  'Basic Aerial Mapping',
  'Advanced Mapping (DTM/DSM + contours)',
  'Topographic Mapping',
  'Orthomosaic Mapping',
  '3D Modeling & Reconstruction',
  'Agricultural Mapping',
  'Construction Site Mapping',
  'Forest & Vegetation Mapping',
  'Flood Plain & Water Body Mapping',
  'Infrastructure Mapping',
  'Mining & Quarry Surveys',
];

const infraTypes = [
  'Urban/Residential Area',
  'Agricultural Land',
  'Forest',
  'Industrial Zone',
  'Construction Site',
  'Mining/Quarry Surveys',
  'Coastal/WaterFront Area',
  'River/Lake/Water Body',
  'Highway/Road Network',
];

const MappingAdditionalDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [selectedSubService, setSelectedSubService] = useState('Topographic Mapping');
  const [selectedInfra, setSelectedInfra] = useState('Urban/Residential Area');
  const [isSubServiceModalVisible, setSubServiceModalVisible] = useState(false);
  const [isInfraModalVisible, setInfraModalVisible] = useState(false);
  const [estimate, setEstimate] = useState(null);

  const catalogEntry = findServiceEntry('mapping', selectedSubService);

  useEffect(() => {
    if (catalogEntry) {
      setEstimate(
        calculateServicePrice({
          serviceType: 'mapping',
          key: catalogEntry.key,
          unit: 'per_acre',
          quantity: Number(routeParams?.areaValue || 1),
        }),
      );
      return;
    }

    customerApi
      .estimateBookingPrice({
        cropType: selectedInfra,
        areaValue: routeParams?.areaValue || 1,
        areaUnit: routeParams?.areaUnit || 'acre',
        serviceType: 'mapping',
      })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [selectedInfra, routeParams?.areaValue, routeParams?.areaUnit, catalogEntry]);

  const SelectionModal = ({ visible, onClose, title, options, selectedValue, onSelect }) => {
    const { t, locale } = useLanguage();
    return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <CrossIcon width={28} height={28} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((item) => (
              <Pressable
                key={item}
                style={styles.radioRow}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.radioText}>{t(item)}</Text>
                <Text style={{ color: selectedValue === item ? COLORS.primary : '#6B7280' }}>
                  {selectedValue === item ? t('Selected') : ''}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
    );
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Additional Details')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('Select Sub Service')}</Text>
        <Pressable style={styles.dropdownSelector} onPress={() => setSubServiceModalVisible(true)}>
          <Text style={styles.dropdownText}>{t(selectedSubService)}</Text>
          <DropdownArrowIcon width={24} height={24} />
        </Pressable>

        <Text style={styles.sectionTitle}>{t('Select Your Infrastructure Type')}</Text>
        <Pressable style={styles.dropdownSelector} onPress={() => setInfraModalVisible(true)}>
          <Text style={styles.dropdownText}>{t(selectedInfra)}</Text>
          <DropdownArrowIcon width={24} height={24} />
        </Pressable>

        <View style={styles.dashedDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoTitle}>{t('Estimated Price:')}</Text>
          <Text style={styles.infoValue}>
            {catalogEntry && estimate?.baseAmount
              ? `${t('₹ {{estimatedAmount}}', { estimatedAmount: estimate.baseAmount })} (${t('excl. GST')})`
              : estimate?.estimatedAmount
                ? t('₹ {{estimatedAmount}}', { estimatedAmount: estimate.estimatedAmount })
                : t('Calculating...')}
          </Text>
        </View>

        <View style={styles.dashedDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoTitle}>{t('Estimated Service Time:')}</Text>
          <Text style={styles.infoValue}>
            {estimate?.estimatedFlightHours ? t('{{estimatedFlightHours}} hrs', { estimatedFlightHours: estimate.estimatedFlightHours }) : t('30 min - 45 min')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Pressable
          style={styles.confirmButton}
          onPress={() =>
            onNavigate('FarmLocationScreen', {
              ...routeParams,
              additionalDetailsCollected: true,
              serviceType: 'mapping',
              mappingType: selectedSubService,
              infrastructureType: selectedInfra,
              cropType: selectedInfra,
              unit: catalogEntry ? 'per_acre' : routeParams?.unit,
              quantity: catalogEntry ? Number(routeParams?.areaValue || 1) : routeParams?.quantity,
              estimate,
            })
          }
        >
          <Text style={styles.confirmButtonText}>{t('Confirm Booking')}</Text>
        </Pressable>
      </View>

      <SelectionModal
        visible={isSubServiceModalVisible}
        onClose={() => setSubServiceModalVisible(false)}
        title={t('Select Sub Service')}
        options={subServices}
        selectedValue={selectedSubService}
        onSelect={setSelectedSubService}
      />
      <SelectionModal
        visible={isInfraModalVisible}
        onClose={() => setInfraModalVisible(false)}
        title={t('Select Infrastructure Type')}
        options={infraTypes}
        selectedValue={selectedInfra}
        onSelect={setSelectedInfra}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingTop: 20 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '500', color: '#2F3542' },
  sectionTitle: { marginTop: 24, marginBottom: 12, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', color: '#374151' },
  dropdownSelector: {
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
  dropdownText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  dashedDivider: { marginHorizontal: 20, marginTop: 24, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB' },
  infoRow: { marginTop: 24, marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  infoValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  bottomContainer: { padding: 20, backgroundColor: '#FAFAFA' },
  confirmButton: { height: 56, backgroundColor: COLORS.primary, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#2F3542' },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  radioText: { fontSize: 16, color: '#374151', fontWeight: '500' },
});

export default MappingAdditionalDetailsScreen;
