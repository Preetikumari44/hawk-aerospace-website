import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import LocationPickerMap from '../components/LocationPickerMap';
import { useLanguage } from '../../i18n';
import { mapsApi } from '../../utils/api';
import { isPlaceholderLocation } from '../../utils/bookingFormat';
import { useTabBarPadding } from '../../utils/responsive';

const getTermForService = (serviceType) => {
  const st = String(serviceType || '').toLowerCase();
  switch (st) {
    case 'mapping':
      return {
        term: 'Land',
        heading: 'Enter your Land Location',
        saveLabel: 'Save Land',
        placeholder: 'Enter Land Name',
        confirmBtn: 'Confirm Land Location',
        defaultName: 'Saved Land',
      };
    case 'videography':
      return {
        term: 'Event',
        heading: 'Enter your Event Location',
        saveLabel: 'Save Event',
        placeholder: 'Enter Event Name',
        confirmBtn: 'Confirm Event Location',
        defaultName: 'Saved Event Location',
      };
    case 'surveillance':
      return {
        term: 'Site',
        heading: 'Enter your Site Location',
        saveLabel: 'Save Site',
        placeholder: 'Enter Site Name',
        confirmBtn: 'Confirm Site Location',
        defaultName: 'Saved Site Location',
      };
    case 'spraying':
    default:
      return {
        term: 'Farm',
        heading: 'Enter your Farm Location',
        saveLabel: 'Save Farm',
        placeholder: 'Enter Farm Name',
        confirmBtn: 'Confirm Farm Location',
        defaultName: 'Saved Farm',
      };
  }
};

const parseAddressDetails = (addressStr, addressComponents = []) => {
  // If we have structured address components from Google, use those for accuracy
  if (addressComponents && addressComponents.length > 0) {
    const getComponent = (types) => {
      for (const component of addressComponents) {
        if (types.some((t) => component.types.includes(t))) {
          return component.long_name;
        }
      }
      return '';
    };

    // Extract pincode from postal_code component
    const pincode = getComponent(['postal_code']);

    // Extract city - try locality first, then administrative_area_level_2, then sublocality
    const city = getComponent(['locality', 'administrative_area_level_2', 'sublocality', 'sublocality_level_1']);

    // Extract state from administrative_area_level_1
    const state = getComponent(['administrative_area_level_1']);

    // Build address line 1 from street_number + route, or from neighborhood/sublocality
    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const neighborhood = getComponent(['neighborhood']);
    const premise = getComponent(['premise', 'point_of_interest']);

    let addressLine1 = '';
    if (streetNumber && route) {
      addressLine1 = `${streetNumber} ${route}`;
    } else if (route) {
      addressLine1 = route;
    } else if (neighborhood) {
      addressLine1 = neighborhood;
    } else if (premise) {
      addressLine1 = premise;
    }

    // Address line 2 from sublocality or subpremise
    const sublocality = getComponent(['sublocality', 'sublocality_level_2']);
    const subpremise = getComponent(['subpremise']);
    const addressLine2 = subpremise || sublocality || '';

    return {
      addressLine1: addressLine1 || addressStr.split(',')[0] || '',
      addressLine2,
      city,
      state,
      pincode,
    };
  }

  // Fallback: Parse from formatted address string
  if (!addressStr || typeof addressStr !== 'string') {
    return { addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };
  }
  const cleanStr = addressStr.trim();
  if (!cleanStr || isPlaceholderLocation(cleanStr)) {
    return { addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };
  }

  // Remove Plus Codes (e.g., "336W+G4") from the address string
  const withoutPlusCode = cleanStr.replace(/\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\s*/g, '').trim();
  const finalStr = withoutPlusCode || cleanStr;

  const rawParts = finalStr.split(',').map((s) => s.trim()).filter(Boolean);

  let pincode = '';
  const pinMatch = finalStr.match(/\b\d{6}\b/);
  if (pinMatch) {
    pincode = pinMatch[0];
  }

  // Filter out country name if present
  const cleanParts = rawParts.filter((p) => !/^india$/i.test(p));

  let addressLine1 = '';
  let addressLine2 = '';
  let city = '';
  let state = '';

  if (cleanParts.length === 1) {
    addressLine1 = cleanParts[0];
  } else if (cleanParts.length === 2) {
    addressLine1 = cleanParts[0];
    state = cleanParts[1].replace(/\b\d{6}\b/, '').trim();
  } else if (cleanParts.length === 3) {
    addressLine1 = cleanParts[0];
    city = cleanParts[1];
    state = cleanParts[2].replace(/\b\d{6}\b/, '').trim();
  } else if (cleanParts.length >= 4) {
    addressLine1 = cleanParts[0];
    addressLine2 = cleanParts.slice(1, -2).join(', ');
    city = cleanParts[cleanParts.length - 2];
    state = cleanParts[cleanParts.length - 1].replace(/\b\d{6}\b/, '').trim();
  }

  return {
    addressLine1: addressLine1 || finalStr,
    addressLine2: addressLine2 || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
  };
};

const FarmMapScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const svc = routeParams?.serviceType;
  const terms = getTermForService(svc);
  const isMapping = svc === 'mapping';
  const isSpraying = svc === 'spraying';
  const isWeb = Platform.OS === 'web';
  const isAggregatorFlow = Boolean(routeParams?.customerUid);

  const [selectedLocation, setSelectedLocation] = useState(
    routeParams?.location || null
  );
  const [selectedAddress, setSelectedAddress] = useState(
    routeParams?.address || ''
  );
  const [farmName, setFarmName] = useState(routeParams?.farmName || '');

  // Detailed address state
  const initialDetails = parseAddressDetails(routeParams?.address || '');
  const [addressLine1, setAddressLine1] = useState(routeParams?.detailedAddress?.addressLine1 || initialDetails.addressLine1);
  const [addressLine2, setAddressLine2] = useState(routeParams?.detailedAddress?.addressLine2 || initialDetails.addressLine2);
  const [city, setCity] = useState(routeParams?.detailedAddress?.city || initialDetails.city);
  const [state, setState] = useState(routeParams?.detailedAddress?.state || initialDetails.state);
  const [pincode, setPincode] = useState(routeParams?.detailedAddress?.pincode || initialDetails.pincode);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(Boolean(routeParams?.detailedAddress));

  // Reverse geocode location on mount or when location changes to prefill city, state, pincode
  useEffect(() => {
    let disposed = false;
    if (selectedLocation?.lat && selectedLocation?.lng) {
      mapsApi.reverseGeocode(selectedLocation.lat, selectedLocation.lng)
        .then((result) => {
          if (!disposed && result) {
            const formattedAddress = result.formattedAddress || result.address;
            if (formattedAddress) {
              setSelectedAddress(formattedAddress);
              const parsed = parseAddressDetails(formattedAddress, result.addressComponents);
              if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
              if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
              if (parsed.city) setCity(parsed.city);
              if (parsed.state) setState(parsed.state);
              if (parsed.pincode) setPincode(parsed.pincode);
            }
          }
        })
        .catch((err) => {
          console.warn('Reverse geocode error on FarmMapScreen:', err);
        });
    }
    return () => {
      disposed = true;
    };
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  const handleLocationSelect = useCallback(async (loc) => {
    setSelectedLocation(loc);
    try {
      const result = await mapsApi.reverseGeocode(loc.lat, loc.lng);
      if (result) {
        const formattedAddress = result.formattedAddress || result.address;
        if (formattedAddress) {
          setSelectedAddress(formattedAddress);
          const parsed = parseAddressDetails(formattedAddress, result.addressComponents);
          if (!hasManuallyEdited) {
            if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
            if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
            if (parsed.city) setCity(parsed.city);
            if (parsed.state) setState(parsed.state);
            if (parsed.pincode) setPincode(parsed.pincode);
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error on location select:', err);
    }
  }, [hasManuallyEdited]);

  const handleSearchResult = useCallback(({ address, location }) => {
    setSelectedAddress(address);
    setSelectedLocation(location);
    if (!hasManuallyEdited) {
      const parsed = parseAddressDetails(address);
      if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
      if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
      if (parsed.city) setCity(parsed.city);
      if (parsed.state) setState(parsed.state);
      if (parsed.pincode) setPincode(parsed.pincode);
    }
  }, [hasManuallyEdited]);

  const handleConfirm = useCallback(async () => {
    if (!selectedLocation) return;
    let resolvedAddress = selectedAddress;
    if (isPlaceholderLocation(selectedAddress)) {
      try {
        const result = await mapsApi.reverseGeocode(selectedLocation.lat, selectedLocation.lng);
        if (result) {
          const formattedAddress = result.formattedAddress || result.address;
          if (formattedAddress) {
            resolvedAddress = formattedAddress;
            setSelectedAddress(formattedAddress);
            if (!hasManuallyEdited) {
              const parsed = parseAddressDetails(formattedAddress, result.addressComponents);
              if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
              if (parsed.addressLine2) setAddressLine2(parsed.addressLine2);
              if (parsed.city) setCity(parsed.city);
              if (parsed.state) setState(parsed.state);
              if (parsed.pincode) setPincode(parsed.pincode);
            }
          }
        }
      } catch (err) {
        console.error('Reverse geocode failed', err);
      }
    }

    const detailedAddress = {
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    };

    const formattedParts = [
      addressLine1.trim(),
      addressLine2.trim(),
      city.trim(),
      state.trim(),
      pincode.trim(),
    ].filter(Boolean);

    const fullFormattedAddress = formattedParts.length > 0
      ? formattedParts.join(', ')
      : resolvedAddress || 'Selected Location';

    let nextScreen;
    if (isMapping) {
      nextScreen = isAggregatorFlow && !routeParams?.additionalDetailsCollected
        ? 'MappingAdditionalDetailsScreen'
        : 'PaymentSelectionScreen';
    } else if (isSpraying) {
      nextScreen = isAggregatorFlow && !routeParams?.additionalDetailsCollected
        ? 'AdditionalDetailsScreen'
        : 'PaymentSelectionScreen';
    } else {
      nextScreen = 'PaymentSelectionScreen';
    }

    onNavigate(nextScreen, {
      ...routeParams,
      mode: 'service',
      address: fullFormattedAddress,
      detailedAddress,
      location: selectedLocation,
      farmName: farmName || t(terms.defaultName),
    });
  }, [
    selectedLocation,
    selectedAddress,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    farmName,
    routeParams,
    isMapping,
    isSpraying,
    isAggregatorFlow,
    terms,
    t,
    onNavigate,
    hasManuallyEdited,
  ]);

  const content = (
    <>
      <LocationPickerMap
        initialRegion={
          routeParams?.location
            ? {
                latitude: routeParams.location.lat,
                longitude: routeParams.location.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : {
                latitude: 20.5937,
                longitude: 78.9629,
                latitudeDelta: 5,
                longitudeDelta: 5,
              }
        }
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        onSearchResult={handleSearchResult}
        style={styles.mapSection}
      />

      {/* "Draw Farm Boundary" button hidden for now as per requirement 3 */}

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <Pressable onPress={() => onNavigate('Back')} hitSlop={8}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>
            {t(terms.heading)}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: tabBarPadding }]}
        >
          <Text style={styles.label}>
            {t(terms.saveLabel)}
          </Text>
          <TextInput
            placeholder={t(terms.placeholder)}
            placeholderTextColor="#9CA3AF"
            value={farmName}
            onChangeText={setFarmName}
            style={styles.input}
          />

          {/* Detailed Address Fields (Req 4) */}
          <Text style={styles.sectionHeader}>{t('Detailed Address')}</Text>

          <Text style={styles.fieldLabel}>{t('Address Line 1')} *</Text>
          <TextInput
            placeholder={t('House / Flat / Building / Street')}
            placeholderTextColor="#9CA3AF"
            value={addressLine1}
            onChangeText={(txt) => {
              setAddressLine1(txt);
              setHasManuallyEdited(true);
            }}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>{t('Address Line 2')}</Text>
          <TextInput
            placeholder={t('Area / Landmark (Optional)')}
            placeholderTextColor="#9CA3AF"
            value={addressLine2}
            onChangeText={(txt) => {
              setAddressLine2(txt);
              setHasManuallyEdited(true);
            }}
            style={styles.input}
          />

          <View style={styles.rowTwoCols}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>{t('City')}</Text>
              <TextInput
                placeholder={t('City / Town')}
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={(txt) => {
                  setCity(txt);
                  setHasManuallyEdited(true);
                }}
                style={styles.input}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>{t('State')}</Text>
              <TextInput
                placeholder={t('State')}
                placeholderTextColor="#9CA3AF"
                value={state}
                onChangeText={(txt) => {
                  setState(txt);
                  setHasManuallyEdited(true);
                }}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>{t('Pincode')}</Text>
          <TextInput
            placeholder={t('Pincode')}
            placeholderTextColor="#9CA3AF"
            value={pincode}
            keyboardType="number-pad"
            maxLength={10}
            onChangeText={(txt) => {
              setPincode(txt);
              setHasManuallyEdited(true);
            }}
            style={styles.input}
          />

          <Pressable
            style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Text style={styles.confirmButtonText}>
              {t(terms.confirmBtn)}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {isWeb ? (
        <View style={styles.webContent}>
          <View style={styles.webInner}>{content}</View>
        </View>
      ) : Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  webContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  webInner: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
  },
  mapSection: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '60%',
  },
  sheetScrollContent: {
  },
  handle: {
    width: 60,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F3542',
    marginLeft: 12,
  },
  label: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    fontSize: 14,
    color: '#374151',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  confirmButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default FarmMapScreen;
