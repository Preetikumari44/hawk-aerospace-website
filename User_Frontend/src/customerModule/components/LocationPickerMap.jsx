import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView from '../../common/maps/MapView';
import { mapsApi } from '../../utils/api';
import { getCityDistrictLocation } from '../../utils/locationFormat';
import { haversineKm, MAX_SERVICE_DISTANCE_KM } from '../../utils/geo';
import { useLanguage } from '../../i18n';

const LocationPickerMap = ({
  initialRegion,
  selectedLocation,
  onLocationSelect,
  onSearchResult,
  style,
  topOverlayContent,
  showSearchBar = true,
  searchBiasLocation = null,
  searchWorldwide = false,
  searchRadiusKm = MAX_SERVICE_DISTANCE_KM,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const searchRequestRef = useRef(0);

  const markers = selectedLocation
    ? [{
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        title: t('Selected Location'),
        pinColor: '#EF4444',
      }]
    : [];

  const reverseGeocode = useCallback(async (loc) => {
    try {
      const result = await mapsApi.reverseGeocode(loc.lat, loc.lng);
      const rawFormatted = result?.data?.formattedAddress || result?.formattedAddress || result?.data?.address || result?.address || '';
      const addressComps = result?.data?.addressComponents || result?.addressComponents || [];
      const cleanAddress = getCityDistrictLocation(rawFormatted, addressComps) || rawFormatted;
      if (cleanAddress && onSearchResult) {
        onSearchResult({ address: cleanAddress, location: loc });
      }
    } catch (err) {
      console.error('Reverse geocode failed', err);
    }
  }, [onSearchResult]);

  const handleMapPress = useCallback((e) => {
    const { coordinate } = e.nativeEvent;
    if (coordinate) {
      const loc = { lat: coordinate.latitude, lng: coordinate.longitude };
      onLocationSelect(loc);
      reverseGeocode(loc);
    }
  }, [onLocationSelect, reverseGeocode]);

  const getSearchCenter = useCallback(() => {
    const bias = searchBiasLocation || selectedLocation;
    const lat = Number(bias?.lat ?? bias?.latitude ?? initialRegion?.latitude);
    const lng = Number(bias?.lng ?? bias?.longitude ?? initialRegion?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }, [searchBiasLocation, selectedLocation, initialRegion]);

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
      // Worldwide mode: no boundary filtering — keep everything in relevance order.
      if (!searchWorldwide && center && Number.isFinite(distanceKm) && distanceKm > searchRadiusKm) {
        continue;
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
  }, [getSearchCenter, searchWorldwide, searchRadiusKm]);

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (String(text || '').trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
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
            radiusKm: searchRadiusKm,
            worldwide: searchWorldwide,
          });
        } catch (autoErr) {
          console.warn('Autocomplete failed, falling back to geocode', autoErr);
          raw = await mapsApi.geocode(text.trim());
        }
        if (searchRequestRef.current !== requestId) return;
        setSuggestions(normalizeSuggestions(raw));
      } catch (err) {
        if (searchRequestRef.current !== requestId) return;
        console.error('Location search failed', err);
        setSuggestions([]);
      } finally {
        if (searchRequestRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 350);
  }, [getSearchCenter, normalizeSuggestions, searchRadiusKm, searchWorldwide]);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchRequestRef.current = (searchRequestRef.current || 0) + 1;
    setSearchQuery('');
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  const handleSelectSuggestion = useCallback((item) => {
    const loc = { lat: item.coordinates.latitude, lng: item.coordinates.longitude };
    // Worldwide mode allows selecting any location in the world.
    if (!searchWorldwide) {
      const center = getSearchCenter();
      if (center) {
        const distanceKm = Number.isFinite(item.distanceKm)
          ? item.distanceKm
          : haversineKm(loc, center);
        if (distanceKm !== null && distanceKm > searchRadiusKm) {
          return;
        }
      }
    }
    onLocationSelect(loc);
    setSearchQuery(item.address);
    setSuggestions([]);
    if (onSearchResult) {
      onSearchResult({ address: item.address, location: loc });
    }
  }, [onLocationSelect, onSearchResult, getSearchCenter, searchWorldwide, searchRadiusKm]);

  const region = selectedLocation
    ? {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : initialRegion;

  return (
    <View style={[styles.container, style]}>
      <MapView
        region={region}
        markers={markers}
        onPress={handleMapPress}
        style={styles.map}
      />

      {/* Search bar + suggestions float above the map so they stay visible
          while typing (the parent screen lifts them above the keyboard). */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        {topOverlayContent}
        {showSearchBar && (
          <>
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
            <ActivityIndicator size="small" color="#5060D3" style={styles.searchSpinner} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <Pressable onPress={handleClearSearch} hitSlop={8} style={styles.clearButton}>
              <MaterialIcons name="close" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {suggestions.map((item, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <MaterialIcons name="place" size={18} color="#5060D3" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.address}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
          </>
        )}
      </View>

      {selectedLocation && (
        <View style={styles.coordsBar} pointerEvents="none">
          <Text style={styles.coordsText}>
            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    marginTop: 6,
    maxHeight: 180,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  coordsBar: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coordsText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});

export default LocationPickerMap;
