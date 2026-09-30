/**
 * Custom Hook for Google Maps Integration
 */

import { useCallback, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '../config/maps.config';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
}

export const useGoogleMaps = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
    language: GOOGLE_MAPS_CONFIG.language,
    region: GOOGLE_MAPS_CONFIG.region,
  });

  const [geocoding, setGeocoding] = useState(false);

  /**
   * Geocode an address to coordinates
   */
  const geocodeAddress = useCallback(
    async (address: string): Promise<Coordinates | null> => {
      if (!isLoaded || !window.google) {
        console.error('Google Maps not loaded');
        return null;
      }

      setGeocoding(true);
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ address });

        if (result.results && result.results.length > 0) {
          const location = result.results[0].geometry.location;
          return {
            lat: location.lat(),
            lng: location.lng(),
          };
        }
        return null;
      } catch (error) {
        console.error('Geocoding error:', error);
        return null;
      } finally {
        setGeocoding(false);
      }
    },
    [isLoaded]
  );

  /**
   * Reverse geocode coordinates to address
   */
  const reverseGeocode = useCallback(
    async (coordinates: Coordinates): Promise<string | null> => {
      if (!isLoaded || !window.google) {
        console.error('Google Maps not loaded');
        return null;
      }

      setGeocoding(true);
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: coordinates });

        if (result.results && result.results.length > 0) {
          return result.results[0].formatted_address;
        }
        return null;
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
      } finally {
        setGeocoding(false);
      }
    },
    [isLoaded]
  );

  /**
   * Calculate distance between two points
   */
  const calculateDistance = useCallback(
    (origin: Coordinates, destination: Coordinates): number | null => {
      if (!isLoaded || !window.google) {
        console.error('Google Maps not loaded');
        return null;
      }

      try {
        const originLatLng = new window.google.maps.LatLng(origin.lat, origin.lng);
        const destLatLng = new window.google.maps.LatLng(
          destination.lat,
          destination.lng
        );

        const distance =
          window.google.maps.geometry.spherical.computeDistanceBetween(
            originLatLng,
            destLatLng
          );

        // Return distance in kilometers
        return distance / 1000;
      } catch (error) {
        console.error('Distance calculation error:', error);
        return null;
      }
    },
    [isLoaded]
  );

  /**
   * Get current user location
   */
  const getCurrentLocation = useCallback((): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        }
      );
    });
  }, []);

  return {
    isLoaded,
    loadError,
    geocoding,
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
    getCurrentLocation,
  };
};
