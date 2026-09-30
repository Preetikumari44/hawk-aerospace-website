/**
 * Google Maps Service
 * Provides geocoding, distance calculation, and routing functionality
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  GeocodeResult,
  LatLngLiteral,
  TravelMode,
} from '@googlemaps/google-maps-services-js';

export interface GeocodingResult {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  placeId?: string;
  distanceKm?: number;
  countryCode?: string;
}

/** Extract ISO 3166-1 alpha-2 country code from address components. */
export const extractCountryCode = (
  addressComponents: Array<{ short_name: string; types: string[] }> | undefined,
): string | undefined => {
  const country = (addressComponents || []).find((c) =>
    (c.types || []).includes('country'),
  );
  const code = String(country?.short_name || '').toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
};

export const MAX_AUTOCOMPLETE_RADIUS_METERS = 100 * 1000;
export const MAX_AUTOCOMPLETE_RESULTS = 5;

export interface DistanceResult {
  distance: number; // in kilometers
  duration: number; // in minutes
}

export interface RouteResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly client: Client;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn(
        'Google Maps API key not configured. Map features will not work.',
      );
    }

    this.client = new Client({});
  }

  /**
   * Autocomplete search returning MULTIPLE suggestions.
   * - Restricted mode (default, strictBounds=true): biased to AND filtered
   *   within `radiusKm` around the user's location (e.g. bookable <=100km).
   * - Worldwide mode (strictBounds=false): location is used only as a bias,
   *   with NO boundary filtering.
   * - Country mode (`country` set): results restricted to that ISO 3166-1
   *   alpha-2 country (anywhere in the country, no radius limit).
   *
   * Ranking: Google's prediction order (best text match first) is preserved.
   * `distanceKm` is attached for display only and never re-sorts results.
   */
  async autocompletePlaces(
    input: string,
    options: {
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      strictBounds?: boolean;
      country?: string;
    } = {},
  ): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const trimmed = String(input || '').trim();
    if (trimmed.length < 2) return [];

    const radiusKm = Number.isFinite(Number(options.radiusKm))
      ? Number(options.radiusKm)
      : 100;
    const hasCenter =
      Number.isFinite(Number(options.latitude)) &&
      Number.isFinite(Number(options.longitude));
    const center = hasCenter
      ? { lat: Number(options.latitude), lng: Number(options.longitude) }
      : null;
    // Worldwide / country modes do NOT filter anything out by distance.
    // In all modes Google's relevance order is preserved (distance is display-only).
    const countryFilter = /^[A-Za-z]{2}$/.test(String(options.country || '').trim())
      ? String(options.country).trim().toUpperCase()
      : undefined;
    const strictBounds = options.strictBounds !== false && !countryFilter;

    try {
      const autoResponse = await this.client.placeAutocomplete({
        params: {
          input: trimmed,
          key: this.apiKey,
          ...(countryFilter ? { components: [`country:${countryFilter}`] } : {}),
          // Strict mode: hard boundary via location+radius+strictbounds.
          // Non-strict modes (worldwide/country): NO proximity bias is sent —
          // Google ranks purely by text match (best match on top, like Maps).
          // `center` is still used below for display-only distanceKm.
          ...(center && strictBounds
            ? {
                location: center,
                radius: Math.round(radiusKm * 1000),
                strictbounds: true,
              }
            : {}),
        },
      });

      const predictions = autoResponse?.data?.predictions || [];
      const results: GeocodingResult[] = [];

      // Resolve top predictions to coordinates via Place Details (need lat/lng for boundary checks + display distance).
      for (const prediction of predictions.slice(0, MAX_AUTOCOMPLETE_RESULTS)) {
        try {
          const detailsResponse = await this.client.placeDetails({
            params: {
              place_id: prediction.place_id,
              fields: [
                'formatted_address',
                'geometry',
                'place_id',
                'name',
                'address_components',
              ],
              key: this.apiKey,
            },
          });
          const detail = detailsResponse?.data?.result;
          const loc = detail?.geometry?.location as { lat: number; lng: number } | undefined;
          if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
          const candidateCountry = extractCountryCode(
            detail?.address_components as Array<{ short_name: string; types: string[] }> | undefined,
          );
          // Enforce country restriction (components filter is a hint; verify per-place).
          if (countryFilter && candidateCountry && candidateCountry !== countryFilter) continue;
          const candidate: GeocodingResult = {
            address:
              detail?.formatted_address ||
              prediction.description ||
              detail?.name ||
              trimmed,
            coordinates: { latitude: loc.lat, longitude: loc.lng },
            placeId: prediction.place_id,
            countryCode: candidateCountry,
          };
          if (center) {
            candidate.distanceKm = this.calculateHaversineDistance(
              center.lat,
              center.lng,
              loc.lat,
              loc.lng,
            );
            // Strictly enforce bookable radius only in restricted mode.
            // Worldwide / country modes keep everything (distance is display-only).
            if (strictBounds && candidate.distanceKm > radiusKm) continue;
          }
          results.push(candidate);
        } catch (err) {
          this.logger.warn(
            `Place details failed for place_id "${prediction?.place_id}": ${err}`,
          );
        }
      }

      // Fallback: when autocomplete yields nothing (or everything was out of
      // range), try plain geocoding which returns all candidates.
      // Geocode order (best match first) is preserved; boundaries still apply.
      if (results.length === 0) {
        const fallback = await this.geocodeAllAddresses(trimmed, {
          country: countryFilter,
        });
        const withDistance = center
          ? fallback.map((item) => ({
              ...item,
              distanceKm: this.calculateHaversineDistance(
                center.lat,
                center.lng,
                item.coordinates.latitude,
                item.coordinates.longitude,
              ),
            }))
          : fallback;
        const filtered = strictBounds
          ? withDistance.filter((item) => (item.distanceKm ?? 0) <= radiusKm)
          : countryFilter
            ? withDistance.filter(
                (item) => !item.countryCode || item.countryCode === countryFilter,
              )
            : withDistance;
        return filtered.slice(0, MAX_AUTOCOMPLETE_RESULTS);
      }

      // Preserve Google's prediction order (best text match on top).
      return results;
    } catch (error) {
      this.logger.error(`Autocomplete error for input "${trimmed}":`, error);
      throw new Error('Failed to autocomplete places');
    }
  }

  /**
   * Geocode returning ALL candidates (used as autocomplete fallback and to
   * surface at least 3 hints instead of a single best match).
   * When `country` is provided, results are restricted to that country.
   */
  async geocodeAllAddresses(
    address: string,
    options: { country?: string } = {},
  ): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const countryFilter = /^[A-Za-z]{2}$/.test(String(options.country || '').trim())
      ? String(options.country).trim().toUpperCase()
      : undefined;

    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
          ...(countryFilter ? { components: { country: countryFilter } } : {}),
        },
      });

      return (response.data.results || []).map((result) => ({
        address: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        },
        placeId: result.place_id,
        countryCode: extractCountryCode(
          result.address_components as Array<{ short_name: string; types: string[] }> | undefined,
        ),
      }));
    } catch (error) {
      this.logger.error(`Geocoding error for address "${address}":`, error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Convert address to coordinates (Geocoding)
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          address: result.formatted_address,
          coordinates: {
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
          },
          placeId: result.place_id,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Geocoding error for address "${address}":`, error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Convert coordinates to address (Reverse Geocoding)
   * Returns structured address components for better parsing
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{ formattedAddress: string; addressComponents: Array<{ long_name: string; short_name: string; types: string[] }> } | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: this.apiKey,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components || [],
        };
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Reverse geocoding error for coordinates (${latitude}, ${longitude}):`,
        error,
      );
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Calculate distance and duration between two points
   */
  async calculateDistance(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<DistanceResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await this.client.distancematrix({
        params: {
          origins: [`${origin.latitude},${origin.longitude}`],
          destinations: [`${destination.latitude},${destination.longitude}`],
          mode: TravelMode.driving,
          key: this.apiKey,
        },
      });

      if (
        response.data.rows &&
        response.data.rows[0] &&
        response.data.rows[0].elements &&
        response.data.rows[0].elements[0] &&
        response.data.rows[0].elements[0].status === 'OK'
      ) {
        const element = response.data.rows[0].elements[0];
        return {
          distance: element.distance.value / 1000, // Convert meters to kilometers
          duration: element.duration.value / 60, // Convert seconds to minutes
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Distance calculation error:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  /**
   * Get detailed route with directions
   */
  async getRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    waypoints?: Array<{ latitude: number; longitude: number }>,
  ): Promise<RouteResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const waypointsFormatted = waypoints?.map(
        (wp) => `${wp.latitude},${wp.longitude}`,
      );

      const response = await this.client.directions({
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          waypoints: waypointsFormatted,
          mode: TravelMode.driving,
          optimize: true,
          key: this.apiKey,
        },
      });

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;
        const steps: RouteResult['steps'] = [];

        route.legs.forEach((leg) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;

          leg.steps.forEach((step) => {
            steps.push({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML tags
              distance: step.distance.value / 1000, // Convert to km
              duration: step.duration.value / 60, // Convert to minutes
            });
          });
        });

        return {
          distance: totalDistance / 1000, // Convert to km
          duration: totalDuration / 60, // Convert to minutes
          polyline: route.overview_polyline.points,
          steps,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Route calculation error:', error);
      throw new Error('Failed to calculate route');
    }
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Calculate distance between two points using Haversine formula (for quick calculations without API call)
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check flying restrictions for a location (airspace compliance)
   * Returns GREEN/YELLOW/RED zone classification
   * 
   * NOTE: This implementation uses realistic mock data for demonstration.
   * In production, integrate with an Airspace API (e.g., AirMap, Altitude Angel, DGCA API)
   */
  async checkFlyingRestrictions(
    latitude: number,
    longitude: number,
    serviceType?: string,
  ): Promise<{
    zone: 'GREEN' | 'YELLOW' | 'RED';
    status: 'CLEAR' | 'RESTRICTED' | 'NO_FLY';
    message: string;
    details?: {
      restrictionType?: string;
      authority?: string;
      allowedAltitude?: number;
      requiresPermit?: boolean;
      nearbyAirports?: Array<{ name: string; distance: number }>;
    };
  }> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    this.logger.log(
      `Checking flying restrictions for location (${latitude}, ${longitude})`,
    );

    // Production-ready logic with realistic restricted zone data
    // TODO: Replace with actual Airspace API integration
    
    // Example: Check proximity to known restricted zones (simplified logic)
    const restrictedZones = [
      // Major airports with 10km no-fly zones
      { name: 'Delhi International Airport', lat: 28.5562, lng: 77.1000, radius: 10, type: 'AIRPORT' },
      { name: 'Mumbai Airport', lat: 19.0896, lng: 72.8656, radius: 10, type: 'AIRPORT' },
      { name: 'Bangalore Airport', lat: 13.1986, lng: 77.7066, radius: 10, type: 'AIRPORT' },
      
      // Military zones (5km no-fly)
      { name: 'Military Airbase', lat: 28.4595, lng: 77.0266, radius: 5, type: 'MILITARY' },
      
      // Government buildings (2km restricted)
      { name: 'Government Complex', lat: 28.6139, lng: 77.2090, radius: 2, type: 'GOVERNMENT' },
    ];

    // Check distance to each restricted zone
    for (const zone of restrictedZones) {
      const distance = this.calculateHaversineDistance(
        latitude,
        longitude,
        zone.lat,
        zone.lng,
      );

      // RED zone: Inside no-fly zone
      if (distance <= zone.radius) {
        return {
          zone: 'RED',
          status: 'NO_FLY',
          message: `This location is within a no-fly zone (${zone.name}). Specific permissions are required for this booking.`,
          details: {
            restrictionType: zone.type,
            authority: zone.type === 'AIRPORT' ? 'AAI' : 'DGCA',
            allowedAltitude: 0,
            requiresPermit: true,
            nearbyAirports: zone.type === 'AIRPORT' 
              ? [{ name: zone.name, distance: Math.round(distance * 10) / 10 }]
              : undefined,
          },
        };
      }

      // YELLOW zone: Near restricted zone (buffer zone)
      if (distance <= zone.radius * 1.5) {
        return {
          zone: 'YELLOW',
          status: 'RESTRICTED',
          message: `This location is near a restricted zone (${zone.name}). Operations require special permission and altitude limits apply.`,
          details: {
            restrictionType: zone.type,
            authority: 'DGCA',
            allowedAltitude: 50, // 50 meters max altitude
            requiresPermit: true,
            nearbyAirports: zone.type === 'AIRPORT'
              ? [{ name: zone.name, distance: Math.round(distance * 10) / 10 }]
              : undefined,
          },
        };
      }
    }

    // GREEN zone: Clear airspace
    return {
      zone: 'GREEN',
      status: 'CLEAR',
      message: 'Clear airspace. Drone operations are permitted following standard regulations.',
      details: {
        restrictionType: 'NONE',
        authority: 'DGCA',
        allowedAltitude: 120, // Standard max altitude in India
        requiresPermit: false,
      },
    };
  }

  /**
   * Check weather conditions for drone operations
   * Returns GREEN/YELLOW/RED status based on weather suitability
   * 
   * NOTE: This implementation uses realistic mock data for demonstration.
   * In production, integrate with a Weather API (e.g., OpenWeatherMap, Weather.com, IMD)
   */
  async checkWeatherConditions(
    latitude: number,
    longitude: number,
    targetDate?: string,
  ): Promise<{
    status: 'GREEN' | 'YELLOW' | 'RED';
    condition: 'FAVORABLE' | 'MARGINAL' | 'UNFAVORABLE';
    message: string;
    forecast: {
      temperature: number;
      windSpeed: number;
      windGust?: number;
      precipitation: number;
      humidity: number;
      visibility: number;
      cloudCover: number;
      weatherDescription: string;
    };
    warnings?: string[];
    recommendation: string;
  }> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided');
    }

    this.logger.log(
      `Checking weather conditions for location (${latitude}, ${longitude})`,
    );

    // MOCK IMPLEMENTATION WITH REALISTIC LOGIC
    // In production, replace with actual Weather API integration
    
    // Generate realistic mock weather data based on location and season
    const now = new Date();
    const targetDateObj = targetDate ? new Date(targetDate) : now;
    const month = targetDateObj.getMonth();
    const isMonsoon = month >= 5 && month <= 9; // June to October in India
    const isWinter = month >= 10 || month <= 2; // November to March
    
    // Simulate weather variability
    const randomFactor = Math.random();
    
    const mockForecast = {
      temperature: isWinter ? 18 + randomFactor * 10 : 28 + randomFactor * 8,
      windSpeed: isMonsoon ? 15 + randomFactor * 15 : 8 + randomFactor * 8,
      windGust: isMonsoon ? 25 + randomFactor * 20 : undefined,
      precipitation: isMonsoon ? randomFactor * 15 : randomFactor * 2,
      humidity: isMonsoon ? 70 + randomFactor * 20 : 50 + randomFactor * 20,
      visibility: isMonsoon ? 3 + randomFactor * 5 : 8 + randomFactor * 4,
      cloudCover: isMonsoon ? 60 + randomFactor * 30 : 20 + randomFactor * 40,
      weatherDescription: isMonsoon 
        ? (randomFactor > 0.7 ? 'Heavy rain' : randomFactor > 0.4 ? 'Light rain' : 'Cloudy')
        : (randomFactor > 0.8 ? 'Partly cloudy' : 'Clear sky'),
    };

    // Determine status based on critical parameters
    const warnings: string[] = [];
    
    // Check wind conditions (critical for drones)
    if (mockForecast.windSpeed > 25) {
      warnings.push('High wind speed detected. Drone stability may be compromised.');
    } else if (mockForecast.windSpeed > 15) {
      warnings.push('Moderate wind speed. Proceed with caution.');
    }
    
    // Check precipitation (rain is dangerous for drones)
    if (mockForecast.precipitation > 5) {
      warnings.push('Heavy precipitation expected. Drone operations not recommended.');
    } else if (mockForecast.precipitation > 1) {
      warnings.push('Light precipitation possible. Monitor conditions closely.');
    }
    
    // Check visibility
    if (mockForecast.visibility < 3) {
      warnings.push('Poor visibility. VLOS (Visual Line of Sight) may be difficult.');
    } else if (mockForecast.visibility < 5) {
      warnings.push('Reduced visibility. Maintain close monitoring.');
    }

    // Determine overall status
    let status: 'GREEN' | 'YELLOW' | 'RED';
    let condition: 'FAVORABLE' | 'MARGINAL' | 'UNFAVORABLE';
    let message: string;
    let recommendation: string;

    if (
      mockForecast.windSpeed > 25 ||
      mockForecast.precipitation > 5 ||
      mockForecast.visibility < 3
    ) {
      // RED: Unfavorable conditions
      status = 'RED';
      condition = 'UNFAVORABLE';
      message = 'Weather conditions are unfavorable for drone operations. High risk.';
      recommendation = 'Postpone operations until weather improves. Safety is paramount.';
    } else if (
      mockForecast.windSpeed > 15 ||
      mockForecast.precipitation > 1 ||
      mockForecast.visibility < 5
    ) {
      // YELLOW: Marginal conditions
      status = 'YELLOW';
      condition = 'MARGINAL';
      message = 'Weather conditions are marginal. Operations can proceed with increased caution.';
      recommendation = 'Proceed at your own risk. Monitor weather continuously during operation.';
    } else {
      // GREEN: Favorable conditions
      status = 'GREEN';
      condition = 'FAVORABLE';
      message = 'Weather conditions are favorable for drone operations.';
      recommendation = 'Conditions are suitable for safe drone operations. Follow standard procedures.';
    }

    return {
      status,
      condition,
      message,
      forecast: {
        ...mockForecast,
        temperature: Math.round(mockForecast.temperature * 10) / 10,
        windSpeed: Math.round(mockForecast.windSpeed * 10) / 10,
        windGust: mockForecast.windGust ? Math.round(mockForecast.windGust * 10) / 10 : undefined,
        precipitation: Math.round(mockForecast.precipitation * 10) / 10,
        humidity: Math.round(mockForecast.humidity),
        visibility: Math.round(mockForecast.visibility * 10) / 10,
        cloudCover: Math.round(mockForecast.cloudCover),
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendation,
    };
  }
}
