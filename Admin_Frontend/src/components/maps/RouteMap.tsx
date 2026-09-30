/**
 * Route Map Component with Directions
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
} from '@react-google-maps/api';
import { useGoogleMaps, Coordinates } from '../../hooks/useGoogleMaps';
import {
  DEFAULT_MAP_OPTIONS,
  MAP_MARKER_ICONS,
} from '../../config/maps.config';

interface RouteMapProps {
  origin: Coordinates;
  destination: Coordinates;
  waypoints?: Coordinates[];
  height?: string;
  width?: string;
  showMarkers?: boolean;
  onRouteCalculated?: (distance: number, duration: number) => void;
}

const containerStyle = {
  width: '100%',
  height: '500px',
};

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  waypoints = [],
  height = '500px',
  width = '100%',
  showMarkers = true,
  onRouteCalculated,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !window.google) {
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const waypointsFormatted = waypoints.map((point) => ({
        location: new window.google.maps.LatLng(point.lat, point.lng),
        stopover: true,
      }));

      const result = await directionsService.route({
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(
          destination.lat,
          destination.lng
        ),
        waypoints: waypointsFormatted,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      });

      setDirections(result);

      // Calculate total distance and duration
      if (result.routes && result.routes[0] && result.routes[0].legs) {
        const route = result.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;

        route.legs.forEach((leg) => {
          if (leg.distance) totalDistance += leg.distance.value;
          if (leg.duration) totalDuration += leg.duration.value;
        });

        // Convert to km and minutes
        const distanceKm = totalDistance / 1000;
        const durationMin = totalDuration / 60;

        if (onRouteCalculated) {
          onRouteCalculated(distanceKm, durationMin);
        }
      }
    } catch (err) {
      console.error('Error calculating route:', err);
      setError('Failed to calculate route. Please try again.');
    } finally {
      setCalculating(false);
    }
  }, [isLoaded, origin, destination, waypoints, onRouteCalculated]);

  useEffect(() => {
    if (isLoaded && origin && destination) {
      calculateRoute();
    }
  }, [isLoaded, origin, destination, calculateRoute]);

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
          <div style={{ marginBottom: '16px' }}>Loading...</div>
          <p style={{ color: '#666' }}>Loading Route Map...</p>
        </div>
      </div>
    );
  }

  if (calculating) {
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
          <div style={{ marginBottom: '16px' }}>Calculating...</div>
          <p style={{ color: '#666' }}>Calculating route...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff3e0',
          border: '1px solid #ff9800',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', color: '#e65100' }}>
          <h3>Route Calculation Error</h3>
          <p>{error}</p>
          <button
            onClick={calculateRoute}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ ...containerStyle, width, height }}
      center={origin}
      zoom={DEFAULT_MAP_OPTIONS.zoom}
      options={{
        ...DEFAULT_MAP_OPTIONS,
        disableDefaultUI: false,
      }}
    >
      {directions && <DirectionsRenderer directions={directions} />}

      {!directions && showMarkers && (
        <>
          <Marker
            position={origin}
            icon={MAP_MARKER_ICONS.pickup}
            title="Pickup Location"
          />
          <Marker
            position={destination}
            icon={MAP_MARKER_ICONS.dropoff}
            title="Drop-off Location"
          />
        </>
      )}
    </GoogleMap>
  );
};

export default RouteMap;
