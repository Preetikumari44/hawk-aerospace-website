import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FlightCheckDto } from './dto/flight-check.dto';
import {
  ConditionStatus,
  FlightConditionsResult,
} from './interfaces/flight-conditions.interface';
import { AirspaceService } from './airspace.service';
import { WeatherService } from './weather.service';

/**
 * Shared pre-booking check endpoints. Consumed by the customer, aggregator,
 * pilot and fleet booking flows before a booking is created.
 */
@ApiTags('Flight Conditions')
@Controller('flight-conditions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlightConditionsController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly airspaceService: AirspaceService,
  ) {}

  @Post('weather-check')
  @ApiOperation({ summary: 'Weather forecast check (GREEN/YELLOW/RED)' })
  async weatherCheck(@Body() dto: FlightCheckDto) {
    const data = await this.weatherService.checkWeather(
      { lat: dto.lat, lng: dto.lng },
      dto.scheduledAt,
    );
    return { success: true, data };
  }

  @Post('flying-restriction-check')
  @ApiOperation({
    summary:
      'Airspace / flying-restriction check (GREEN/YELLOW/RED). Pass destination for a delivery route check.',
  })
  async flyingRestrictionCheck(@Body() dto: FlightCheckDto) {
    const source = { lat: dto.lat, lng: dto.lng };
    const data = dto.destination
      ? await this.airspaceService.checkRoute(source, {
          lat: dto.destination.lat,
          lng: dto.destination.lng,
        })
      : await this.airspaceService.checkRestrictions(source);
    return { success: true, data };
  }

  @Post('check')
  @ApiOperation({
    summary: 'Combined weather + airspace check with overall verdict',
  })
  async check(@Body() dto: FlightCheckDto) {
    const location = { lat: dto.lat, lng: dto.lng };
    const [weather, airspace] = await Promise.all([
      this.weatherService.checkWeather(location, dto.scheduledAt),
      dto.destination
        ? this.airspaceService.checkRoute(location, {
            lat: dto.destination.lat,
            lng: dto.destination.lng,
          })
        : this.airspaceService.checkRestrictions(location),
    ]);

    const overall = worstStatus(weather.status, airspace.status);
    const data: FlightConditionsResult = {
      weather,
      airspace,
      overall,
      canProceed: overall !== ConditionStatus.RED,
    };
    return { success: true, data };
  }
}

/** Combine two tri-state statuses into the worst of the two. */
function worstStatus(a: ConditionStatus, b: ConditionStatus): ConditionStatus {
  const rank = {
    [ConditionStatus.GREEN]: 0,
    [ConditionStatus.YELLOW]: 1,
    [ConditionStatus.RED]: 2,
  };
  return rank[a] >= rank[b] ? a : b;
}
