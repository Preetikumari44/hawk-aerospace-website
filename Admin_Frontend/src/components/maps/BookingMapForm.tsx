/**
 * Booking Map Form Component
 * Interactive form for creating bookings with map selection
 */

import React, { useState, useCallback } from 'react';
import { MapContainer } from './MapContainer';
import { LocationSearchInput } from './LocationSearchInput';
import { RouteMap } from './RouteMap';
import { Coordinates } from '../../hooks/useGoogleMaps';

interface Location {
  address: string;
  coordinates: Coordinates;
}

interface BookingMapFormProps {
  onBookingDataChange?: (data: {
    pickup: Location | null;
    dropoff: Location | null;
    distance: number | null;
    duration: number | null;
  }) => void;
  defaultPickup?: Location;
  defaultDropoff?: Location;
  height?: string;
}

export const BookingMapForm: React.FC<BookingMapFormProps> = ({
  onBookingDataChange,
  defaultPickup,
  defaultDropoff,
  height = '500px',
}) => {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    defaultPickup || null
  );
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(
    defaultDropoff || null
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [showRoute, setShowRoute] = useState(false);

  const handlePickupSelect = useCallback(
    (address: string, coordinates: Coordinates) => {
      const location = { address, coordinates };
      setPickupLocation(location);

      if (onBookingDataChange) {
        onBookingDataChange({
          pickup: location,
          dropoff: dropoffLocation,
          distance,
          duration,
        });
      }
    },
    [dropoffLocation, distance, duration, onBookingDataChange]
  );

  const handleDropoffSelect = useCallback(
    (address: string, coordinates: Coordinates) => {
      const location = { address, coordinates };
      setDropoffLocation(location);

      if (onBookingDataChange) {
        onBookingDataChange({
          pickup: pickupLocation,
          dropoff: location,
          distance,
          duration,
        });
      }
    },
    [pickupLocation, distance, duration, onBookingDataChange]
  );

  const handleRouteCalculated = useCallback(
    (dist: number, dur: number) => {
      setDistance(dist);
      setDuration(dur);

      if (onBookingDataChange) {
        onBookingDataChange({
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          distance: dist,
          duration: dur,
        });
      }
    },
    [pickupLocation, dropoffLocation, onBookingDataChange]
  );

  const canShowRoute = pickupLocation && dropoffLocation;

  const markers = [];
  if (pickupLocation && !showRoute) {
    markers.push({
      id: 'pickup',
      position: pickupLocation.coordinates,
      type: 'pickup' as const,
      title: 'Pickup Location',
      description: pickupLocation.address,
    });
  }
  if (dropoffLocation && !showRoute) {
    markers.push({
      id: 'dropoff',
      position: dropoffLocation.coordinates,
      type: 'dropoff' as const,
      title: 'Drop-off Location',
      description: dropoffLocation.address,
    });
  }

  return (
    <div style={styles.container}>
      <div style={styles.formSection}>
        <h3 style={styles.heading}>Booking Locations</h3>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Pickup Location</label>
          <LocationSearchInput
            onPlaceSelect={handlePickupSelect}
            placeholder="Enter pickup address..."
            defaultValue={pickupLocation?.address}
            style={styles.input}
          />
          {pickupLocation && (
            <div style={styles.selectedLocation}>
              <span style={styles.icon}>📍</span>
              <span style={styles.addressText}>{pickupLocation.address}</span>
            </div>
          )}
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Drop-off Location</label>
          <LocationSearchInput
            onPlaceSelect={handleDropoffSelect}
            placeholder="Enter drop-off address..."
            defaultValue={dropoffLocation?.address}
            style={styles.input}
          />
          {dropoffLocation && (
            <div style={styles.selectedLocation}>
              <span style={styles.icon}>📍</span>
              <span style={styles.addressText}>{dropoffLocation.address}</span>
            </div>
          )}
        </div>

        {canShowRoute && (
          <div style={styles.routeControls}>
            <button
              onClick={() => setShowRoute(!showRoute)}
              style={{
                ...styles.button,
                backgroundColor: showRoute ? '#f44336' : '#4caf50',
              }}
            >
              {showRoute ? 'Hide Route' : 'Show Route'}
            </button>

            {distance !== null && duration !== null && (
              <div style={styles.routeInfo}>
                <div style={styles.routeInfoItem}>
                  <span style={styles.routeLabel}>Distance:</span>
                  <span style={styles.routeValue}>
                    {distance.toFixed(2)} km
                  </span>
                </div>
                <div style={styles.routeInfoItem}>
                  <span style={styles.routeLabel}>Duration:</span>
                  <span style={styles.routeValue}>
                    {Math.round(duration)} min
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.mapSection}>
        {showRoute && canShowRoute ? (
          <RouteMap
            origin={pickupLocation.coordinates}
            destination={dropoffLocation.coordinates}
            height={height}
            onRouteCalculated={handleRouteCalculated}
          />
        ) : (
          <MapContainer
            markers={markers}
            center={
              pickupLocation?.coordinates ||
              dropoffLocation?.coordinates ||
              undefined
            }
            height={height}
          />
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  heading: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
  },
  selectedLocation: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '16px',
  },
  addressText: {
    fontSize: '13px',
    color: '#666',
  },
  routeControls: {
    marginTop: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  routeInfo: {
    marginTop: '12px',
    display: 'flex',
    gap: '20px',
  },
  routeInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  routeLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 500,
  },
  routeValue: {
    fontSize: '16px',
    color: '#333',
    fontWeight: 600,
  },
  mapSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
};

export default BookingMapForm;
