/**
 * Google Maps Container Component
 */

import React, { useCallback, useState } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps, Coordinates } from '../../hooks/useGoogleMaps';
import { DEFAULT_MAP_OPTIONS, MAP_MARKER_ICONS } from '../../config/maps.config';

interface MapMarker {
  id: string;
  position: Coordinates;
  type: 'vehicle' | 'pickup' | 'dropoff';
  title?: string;
  description?: string;
}

interface MapContainerProps {
  markers?: MapMarker[];
  center?: Coordinates;
  zoom?: number;
  height?: string;
  width?: string;
  onMapClick?: (coordinates: Coordinates) => void;
  onMarkerClick?: (markerId: string) => void;
}

const containerStyle = {
  width: '100%',
  height: '500px',
};

export const MapContainer: React.FC<MapContainerProps> = ({
  markers = [],
  center = DEFAULT_MAP_OPTIONS.center,
  zoom = DEFAULT_MAP_OPTIONS.zoom,
  height = '500px',
  width = '100%',
  onMapClick,
  onMarkerClick,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng && onMapClick) {
        onMapClick({
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        });
      }
    },
    [onMapClick]
  );

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      setSelectedMarker(marker);
      if (onMarkerClick) {
        onMarkerClick(marker.id);
      }
    },
    [onMarkerClick]
  );

  if (loadError) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', color: '#d32f2f' }}>
          <h3>Error loading maps</h3>
          <p>Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '16px' }}>
            Loading...
          </div>
          <p style={{ color: '#666' }}>Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ ...containerStyle, width, height }}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{
        ...DEFAULT_MAP_OPTIONS,
        disableDefaultUI: false,
      }}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          title={marker.title}
          icon={MAP_MARKER_ICONS[marker.type]}
          onClick={() => handleMarkerClick(marker)}
        />
      ))}

      {selectedMarker && (
        <InfoWindow
          position={selectedMarker.position}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ padding: '8px', maxWidth: '200px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
              {selectedMarker.title || 'Location'}
            </h4>
            {selectedMarker.description && (
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {selectedMarker.description}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapContainer;
