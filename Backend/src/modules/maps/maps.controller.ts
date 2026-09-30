/**
 * Google Maps Controller
 * Provides API endpoints for map-related operations
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Maps')
@Controller('maps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  @ApiOperation({ summary: 'Convert address to coordinates' })
  async geocode(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Address is required');
    }

    const result = await this.mapsService.geocodeAddress(address);

    if (!result) {
      throw new BadRequestException('Could not geocode the provided address');
    }

    return {
      success: true,
      data: result,
    };
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete places (multiple hints, optionally worldwide or country-restricted)' })
  async autocomplete(
    @Query('input') input: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('strictBounds') strictBounds?: string,
    @Query('worldwide') worldwide?: string,
    @Query('country') country?: string,
  ) {
    if (!input || String(input).trim().length < 2) {
      throw new BadRequestException('Input of at least 2 characters is required');
    }

    const lat = latitude !== undefined ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined ? parseFloat(longitude) : undefined;
    if (
      (latitude !== undefined && !Number.isFinite(lat as number)) ||
      (longitude !== undefined && !Number.isFinite(lng as number))
    ) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }
    if (
      lat !== undefined &&
      lng !== undefined &&
      !this.mapsService.validateCoordinates(lat, lng)
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    const parsedRadius = radiusKm !== undefined ? parseFloat(radiusKm) : 100;
    // Worldwide mode: no boundary filtering (relevance order preserved).
    // Enabled via ?worldwide=true or ?strictBounds=false.
    // Country mode (?country=IN): anywhere in that country, no radius limit.
    const normalizedCountry = /^[A-Za-z]{2}$/.test(String(country || '').trim())
      ? String(country).trim().toUpperCase()
      : undefined;
    const isWorldwide =
      String(worldwide || '').toLowerCase() === 'true' ||
      String(strictBounds || '').toLowerCase() === 'false' ||
      !!normalizedCountry;
    const results = await this.mapsService.autocompletePlaces(input, {
      latitude: lat,
      longitude: lng,
      radiusKm: Number.isFinite(parsedRadius) ? parsedRadius : 100,
      strictBounds: !isWorldwide,
      country: normalizedCountry,
    });

    return {
      success: true,
      data: results,
    };
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Convert coordinates to address' })
  async reverseGeocode(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    if (!this.mapsService.validateCoordinates(lat, lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const result = await this.mapsService.reverseGeocode(lat, lng);

    if (!result) {
      throw new BadRequestException(
        'Could not find address for the provided coordinates',
      );
    }

    return {
      success: true,
      data: result,
    };
  }

  @Post('distance')
  @ApiOperation({ summary: 'Calculate distance between two points' })
  async calculateDistance(
    @Body()
    body: {
      origin: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
    },
  ) {
    const { origin, destination } = body;

    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination are required');
    }

    if (
      !this.mapsService.validateCoordinates(
        origin.latitude,
        origin.longitude,
      ) ||
      !this.mapsService.validateCoordinates(
        destination.latitude,
        destination.longitude,
      )
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    const result = await this.mapsService.calculateDistance(origin, destination);

    if (!result) {
      throw new BadRequestException('Could not calculate distance');
    }

    return {
      success: true,
      data: result,
    };
  }

  @Post('route')
  @ApiOperation({ summary: 'Get detailed route with directions' })
  async getRoute(
    @Body()
    body: {
      origin: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
      waypoints?: Array<{ latitude: number; longitude: number }>;
    },
  ) {
    const { origin, destination, waypoints } = body;

    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination are required');
    }

    if (
      !this.mapsService.validateCoordinates(
        origin.latitude,
        origin.longitude,
      ) ||
      !this.mapsService.validateCoordinates(
        destination.latitude,
        destination.longitude,
      )
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    const result = await this.mapsService.getRoute(
      origin,
      destination,
      waypoints,
    );

    if (!result) {
      throw new BadRequestException('Could not calculate route');
    }

    return {
      success: true,
      data: result,
    };
  }

  @Post('haversine-distance')
  @ApiOperation({
    summary: 'Calculate approximate distance using Haversine formula (no API call)',
  })
  async calculateHaversineDistance(
    @Body()
    body: {
      origin: { latitude: number; longitude: number };
      destination: { latitude: number; longitude: number };
    },
  ) {
    const { origin, destination } = body;

    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination are required');
    }

    if (
      !this.mapsService.validateCoordinates(
        origin.latitude,
        origin.longitude,
      ) ||
      !this.mapsService.validateCoordinates(
        destination.latitude,
        destination.longitude,
      )
    ) {
      throw new BadRequestException('Invalid coordinates');
    }

    const distance = this.mapsService.calculateHaversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );

    return {
      success: true,
      data: {
        distance, // in kilometers
      },
    };
  }
}
