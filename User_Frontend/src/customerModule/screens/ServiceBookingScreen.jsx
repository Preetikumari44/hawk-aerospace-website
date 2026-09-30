import React, { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';

import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import FarmAreaSelector, { DropdownSelect } from '../components/FarmAreaSelector';
import DateCard from '../components/DateCard';
import TimeSlotSelector from '../components/TimeSlotSelector';
import PriceEstimateCard from '../components/PriceEstimateCard';
import BookingButton from '../components/BookingButton';
import SubServiceCard from '../components/SubServiceCard';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { findServiceEntry, calculateServicePrice } from '../../utils/servicePricing';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const AREA_TO_ACRES = { acre: 1, hectare: 2.47105, sq_m: 1 / 4046.8564224 };

const SPRAYING_SUB_SERVICES = [
  { title: 'Fertilizer Spraying', image: require('../assets/images/subservice.png') },
  { title: 'Pesticides Spraying', image: require('../assets/images/subservice.png') },
  { title: 'Insecticides Spraying', image: require('../assets/images/subservice.png') },
  { title: 'Crop Health Monitoring (NDVI)', image: require('../assets/images/subservice.png') },
  { title: 'Precision Spraying', image: require('../assets/images/subservice.png') },
];

const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Millets', 'Pulses'];

const MAPPING_SUB_SERVICES = [
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

const INFRASTRUCTURE_TYPES = [
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

const SERVICE_META = {
  Videography: {
    title: 'Videography',
    icon: require('../assets/images/DroneVideographyIcon.png'),
  },
  Spraying: {
    title: 'Spraying',
    icon: require('../assets/images/DroneSprayingIcon.png'),
  },
  Mapping: {
    title: 'Mapping',
    icon: require('../assets/images/DroneMappingIcon.png'),
  },
  Surveillance: {
    title: 'Surveillance',
    icon: require('../assets/images/DroneSurveillanceIcon.png'),
  },
};

const ServiceBookingScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const selectedService = routeParams?.service && SERVICE_META[routeParams.service]
    ? routeParams.service
    : '';
  const meta = selectedService ? SERVICE_META[selectedService] : null;

  const [selectedSubService, setSelectedSubService] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedMappingType, setSelectedMappingType] = useState('');
  const [selectedInfra, setSelectedInfra] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [area, setArea] = useState(1);
  const [areaUnit, setAreaUnit] = useState('acre');
  const [eventType, setEventType] = useState('');
  const [videographyQuantity, setVideographyQuantity] = useState(30);
  const [surveillanceKey, setSurveillanceKey] = useState('');
  const [surveillanceQuantity, setSurveillanceQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [instructions, setInstructions] = useState('');

  const isSpraying = selectedService === 'Spraying';
  const isMapping = selectedService === 'Mapping';

  // ── Progressive reveal ───────────────────────────────────────────────────
  // Spraying requires sub-service selection before farm area.
  // Mapping requires both sub-service and infrastructure type selection before land area.
  const showFarmArea = isSpraying
    ? Boolean(selectedSubService)
    : isMapping
      ? Boolean(selectedMappingType) && Boolean(selectedInfra)
      : Boolean(selectedService);

  const hasServiceConfig = isSpraying
    ? Boolean(selectedSubService) && Boolean(selectedCrop)
    : isMapping
      ? Boolean(selectedMappingType) && Boolean(selectedInfra)
      : selectedService === 'Videography'
        ? Boolean(eventType)
        : selectedService === 'Surveillance'
          ? Boolean(surveillanceKey)
          : false;
  const showDateSection = hasServiceConfig;
  const showTimeSection = showDateSection && Boolean(selectedDate);
  const showInstructions = isSpraying && showTimeSection;
  const showBooking = showTimeSection && selectedSlots.length > 0;

  // Catalog estimate for the picked sub-service — forwarded to the location
  // screen exactly like the previous AdditionalDetails screens did.
  const catalogEntry = useMemo(() => {
    if (isSpraying) {
      return selectedSubService === 'Crop Health Monitoring (NDVI)'
        ? findServiceEntry('monitoring', 'crop_health_monitoring')
        : selectedSubService === 'Precision Spraying'
          ? findServiceEntry('spraying', 'precision_spraying')
          : null;
    }
    if (isMapping) {
      return findServiceEntry('mapping', selectedMappingType);
    }
    return null;
  }, [isSpraying, isMapping, selectedSubService, selectedMappingType]);

  const areaInAcres = Math.round(Number(area) * (AREA_TO_ACRES[areaUnit] ?? 1) * 100) / 100;

  const estimate = useMemo(() => {
    if (!catalogEntry || !showBooking) {
      return null;
    }
    return calculateServicePrice({
      serviceType: catalogEntry.serviceType,
      key: catalogEntry.key,
      unit: 'per_acre',
      quantity: areaInAcres,
      scheduledDate: selectedDate,
      preferredTime: Array.isArray(selectedSlots) ? selectedSlots[0] : undefined,
    });
  }, [catalogEntry, showBooking, areaInAcres, selectedDate, selectedSlots]);

  const bookingExtraParams = useMemo(() => {
    if (isSpraying) {
      const ndviMode = selectedSubService === 'Crop Health Monitoring (NDVI)';
      return {
        additionalDetailsCollected: true,
        serviceType: ndviMode ? 'monitoring' : 'spraying',
        cropType: selectedCrop,
        subService: selectedSubService,
        monitoringSubType: ndviMode ? 'crop_health_monitoring' : undefined,
        unit: ndviMode || selectedSubService === 'Precision Spraying' ? 'per_acre' : undefined,
        quantity: ndviMode || selectedSubService === 'Precision Spraying' ? areaInAcres : undefined,
        instructions,
        estimate,
      };
    }
    if (isMapping) {
      return {
        additionalDetailsCollected: true,
        serviceType: 'mapping',
        mappingType: selectedMappingType,
        infrastructureType: selectedInfra,
        cropType: selectedInfra,
        unit: catalogEntry ? 'per_acre' : undefined,
        quantity: catalogEntry ? areaInAcres : undefined,
        estimate,
      };
    }
    return undefined;
  }, [
    isSpraying,
    isMapping,
    selectedSubService,
    selectedCrop,
    instructions,
    areaInAcres,
    estimate,
    selectedMappingType,
    selectedInfra,
    catalogEntry,
  ]);

  if (!meta) {
    return (
      <ScreenContainer backgroundColor="#FAFAFA">
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
        </View>
        <Text style={styles.emptyState}>
          {t('Select a service to continue')}
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t(meta.title)}</Text>
          <Image source={meta.icon} style={styles.headingIcon} resizeMode="contain" />
        </View>

        {/* ── Spraying: sub-service cards then crop selector ── */}
        {isSpraying && (
          <>
            <View style={styles.subService}>
              <Text style={styles.sectionTitle}>{t('Select Sub-Service')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {SPRAYING_SUB_SERVICES.map((item) => (
                  <SubServiceCard
                    key={item.title}
                    title={t(item.title)}
                    image={item.image}
                    selected={selectedSubService === item.title}
                    onPress={() => setSelectedSubService(item.title)}
                  />
                ))}
              </ScrollView>
            </View>

            {Boolean(selectedSubService) && (
              <View style={[styles.dropdownSection, { zIndex: openDropdown === 'crop' ? 3000 : 3 }]}>
                <Text style={styles.sectionTitle}>{t('Select your Crop')}</Text>
                <DropdownSelect
                  placeholder="Select your Crop"
                  options={CROPS.map((c) => ({ value: c, label: c }))}
                  value={selectedCrop}
                  onSelect={(crop) => setSelectedCrop(crop)}
                  onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'crop' : null)}
                />
              </View>
            )}
          </>
        )}

        {/* ── Mapping: sub-service dropdown then infrastructure type ── */}
        {isMapping && (
          <>
            <View style={[styles.dropdownSection, { zIndex: openDropdown === 'mappingType' ? 4000 : 4 }]}>
              <Text style={styles.sectionTitle}>{t('Select Sub Service')}</Text>
              <DropdownSelect
                placeholder="Select Sub Service"
                options={MAPPING_SUB_SERVICES.map((s) => ({ value: s, label: s }))}
                value={selectedMappingType}
                onSelect={(type) => setSelectedMappingType(type)}
                onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'mappingType' : null)}
              />
            </View>

            {Boolean(selectedMappingType) && (
              <View style={[styles.dropdownSection, { zIndex: openDropdown === 'infra' ? 3000 : 3 }]}>
                <Text style={styles.sectionTitle}>{t('Select Your Infrastructure Type')}</Text>
                <DropdownSelect
                  placeholder="Select Your Infrastructure Type"
                  options={INFRASTRUCTURE_TYPES.map((i) => ({ value: i, label: i }))}
                  value={selectedInfra}
                  onSelect={(infra) => setSelectedInfra(infra)}
                  onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'infra' : null)}
                />
              </View>
            )}
          </>
        )}

        {/* ── Shared booking components, in order ── */}
        {showFarmArea && (
          <View style={{ zIndex: openDropdown === 'farmArea' ? 2000 : 2 }}>
            <FarmAreaSelector
              selectedService={selectedService}
              area={area}
              setArea={setArea}
              areaUnit={areaUnit}
              setAreaUnit={setAreaUnit}
              eventType={eventType}
              setEventType={setEventType}
              videographyQuantity={videographyQuantity}
              setVideographyQuantity={setVideographyQuantity}
              surveillanceKey={surveillanceKey}
              setSurveillanceKey={setSurveillanceKey}
              surveillanceQuantity={surveillanceQuantity}
              setSurveillanceQuantity={setSurveillanceQuantity}
              scheduledDate={selectedDate}
              timeSlot={selectedSlots}
              onDropdownOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'farmArea' : null)}
            />
          </View>
        )}

        {showDateSection && (
          <View style={{ zIndex: 1 }}>
            <DateCard selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          </View>
        )}

        {showTimeSection && (
          <View style={{ zIndex: 1 }}>
            <TimeSlotSelector
              selectedService={selectedService}
              selectedSlots={selectedSlots}
              setSelectedSlots={setSelectedSlots}
            />
          </View>
        )}

        {showInstructions && (
          <>
            <Text style={styles.instructionsLabel}>
              {t('Any Special Instructions?')} <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              multiline
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t('Enter Special instructions for the booking')}
              placeholderTextColor="#9CA3AF"
              style={styles.instructions}
            />
          </>
        )}

        {showBooking && (
          <>
            <PriceEstimateCard
              selectedService={selectedService}
              area={area}
              areaUnit={areaUnit}
              eventType={eventType}
              videographyQuantity={videographyQuantity}
              surveillanceKey={surveillanceKey}
              surveillanceQuantity={surveillanceQuantity}
              scheduledDate={selectedDate}
              timeSlot={selectedSlots}
            />
            <BookingButton
              selectedService={selectedService}
              area={area}
              areaUnit={areaUnit}
              eventType={eventType}
              selectedDate={selectedDate}
              selectedSlots={selectedSlots}
              videographyQuantity={videographyQuantity}
              surveillanceKey={surveillanceKey}
              surveillanceQuantity={surveillanceQuantity}
              onNavigate={onNavigate}
              extraParams={bookingExtraParams}
            />
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    gap: 20,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  heading: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#2F3542',
    flex: 1,
  },
  headingIcon: {
    width: 40,
    height: 40,
  },
  sectionTitle: {
    //marginTop: 16,
    //marginBottom: 12,
    //paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  subService: {
    paddingHorizontal: 20,
    gap: 12
  },
  dropdownSection: {
    gap: 8,
    position: 'relative',
    paddingHorizontal: 20,
  },
  horizontalScroll: {
    //paddingHorizontal: 20,
  },
  dropdownSelector: {
    //height: 54,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  instructionsLabel: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  asterisk: {
    color: '#EF4444',
  },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F3542',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  radioText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  radioSelected: {
    color: COLORS.primary,
  },
  radioIdle: {
    color: '#6B7280',
  },
  emptyState: {
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
});

export default ServiceBookingScreen;
