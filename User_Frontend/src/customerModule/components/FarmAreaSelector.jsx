import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';

import PlusIcon from '../assets/Icons_V02/Icons/PlusIcon.svg';
import MinusIcon from '../assets/Icons_V02/Icons/MinusIcon.svg';
import DropdownArrowIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';

import { useLanguage } from '../../i18n';
import {
  SERVICE_CATALOG,
  findServiceEntry,
  calculateServicePrice,
} from '../../utils/servicePricing';

const quickOptions = [2, 5, 10];

const IS_WEB = Platform.OS === 'web';

const UNIT_OPTIONS = [
  { value: 'acre', label: 'Acres' },
  { value: 'hectare', label: 'Hectares' },
  { value: 'sq_m', label: 'Sq. Meters' },
];

const VIDEOGRAPHY_EVENT_TYPES = SERVICE_CATALOG.filter((entry) => entry.serviceType === 'videography');
const SURVEILLANCE_SUB_SERVICES = SERVICE_CATALOG.filter((entry) => entry.serviceType === 'surveillance');

const DURATION_STEP = 30;
const DURATION_MIN = 30;

const getShortUnitLabel = (unit) => {
  const found = UNIT_OPTIONS.find((u) => u.value === unit);
  return found ? found.label : unit;
};

export const DropdownSelect = ({
  placeholder,
  options,
  value,
  onSelect,
  wrapperStyle,
  onOpenChange,
}) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const selectedOption = options.find((opt) => opt.value === value);

  const closeMenu = useCallback(() => {
    setOpen(false);
    if (onOpenChange) onOpenChange(false);
  }, [onOpenChange]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  const handleSelect = (optValue) => {
    onSelect(optValue);
    closeMenu();
  };

  useEffect(() => {
    if (Platform.OS === 'web' && open) {
      const handlePointerDown = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          closeMenu();
        }
      };
      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }
  }, [open, closeMenu]);

  return (
    <View
      ref={wrapperRef}
      style={[
        styles.dropdownWrapper,
        wrapperStyle,
      ]}
    >
      <Pressable style={styles.dropdownSelector} onPress={toggleOpen}>
        <Text
          style={[styles.dropdownText, !selectedOption && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {selectedOption ? t(selectedOption.label) : t(placeholder)}
        </Text>
        <DropdownArrowIcon width={20} height={20} />
      </Pressable>

      {open && (
        <>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View
            ref={menuRef}
            style={[
              styles.dropdownMenu,
              { top: '100%', left: 0, right: 0, marginTop: 4 }
            ]}
          >
            <ScrollView
              style={styles.dropdownMenuScroll}
              contentContainerStyle={styles.dropdownMenuContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.dropdownOption, isActive && styles.dropdownOptionActive]}
                    onPress={() => handleSelect(opt.value)}
                  >
                    <Text style={[styles.dropdownOptionText, isActive && styles.dropdownOptionTextActive]}>
                      {t(opt.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

const FarmAreaSelector = ({
  selectedService,
  area,
  setArea,
  areaUnit,
  setAreaUnit,
  eventType,
  setEventType,
  videographyQuantity,
  setVideographyQuantity,
  surveillanceKey,
  setSurveillanceKey,
  surveillanceQuantity,
  setSurveillanceQuantity,
  scheduledDate,
  timeSlot,
  onDropdownOpenChange,
}) => {
  const { t } = useLanguage();
  const [internalArea, setInternalArea] = useState(1);
  const [internalUnit, setInternalUnit] = useState('acre');
  const [internalEventType, setInternalEventType] = useState('');
  const [internalVideoQty, setInternalVideoQty] = useState(DURATION_MIN);
  const [internalSurveillanceKey, setInternalSurveillanceKey] = useState('');
  const [internalSurveillanceQty, setInternalSurveillanceQty] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleOpenChange = (open) => {
    setIsDropdownOpen(open);
    if (onDropdownOpenChange) onDropdownOpenChange(open);
  };

  const currentArea = area ?? internalArea;
  const updateArea = setArea ?? setInternalArea;
  const currentUnit = areaUnit ?? internalUnit;
  const updateUnit = setAreaUnit ?? setInternalUnit;
  const currentEventType = eventType ?? internalEventType;
  const updateEventType = setEventType ?? setInternalEventType;
  const currentVideoQty = videographyQuantity ?? internalVideoQty;
  const updateVideoQty = setVideographyQuantity ?? setInternalVideoQty;
  const currentSurveillanceKey = surveillanceKey ?? internalSurveillanceKey;
  const updateSurveillanceKey = setSurveillanceKey ?? setInternalSurveillanceKey;
  const currentSurveillanceQty = surveillanceQuantity ?? internalSurveillanceQty;
  const updateSurveillanceQty = setSurveillanceQuantity ?? setInternalSurveillanceQty;

  if (!selectedService || selectedService === 'Delivery') {
    return null;
  }

  const preferredTime = Array.isArray(timeSlot) && timeSlot[0] ? timeSlot[0] : timeSlot;

  if (selectedService === 'Videography') {
    const selectedEntry = findServiceEntry('videography', currentEventType);
    const isDuration = selectedEntry && selectedEntry.defaultUnit === 'min';
    const videoUnit = selectedEntry ? selectedEntry.defaultUnit : 'min';
    const estimate = selectedEntry
      ? calculateServicePrice({
          serviceType: 'videography',
          key: currentEventType,
          unit: videoUnit,
          quantity: currentVideoQty,
          scheduledDate,
          preferredTime,
        })
      : null;

    const decVideo = () =>
      updateVideoQty((prev) => {
        const next = (prev || DURATION_MIN) - (isDuration ? DURATION_STEP : 1);
        return Math.max(isDuration ? DURATION_MIN : 1, next);
      });
    const incVideo = () =>
      updateVideoQty((prev) => (prev || 0) + (isDuration ? DURATION_STEP : 1));

    return (
      <View style={[styles.container, isDropdownOpen && { zIndex: 2000 }]}>
        <Text style={styles.heading}>{t('Select Event Type')}</Text>

        <DropdownSelect
          placeholder="Select Event Type"
          options={VIDEOGRAPHY_EVENT_TYPES.map((et) => ({ value: et.key, label: et.label }))}
          value={currentEventType}
          onSelect={(key) => {
            updateEventType(key);
            const et = VIDEOGRAPHY_EVENT_TYPES.find((item) => item.key === key);
            updateVideoQty(et?.defaultQuantity ?? (et?.defaultUnit === 'min' ? DURATION_MIN : 1));
          }}
          onOpenChange={handleOpenChange}
        />

        {selectedEntry && (
          <>
            <Text style={styles.sectionLabel}>
              {isDuration ? t('Duration (minutes)') : t('Number of properties')}
            </Text>
            <View style={styles.row}>
              <View style={styles.counterContainer}>
                <Pressable onPress={decVideo} style={styles.iconHitbox}>
                  <MinusIcon width={18} height={18} />
                </Pressable>
                <Text style={styles.areaValue}>{currentVideoQty}</Text>
                <Pressable onPress={incVideo} style={styles.iconHitbox}>
                  <PlusIcon width={18} height={18} />
                </Pressable>
              </View>
              <View style={styles.acresBox}>
                <Text style={styles.acresText}>{t(estimate?.unitLabel || (isDuration ? 'min' : 'property'))}</Text>
              </View>
            </View>
          </>
        )}

        {/*{!selectedEntry && (
          <Text style={styles.helperText}>
            {t('Select the type of event you want to capture.')}
          </Text>
        )}*/}
      </View>
    );
  }

  if (selectedService === 'Surveillance') {
    const selectedEntry = findServiceEntry('surveillance', currentSurveillanceKey);
    const survUnit = selectedEntry ? selectedEntry.defaultUnit : null;
    const estimate = selectedEntry
      ? calculateServicePrice({
          serviceType: 'surveillance',
          key: currentSurveillanceKey,
          unit: survUnit,
          quantity: currentSurveillanceQty,
          scheduledDate,
          preferredTime,
        })
      : null;

    const decSurv = () => updateSurveillanceQty((prev) => Math.max(1, (prev || 1) - 1));
    const incSurv = () => updateSurveillanceQty((prev) => (prev || 0) + 1);

    return (
      <View style={[styles.container, isDropdownOpen && { zIndex: 2000 }]}>
        <Text style={styles.heading}>{t('Select Sub-Service')}</Text>

        <DropdownSelect
          placeholder="Select Sub-Service"
          options={SURVEILLANCE_SUB_SERVICES.map((entry) => ({ value: entry.key, label: entry.label }))}
          value={currentSurveillanceKey}
          onSelect={(key) => {
            updateSurveillanceKey(key);
            updateSurveillanceQty(1);
          }}
          onOpenChange={handleOpenChange}
        />

        {selectedEntry && (
          <>
            <Text style={styles.sectionLabel}>{t('Duration / Coverage')}</Text>
            <View style={styles.row}>
              <View style={styles.counterContainer}>
                <Pressable onPress={decSurv} style={styles.iconHitbox}>
                  <MinusIcon width={18} height={18} />
                </Pressable>
                <Text style={styles.areaValue}>{currentSurveillanceQty}</Text>
                <Pressable onPress={incSurv} style={styles.iconHitbox}>
                  <PlusIcon width={18} height={18} />
                </Pressable>
              </View>
              <View style={styles.acresBox}>
                <Text style={styles.acresText}>{t(estimate?.unitLabel || '')}</Text>
              </View>
            </View>
          </>
        )}

        {!selectedEntry && (
          <Text style={styles.helperText}>
            {t('Select a sub-service to see pricing.')}
          </Text>
        )}
      </View>
    );
  }

  const heading = selectedService === 'Mapping'
    ? t('Enter Your Land Area')
    : (selectedService === 'Spraying' ? t('Enter Your Farm Area') : t('Enter Your Event Area'));

  const getHelperText = () => {
    const unitLabel = getShortUnitLabel(currentUnit).toLowerCase();
    if (selectedService === 'Mapping' || selectedService === 'Surveillance') {
      return t('For Flat Lands surfaces - enter area in {{unit}}', { unit: unitLabel });
    }
    return t('For Agriculture Farms - enter area in {{unit}}', { unit: unitLabel });
  };

  return (
    <View style={[styles.container, isDropdownOpen && { zIndex: 2000 }]}>
      <Text style={styles.heading}>{heading}</Text>

      <View style={styles.row}>
        <View style={styles.counterContainer}>
          <Pressable onPress={() => updateArea((prev) => Math.max(1, prev - 1))} style={styles.iconHitbox}>
            <MinusIcon width={16} height={16} />
          </Pressable>
          <Text style={styles.areaValue}>{currentArea}</Text>
          <Pressable onPress={() => updateArea((prev) => prev + 1)} style={styles.iconHitbox}>
            <PlusIcon width={16} height={16} />
          </Pressable>
        </View>

        <DropdownSelect
          placeholder="Select Area Unit"
          options={UNIT_OPTIONS}
          value={currentUnit}
          onSelect={updateUnit}
          wrapperStyle={styles.unitDropdown}
          onOpenChange={handleOpenChange}
        />
      </View>

      {/*<Text style={styles.helperText}>
        {getHelperText()}
      </Text>*/}

      <View style={styles.quickRow}>
        <Text style={styles.quickLabel}>{t('Quick:')}</Text>
        {quickOptions.map((item) => {
          const isSelected = currentArea === item;
          return (
            <Pressable
              key={item}
              style={[styles.quickButton, isSelected && styles.quickButtonSelected]}
              onPress={() => updateArea(item)}
            >
              <Text style={[styles.quickButtonText, isSelected && styles.quickButtonTextSelected]}>
                {item} {t(getShortUnitLabel(currentUnit))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
  },
  heading: {
    ...TYPOGRAPHY.titleMediumEmphasized,
    color: '#2F3542',
    fontWeight: 'bold',
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelMediumEmphasized,
    color: '#4B5563',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  counterContainer: {
    flex: 1.7,
    //height: 35,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconHitbox: {
    padding: 2,
  },
  areaValue: {
    ...TYPOGRAPHY.titleMediumEmphasized,
    color: COLORS.primary,
  },
  acresBox: {
    flex: 0.7,
    //width: 110,
    //height: 35,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  acresText: {
    ...TYPOGRAPHY.bodySmall,
    color: '#6B7280',
  },
  unitDropdown: {
    flex: 1,
    //width: 140,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  backdrop: {
    position: 'absolute',
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  // WEB ONLY: while the menu is open, hoist the whole wrapper far above every
  // sibling section so the absolutely-positioned menu can never underlap the
  // components rendered below it. Native keeps the original styles untouched.
  dropdownWrapperOpenWeb: {
    zIndex: 1000,
  },
  dropdownSelector: {
    //height: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 9999,
  },
  dropdownMenuScroll: {
    //maxHeight: 220,
    flexGrow: 0,
  },
  dropdownMenuContent: {
    paddingVertical: 2,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownOptionActive: {
    backgroundColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dropdownOptionCheck: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  helperText: {
    ...TYPOGRAPHY.labelMedium,
    color: '#4B5563',
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  quickLabel: {
    ...TYPOGRAPHY.labelMediumEmphasized,
    color: '#4B5563',
  },
  quickButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  quickButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickButtonText: {
    ...TYPOGRAPHY.labelMedium,
    color: '#6B7280',
  },
  quickButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default FarmAreaSelector;
