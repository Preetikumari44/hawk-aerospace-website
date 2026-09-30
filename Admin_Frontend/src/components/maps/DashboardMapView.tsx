/**
 * Dashboard Map View Component
 * Shows all active vehicles and bookings on a map
 */

import React, { useEffect, useState } from 'react';
import { MapContainer } from './MapContainer';
import { Coordinates } from '../../hooks/useGoogleMaps';

interface Vehicle {
  id: string;
  registrationNumber: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  status: string;
}

interface Booking {
  id: string;
  pickupLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: string;
}

interface DashboardMapViewProps {
  vehicles?: Vehicle[];
  bookings?: Booking[];
  center?: Coordinates;
  height?: string;
}

export const DashboardMapView: React.FC<DashboardMapViewProps> = ({
  vehicles = [],
  bookings = [],
  center,
  height = '600px',
}) => {
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    const newMarkers: any[] = [];

    // Add vehicle markers
    vehicles.forEach((vehicle) => {
      if (vehicle.currentLocation) {
        newMarkers.push({
          id: `vehicle-${vehicle.id}`,
          position: {
            lat: vehicle.currentLocation.latitude,
            lng: vehicle.currentLocation.longitude,
          },
          type: 'vehicle',
          title: vehicle.registrationNumber,
          description: `Status: ${vehicle.status}`,
        });
      }
    });

    // Add booking pickup markers
    bookings.forEach((booking) => {
      if (booking.pickupLocation) {
        newMarkers.push({
          id: `pickup-${booking.id}`,
          position: {
            lat: booking.pickupLocation.latitude,
            lng: booking.pickupLocation.longitude,
          },
          type: 'pickup',
          title: 'Pickup',
          description: booking.pickupLocation.address,
        });
      }

      if (booking.dropoffLocation) {
        newMarkers.push({
          id: `dropoff-${booking.id}`,
          position: {
            lat: booking.dropoffLocation.latitude,
            lng: booking.dropoffLocation.longitude,
          },
          type: 'dropoff',
          title: 'Drop-off',
          description: booking.dropoffLocation.address,
        });
      }
    });

    setMarkers(newMarkers);
  }, [vehicles, bookings]);

  // Calculate center if not provided
  const mapCenter = center || calculateCenter(markers);

  return (
    <div style={{ width: '100%', height }}>
      <MapContainer
        markers={markers}
        center={mapCenter}
        zoom={12}
        height={height}
        onMarkerClick={(markerId) => {
          console.log('Marker clicked:', markerId);
          // Add your custom logic here
        }}
      />
    </div>
  );
};

// Helper function to calculate center from markers
function calculateCenter(markers: any[]): Coordinates {
  if (markers.length === 0) {
    return { lat: 40.7128, lng: -74.006 }; // Default to New York
  }

  const sum = markers.reduce(
    (acc, marker) => ({
      lat: acc.lat + marker.position.lat,
      lng: acc.lng + marker.position.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / markers.length,
    lng: sum.lng / markers.length,
  };
}

export default DashboardMapView;
