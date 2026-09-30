import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import LocationPickerMap from '../components/LocationPickerMap';
import PrimaryButton from '../components/PrimaryButton';
import { useLanguage } from '../../i18n';
import {
  mapsApi,
  customerApi,
  aggregatorApi,
  getSession,
  normalizeFrontendRole,
} from '../../utils/api';
import { isPlaceholderLocation } from '../../utils/bookingFormat';
import {
  haversineKm,
  MAX_SERVICE_DISTANCE_KM,
  isCountryWideService,
  extractCountryFromComponents,
} from '../../utils/geo';
import { getCurrentPosition } from '../../utils/geolocation';
import { useTabBarPadding } from '../../utils/responsive';

const getTermForService = (serviceType) => {
  const st = String(serviceType || '').toLowerCase();
  switch (st) {
    case 'mapping':
      return {
        term: 'Land',
        heading: 'Enter your Land Location',
        buttonText: 'Set Land Location',
      };
    case 'videography':
      return {
        term: 'Event',
        heading: 'Enter your Event Location',
        buttonText: 'Set Event Location',
      };
    case 'surveillance':
      return {
        term: 'Site',
        heading: 'Enter your Site Location',
        buttonText: 'Set Site Location',
      };
    case 'spraying':
    default:
      return {
        term: 'Farm',
        heading: 'Enter your Farm Location',
        buttonText: 'Set Farm Location',
      };
  }
};

const FarmLocationScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const serviceType = routeParams?.serviceType;
  const terms = getTermForService(serviceType);
  // Mapping & surveillance allow the location anywhere in the user's country.
  // Videography & spraying stay within the 100km radius.
  const isCountryWide = isCountryWideService(serviceType);
  const isWeb = Platform.OS === 'web';
  const [selectedLocation, setSelectedLocation] = useState(routeParams?.location || null);
  const [selectedAddress, setSelectedAddress] = useState(routeParams?.address || '');
  const [outOfRangeVisible, setOutOfRangeVisible] = useState(false);
  const [userCountry, setUserCountry] = useState(null);
  const baseUserLocationRef = useRef(null);
  const userCountryRef = useRef(null);
  const countryCacheRef = useRef(new Map());

  const isOutOfRadius = useCallback((loc) => {
    if (!loc || !baseUserLocationRef.current) return false;
    const distanceKm = haversineKm(loc, baseUserLocationRef.current);
    return distanceKm !== null && distanceKm > MAX_SERVICE_DISTANCE_KM;
  }, []);

  const rejectOutOfRange = useCallback(() => {
    setOutOfRangeVisible(true);
  }, []);

  // Reverse-geocode a point to its country { code, name } (cached by ~100m grid).
  const getCountryForLocation = useCallback(async (loc) => {
    const lat = Number(loc?.lat ?? loc?.latitude);
    const lng = Number(loc?.lng ?? loc?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (countryCacheRef.current.has(key)) {
      return countryCacheRef.current.get(key);
    }
    try {
      const result = await mapsApi.reverseGeocode(lat, lng);
      const comps = result?.addressComponents || result?.data?.addressComponents || [];
      const country = extractCountryFromComponents(comps);
      countryCacheRef.current.set(key, country);
      return country;
    } catch (err) {
      console.warn('Country lookup failed', err);
      return null;
    }
  }, []);

  // Country-wide mode: true when the point is outside the user's country.
  // Unknown countries (lookup failed) never block — autocomplete already biases.
  const isOutOfCountry = useCallback(async (loc, knownCountryCode) => {
    const home = userCountryRef.current;
    if (!home) return false;
    if (knownCountryCode && knownCountryCode !== home.code) return true;
    if (knownCountryCode && knownCountryCode === home.code) return false;
    const country = await getCountryForLocation(loc);
    if (!country) return false;
    return country.code !== home.code;
  }, [getCountryForLocation]);

  // Local search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  const normalizeSuggestions = useCallback((raw) => {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const center = baseUserLocationRef.current;
    const homeCountry = userCountryRef.current;
    const mapped = [];
    for (const item of list) {
      if (!item) continue;
      const lat = Number(item?.coordinates?.latitude ?? item?.location?.lat ?? item?.lat);
      const lng = Number(item?.coordinates?.longitude ?? item?.location?.lng ?? item?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const loc = { lat, lng };
      let distanceKm = Number(item?.distanceKm);
      if (!Number.isFinite(distanceKm) && center) {
        distanceKm = haversineKm(loc, center);
      }
      const itemCountry = String(item?.countryCode || '').toUpperCase() || null;
      if (isCountryWide) {
        // Country-wide: anywhere in the user's country, no radius limit.
        // Backend already restricts to the country; this is a safety net.
        if (homeCountry && itemCountry && itemCountry !== homeCountry.code) {
          continue;
        }
      } else if (center && Number.isFinite(distanceKm) && distanceKm > MAX_SERVICE_DISTANCE_KM) {
        // Safety net: only keep hints within the bookable 100km radius when
        // the user's location is known (backend already filters too).
        continue;
      }
      mapped.push({
        address: item?.address || item?.description || '',
        coordinates: { latitude: lat, longitude: lng },
        placeId: item?.placeId || item?.place_id,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        countryCode: itemCountry,
      });
    }
    // Preserve backend relevance order (best text match on top).
    // distanceKm is display-only and never re-sorts hints.
    return mapped.slice(0, 5);
  }, [isCountryWide]);

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (String(text || '').trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = (searchRequestRef.current || 0) + 1;
      searchRequestRef.current = requestId;
      try {
        const center = baseUserLocationRef.current;
        let raw = null;
        try {
          if (isCountryWide) {
            // Anywhere in the user's country: no radius limit, no proximity
            // bias — best text match ranks on top (like Google Maps).
            // Guarantee a country code: init may not have resolved it yet;
            // the lookup is cached so this is free after the first call.
            let homeCode = userCountryRef.current?.code;
            if (!homeCode && center) {
              const home = await getCountryForLocation(center);
              if (searchRequestRef.current !== requestId) return;
              if (home) {
                userCountryRef.current = home;
                setUserCountry(home);
                homeCode = home.code;
              }
            }
            raw = await mapsApi.autocomplete(text.trim(), {
              latitude: center?.lat,
              longitude: center?.lng,
              country: homeCode,
              worldwide: true,
            });
          } else {
            raw = await mapsApi.autocomplete(text.trim(), {
              latitude: center?.lat,
              longitude: center?.lng,
              radiusKm: MAX_SERVICE_DISTANCE_KM,
            });
          }
        } catch (autoErr) {
          // Fallback to legacy single-result geocode so search still works.
          console.warn('Autocomplete failed, falling back to geocode', autoErr);
          raw = await mapsApi.geocode(text.trim());
        }
        if (searchRequestRef.current !== requestId) return;
        setSuggestions(normalizeSuggestions(raw));
        setHasSearched(true);
      } catch (err) {
        if (searchRequestRef.current !== requestId) return;
        console.error('Location search failed', err);
        setSuggestions([]);
        setHasSearched(true);
      } finally {
        if (searchRequestRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 350);
  }, [normalizeSuggestions, isCountryWide, getCountryForLocation]);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchRequestRef.current = (searchRequestRef.current || 0) + 1;
    setSearchQuery('');
    setSuggestions([]);
    setIsSearching(false);
    setHasSearched(false);
  }, []);

  const handleSelectSuggestion = useCallback(async (item) => {
    const loc = { lat: item.coordinates.latitude, lng: item.coordinates.longitude };
    if (isCountryWide) {
      if (await isOutOfCountry(loc, item.countryCode)) {
        rejectOutOfRange();
        return;
      }
    } else if (isOutOfRadius(loc)) {
      rejectOutOfRange();
      return;
    }
    setSelectedLocation(loc);
    setSelectedAddress(item.address);
    setSearchQuery(item.address);
    setSuggestions([]);
    setHasSearched(false);
  }, [isCountryWide, isOutOfCountry, isOutOfRadius, rejectOutOfRange]);

  // 1. Fetch user's saved location from database/session immediately on mount, fallback to GPS if unavailable
  useEffect(() => {
    let disposed = false;

    const initUserLocation = async () => {
      let resolvedLocation = null;
      let resolvedAddress = '';

      // First, try resolving immediately from saved profile in session / database (api/users/me)
      try {
        const session = await getSession();
        const user = session?.user || null;
        const role = normalizeFrontendRole(user?.primaryRole || user?.role);
        let profile = null;
        if (role === 'sales') {
          profile = await aggregatorApi.getProfile().catch(() => null);
        } else {
          profile = await customerApi.getCurrentUser().catch(() => null);
        }

        const loc =
          profile?.profileData?.location ||
          profile?.location ||
          user?.profileData?.location ||
          user?.location ||
          null;

        const addr =
          profile?.profileData?.address ||
          profile?.address ||
          user?.profileData?.address ||
          user?.address ||
          '';

        const latVal = Number(loc?.lat ?? loc?.latitude);
        const lngVal = Number(loc?.lng ?? loc?.longitude);

        if (Number.isFinite(latVal) && Number.isFinite(lngVal)) {
          resolvedLocation = { lat: latVal, lng: lngVal };
          resolvedAddress = addr || '';
        }
      } catch (err) {
        console.warn('Could not resolve user location from database:', err);
      }

      if (resolvedLocation) {
        if (!disposed) {
          baseUserLocationRef.current = resolvedLocation;
          // Resolve the user's country for country-wide services (mapping/surveillance).
          getCountryForLocation(resolvedLocation).then((country) => {
            if (!disposed && country) {
              userCountryRef.current = country;
              setUserCountry(country);
            }
          });
          if (!routeParams?.location) {
            setSelectedLocation(resolvedLocation);
            if (resolvedAddress) {
              setSelectedAddress(resolvedAddress);
            } else {
              mapsApi.reverseGeocode(resolvedLocation.lat, resolvedLocation.lng)
                .then((result) => {
                  if (!disposed && (result?.formattedAddress || result?.address)) {
                    setSelectedAddress(result.formattedAddress || result.address);
                  }
                })
                .catch(() => {});
            }
          }
        }
        return;
      }

      // Fallback: If no saved profile location, try GPS position with a short timeout
      try {
        const pos = await getCurrentPosition({ enableHighAccuracy: false, timeout: 4000 });
        if (!disposed && pos?.coords) {
          const currentLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          baseUserLocationRef.current = currentLocation;
          getCountryForLocation(currentLocation).then((country) => {
            if (!disposed && country) {
              userCountryRef.current = country;
              setUserCountry(country);
            }
          });

          if (!routeParams?.location) {
            setSelectedLocation(currentLocation);
            mapsApi.reverseGeocode(currentLocation.lat, currentLocation.lng)
              .then((result) => {
                if (!disposed && (result?.formattedAddress || result?.address)) {
                  setSelectedAddress(result.formattedAddress || result.address);
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn('GPS location fetch fallback in FarmLocationScreen:', err);
      }
    };

    initUserLocation();
    return () => {
      disposed = true;
    };
  }, [routeParams?.location, getCountryForLocation]);

  const handleLocationSelect = useCallback(
    async (loc) => {
      // Map tap: radius limit for spraying/videography, country limit for mapping/surveillance.
      if (isCountryWide) {
        if (await isOutOfCountry(loc)) {
          rejectOutOfRange();
          return;
        }
      } else if (isOutOfRadius(loc)) {
        rejectOutOfRange();
        return;
      }
      setSelectedLocation(loc);
      try {
        const result = await mapsApi.reverseGeocode(loc.lat, loc.lng);
        const formattedAddress = result?.formattedAddress || result?.address;
        if (formattedAddress) {
          setSelectedAddress(formattedAddress);
        }
      } catch (err) {
        console.warn('Reverse geocode failed on FarmLocationScreen map press', err);
      }
    },
    [isCountryWide, isOutOfCountry, isOutOfRadius, rejectOutOfRange],
  );

  const handleSearchResult = useCallback(
    async ({ address, location }) => {
      if (isCountryWide) {
        if (await isOutOfCountry(location)) {
          rejectOutOfRange();
          return;
        }
      } else if (isOutOfRadius(location)) {
        rejectOutOfRange();
        return;
      }
      setSelectedAddress(address);
      setSelectedLocation(location);
    },
    [isCountryWide, isOutOfCountry, isOutOfRadius, rejectOutOfRange],
  );

  const handleProceed = useCallback(async () => {
    if (!selectedLocation) return;
    if (isCountryWide) {
      if (await isOutOfCountry(selectedLocation)) {
        setOutOfRangeVisible(true);
        return;
      }
    } else if (isOutOfRadius(selectedLocation)) {
      setOutOfRangeVisible(true);
      return;
    }
    let resolvedAddress = selectedAddress;
    if (isPlaceholderLocation(selectedAddress)) {
      try {
        const result = await mapsApi.reverseGeocode(selectedLocation.lat, selectedLocation.lng);
        const formattedAddress = result?.formattedAddress || result?.address;
        if (formattedAddress) {
          resolvedAddress = formattedAddress;
          setSelectedAddress(formattedAddress);
        }
      } catch (err) {
        console.error('Reverse geocode failed', err);
      }
    }

    // Always navigate to FarmMapScreen for ALL service types (spraying, mapping, videography, surveillance, etc.)
    onNavigate('FarmMapScreen', {
      ...routeParams,
      location: selectedLocation,
      address: resolvedAddress || 'Selected Location',
    });
  }, [selectedLocation, selectedAddress, routeParams, isCountryWide, isOutOfCountry, isOutOfRadius, onNavigate]);

  const content = (
    <>
      <LocationPickerMap
        initialRegion={
          selectedLocation
            ? {
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
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
        showSearchBar={false}
        topOverlayContent={
          <View style={styles.mapHeaderRow}>
            <Pressable onPress={() => onNavigate('Back')} hitSlop={8}>
              <ArrowBackwardIcon width={28} height={28} />
            </Pressable>
            <Text style={styles.heading}>{t(terms.heading)}</Text>
          </View>
        }
      />

      <View style={styles.bottomSheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetContent, { paddingBottom: tabBarPadding }]}
          bounces={false}
        >
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('Search for a location...')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#5060D3" />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <Pressable onPress={handleClearSearch} hitSlop={8}>
                <MaterialIcons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((item, index) => (
                <Pressable
                  key={item.placeId || index}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <MaterialIcons name="place" size={18} color="#5060D3" />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.address}
                    </Text>
                    {Number.isFinite(item.distanceKm) && (
                      <Text style={styles.suggestionDistance}>
                        {item.distanceKm < 1
                          ? `${Math.round(item.distanceKm * 1000)} m away`
                          : item.distanceKm < 1000
                            ? `${item.distanceKm.toFixed(1)} km away`
                            : `${Math.round(item.distanceKm).toLocaleString()} km away`}
                        {!isCountryWide && (
                          <>
                            {' · '}
                            {t('Within service area')}
                          </>
                        )}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {!isSearching && hasSearched && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
            <Text style={styles.noResultsText}>
              {isCountryWide
                ? t(
                    userCountry?.name
                      ? `No locations found in ${userCountry.name}. Try a different place name.`
                      : 'No locations found in your country. Try a different place name.',
                  )
                : t('No locations found within 100 km. Try a nearby place name.')}
            </Text>
          )}

          {selectedLocation && selectedAddress ? (
            <Pressable style={styles.locationRow} onPress={handleProceed}>
              <MaterialIcons name="location-on" size={28} color="#5060D3" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{t('Selected Location')}</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Text style={styles.hintText}>
              {t('Tap on the map above or search to select your location')}
            </Text>
          )}

          <View style={styles.divider} />

          {selectedLocation && (
            <Pressable style={styles.confirmButton} onPress={handleProceed}>
              <Text style={styles.confirmButtonText}>
                {t(terms.buttonText)}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={outOfRangeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOutOfRangeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="location-off" size={30} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>
              {isCountryWide ? t('Location Outside Country') : t('Location Out of Range')}
            </Text>
            <Text style={styles.modalMessage}>
              {isCountryWide
                ? t(
                    userCountry?.name
                      ? `This service is available anywhere in ${userCountry.name}. Please select a location within ${userCountry.name}.`
                      : 'This service is available anywhere in your country. Please select a location within your country.',
                  )
                : t('Service location should be within 100km of your location.')}
            </Text>
            <PrimaryButton
              title={t('OK')}
              backgroundColor="#5060D3"
              textColor="#FFFFFF"
              onPress={() => setOutOfRangeVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {isWeb ? (
        <View style={styles.webContent}>
          <View style={styles.webInner}>{content}</View>
        </View>
      ) : (
        <KeyboardAvoidingWrapper>{content}</KeyboardAvoidingWrapper>
      )}
    </SafeAreaView>
  );
};

// Handle keyboard avoids properly on both iOS and Android
const KeyboardAvoidingWrapper = ({ children }) => {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    maxHeight: '65%',
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  sheetContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2F3542',
    marginLeft: 12,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionDistance: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  noResultsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F3542',
  },
  locationAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#5060D3',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default FarmLocationScreen;
