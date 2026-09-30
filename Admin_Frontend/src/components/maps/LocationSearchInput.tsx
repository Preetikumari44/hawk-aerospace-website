/**
 * Location Search Input with Google Places Autocomplete
 */

import React, { useCallback, useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps, Coordinates } from '../../hooks/useGoogleMaps';

interface LocationSearchInputProps {
  onPlaceSelect: (address: string, coordinates: Coordinates) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  onPlaceSelect,
  placeholder = 'Search for a location...',
  defaultValue = '',
  className = '',
  style = {},
}) => {
  const { isLoaded } = useGoogleMaps();
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();

      if (place.geometry && place.geometry.location) {
        const coordinates: Coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };

        const address = place.formatted_address || place.name || '';
        onPlaceSelect(address, coordinates);
      }
    }
  }, [autocomplete, onPlaceSelect]);

  if (!isLoaded) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        disabled
        className={className}
        style={{
          ...defaultInputStyle,
          ...style,
          backgroundColor: '#f5f5f5',
        }}
      />
    );
  }

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={className}
        style={{
          ...defaultInputStyle,
          ...style,
        }}
      />
    </Autocomplete>
  );
};

const defaultInputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  border: '1px solid #ccc',
  width: '100%',
  height: '40px',
  padding: '0 12px',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

export default LocationSearchInput;
