/**
 * Maps API Service
 * Frontend API calls to backend Google Maps endpoints
 */

import apiClient from './client';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResponse {
  address: string;
  coordinates: Coordinates;
  placeId?: string;
}

export interface DistanceResponse {
  distance: number; // in kilometers
  duration: number; // in minutes
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface RouteResponse {
  distance: number;
  duration: number;
  polyline: string;
  steps: RouteStep[];
}

/**
 * Geocode an address to coordinates
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResponse> => {
  const response = await apiClient.get('/maps/geocode', {
    params: { address },
  });
  return response.data.data;
};

/**
 * Reverse geocode coordinates to address
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  const response = await apiClient.get('/maps/reverse-geocode', {
    params: { latitude, longitude },
  });
  return response.data.data.address;
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = async (
  origin: Coordinates,
  destination: Coordinates
): Promise<DistanceResponse> => {
  const response = await apiClient.post('/maps/distance', {
    origin,
    destination,
  });
  return response.data.data;
};

/**
 * Get detailed route with directions
 */
export const getRoute = async (
  origin: Coordinates,
  destination: Coordinates,
  waypoints?: Coordinates[]
): Promise<RouteResponse> => {
  const response = await apiClient.post('/maps/route', {
    origin,
    destination,
    waypoints,
  });
  return response.data.data;
};

/**
 * Calculate approximate distance using Haversine formula (no API call, backend only)
 */
export const calculateHaversineDistance = async (
  origin: Coordinates,
  destination: Coordinates
): Promise<number> => {
  const response = await apiClient.post('/maps/haversine-distance', {
    origin,
    destination,
  });
  return response.data.data.distance;
};

/**
 * Batch geocode multiple addresses
 */
export const batchGeocodeAddresses = async (
  addresses: string[]
): Promise<(GeocodeResponse | null)[]> => {
  const promises = addresses.map((address) =>
    geocodeAddress(address).catch(() => null)
  );
  return Promise.all(promises);
};

/**
 * Calculate route for multiple waypoints
 */
export const calculateMultiStopRoute = async (
  stops: Coordinates[]
): Promise<RouteResponse | null> => {
  if (stops.length < 2) {
    throw new Error('At least 2 stops are required');
  }

  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  return getRoute(origin, destination, waypoints.length > 0 ? waypoints : undefined);
};

export default {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getRoute,
  calculateHaversineDistance,
  batchGeocodeAddresses,
  calculateMultiStopRoute,
};
