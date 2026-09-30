import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import LocationPickerMap from '../components/LocationPickerMap';
import { customerApi, updateStoredUser, mapsApi } from '../../utils/api';
import { getCityDistrictLocation } from '../../utils/locationFormat';
import { getCurrentLocationDemo } from '../../utils/mockLocation';
import { getCurrentPosition } from '../../utils/geolocation';
import { haversineKm } from '../../utils/geo';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const UpdateLocationScreen = ({ onNavigate, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const isWeb = Platform.OS === 'web';
  const currentLocation = routeParams?.currentLocation || null;
  const currentAddress = routeParams?.currentAddress || '';
  const [selectedLocation, setSelectedLocation] = useState(currentLocation);
  const [selectedAddress, setSelectedAddress] = useState(currentAddress);
  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Local search state (worldwide — no boundary limits).
  // Own useState so typing re-renders the input (a ref alone never re-renders).
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  // Bias center for relevance only (never filters anything out).
  const getSearchCenter = useCallback(() => {
    const bias = selectedLocation || currentLocation;
    const lat = Number(bias?.lat ?? bias?.latitude);
    const lng = Number(bias?.lng ?? bias?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }, [selectedLocation, currentLocation]);

  const normalizeSuggestions = useCallback((raw) => {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const center = getSearchCenter();
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
      mapped.push({
        address: item?.address || item?.description || '',
        coordinates: { latitude: lat, longitude: lng },
        placeId: item?.placeId || item?.place_id,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
      });
    }
    // Preserve backend relevance order (best text match on top).
    // distanceKm is display-only and never re-sorts hints.
    return mapped.slice(0, 5);
  }, [getSearchCenter]);

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
        const center = getSearchCenter();
        let raw = null;
        try {
          raw = await mapsApi.autocomplete(text.trim(), {
            latitude: center?.lat,
            longitude: center?.lng,
            worldwide: true,
          });
        } catch (autoErr) {
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
  }, [getSearchCenter, normalizeSuggestions]);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchRequestRef.current = (searchRequestRef.current || 0) + 1;
    setSearchQuery('');
    setSuggestions([]);
    setIsSearching(false);
    setHasSearched(false);
  }, []);

  const handleSelectSuggestion = useCallback((item) => {
    // No boundary limits on this screen — any location in the world is allowed.
    const loc = { lat: item.coordinates.latitude, lng: item.coordinates.longitude };
    setSelectedLocation(loc);
    setSelectedAddress(item.address);
    setSearchQuery(item.address);
    setSuggestions([]);
    setHasSearched(false);
  }, []);

  const handleLocationSelect = useCallback((loc) => {
    setSelectedLocation(loc);
  }, []);

  const handleSearchResult = useCallback(({ address, location }) => {
    setSelectedAddress(address);
    setSelectedLocation(location);
  }, []);

  const saveLocationAndNavigate = useCallback(async (loc, addr) => {
    setSaving(true);
    try {
      const payload = { location: loc, address: addr };
      const user = await customerApi.updateCurrentUser(payload);
      await updateStoredUser(user);
      onNavigate('Home', { updatedLocation: loc, updatedAddress: addr });
    } catch (error) {
      console.error('Failed to save current location', error);
    } finally {
      setSaving(false);
    }
  }, [onNavigate]);

  const handleCurrentLocation = useCallback(() => {
    setFetchingLocation(true);
    const onLocation = async (lat, lng) => {
      const loc = { lat, lng };
      setSelectedLocation(loc);
      setFetchingLocation(false);
      let addr = t('Current Location');
      try {
        const result = await mapsApi.reverseGeocode(lat, lng);
        const rawFormatted = result?.data?.formattedAddress || result?.formattedAddress || result?.data?.address || result?.address || '';
        const addressComps = result?.data?.addressComponents || result?.addressComponents || [];
        const cleanAddress = getCityDistrictLocation(rawFormatted, addressComps) || rawFormatted;
        if (cleanAddress) addr = cleanAddress;
      } catch (err) {
        console.error('Reverse geocode failed for current location', err);
      }
      setSelectedAddress(addr);
      saveLocationAndNavigate(loc, addr);
    };
    const onError = (err) => {
      console.warn('Geolocation failed, using mock location', err?.message || err);
      getCurrentLocationDemo((mockPos) => {
        onLocation(mockPos.coords.latitude, mockPos.coords.longitude);
      });
    };

    // Strategy 1: fast location (network/wifi)
    getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 })
      .then((pos) => onLocation(pos.coords.latitude, pos.coords.longitude))
      .catch(() => {
        // Strategy 2: GPS location (longer timeout)
        return getCurrentPosition({ enableHighAccuracy: true, timeout: 30000 })
          .then((pos) => onLocation(pos.coords.latitude, pos.coords.longitude));
      })
      .catch((err) => {
        onError(err);
      });
  }, [saveLocationAndNavigate, t]);

  const handleSave = async () => {
    if (!selectedLocation || saving) return;
    setSaving(true);
    try {
      let finalAddress = selectedAddress;
      if (!finalAddress || finalAddress === t('Selected Location')) {
        try {
          const result = await mapsApi.reverseGeocode(selectedLocation.lat, selectedLocation.lng);
          const rawFormatted = result?.data?.formattedAddress || result?.formattedAddress || result?.data?.address || result?.address || '';
          const addressComps = result?.data?.addressComponents || result?.addressComponents || [];
          finalAddress = getCityDistrictLocation(rawFormatted, addressComps) || rawFormatted;
        } catch (e) {
          // ignore
        }
      }
      const cleanAddress = getCityDistrictLocation(finalAddress) || finalAddress || t('Selected Location');
      await saveLocationAndNavigate(selectedLocation, cleanAddress);
    } catch (error) {
      console.error('Failed to save location', error);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      <LocationPickerMap
        initialRegion={
          currentLocation
            ? { latitude: currentLocation.lat, longitude: currentLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 5, longitudeDelta: 5 }
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
            <Text style={styles.heading}>{t('Update Your Location')}</Text>
          </View>
        }
      />

      <View style={styles.bottomSheet}>
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
          {(searchQuery?.length > 0) && !isSearching && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <MaterialIcons name="close" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {suggestions?.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
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
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {!isSearching && hasSearched && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
          <Text style={styles.noResultsText}>
            {t('No locations found. Try a different place name.')}
          </Text>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetContent, { paddingBottom: tabBarPadding }]}
          bounces={false}
        >
          <Pressable
            style={[styles.currentLocButton, (fetchingLocation || saving) && styles.saveButtonDisabled]}
            onPress={handleCurrentLocation}
            disabled={fetchingLocation || saving}
          >
            {fetchingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('Get Current Location')}</Text>
            )}
          </Pressable>

          {selectedAddress ? (
            <Text style={styles.addressText} numberOfLines={3}>{selectedAddress}</Text>
          ) : (
            <Text style={styles.hintText}>{t('Tap on the map or search for your location')}</Text>
          )}

          <Pressable
            style={[styles.saveButton, (!selectedLocation || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('Save Location')}</Text>
            )}
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  flex: { flex: 1 },
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
  mapSection: { flex: 1 },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '45%',
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  sheetContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  mapHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  heading: {
    fontSize: 20, fontWeight: '600', color: '#2F3542', marginLeft: 12, flex: 1,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
    borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: '#374151', marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, maxHeight: 160, overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8,
  },
  suggestionText: {
    flex: 1, fontSize: 14, color: '#374151',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionDistance: {
    fontSize: 12, color: '#6B7280', marginTop: 2,
  },
  noResultsText: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8,
  },
  hintText: {
    fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16,
  },
  addressText: {
    fontSize: 14, color: '#374151', paddingVertical: 12, lineHeight: 20,
  },
  currentLocButton: {
    backgroundColor: '#10B981', borderRadius: 16, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#5060D3', borderRadius: 16, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 16,
  },
  saveButtonDisabled: { backgroundColor: '#A5B4FC' },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default UpdateLocationScreen;
