import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '../../common/cache/cache.service';
import {
  ConditionStatus,
  LatLng,
  WeatherCheckResult,
  WeatherMetrics,
} from './interfaces/flight-conditions.interface';

/**
 * Drone-flight safety thresholds. Tuned for small agricultural/survey drones.
 * Any single RED condition => RED; any single YELLOW => YELLOW; otherwise GREEN.
 */
const THRESHOLDS = {
  windSpeedKmh: { yellow: 25, red: 36 }, // ~7 m/s caution, ~10 m/s unsafe
  windGustKmh: { yellow: 32, red: 45 },
  precipitationMm: { yellow: 0.5, red: 2.5 }, // per hour
  precipitationProbability: { yellow: 50, red: 80 }, // percent
  visibilityM: { yellow: 3000, red: 1000 }, // lower is worse
  cloudCoverPct: { yellow: 90, red: 101 }, // cloud alone never hard-blocks
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min (matches caching strategy)
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Weather pre-flight check. Backed by Open-Meteo (free, no API key required).
 * If a different provider is preferred later, only `fetchForecast` needs changing.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl =
      this.configService.get<string>('WEATHER_API_URL') || OPEN_METEO_URL;
  }

  /**
   * Evaluate flight weather for a location at (optionally) a scheduled time.
   * Fails SAFE-BUT-OPEN: if the provider is unreachable, returns YELLOW rather
   * than blocking the booking outright.
   */
  async checkWeather(
    location: LatLng,
    scheduledAt?: string,
  ): Promise<WeatherCheckResult> {
    const forecastTime = this.resolveForecastTime(scheduledAt);
    const cacheKey = this.cacheKey(location, forecastTime);

    const cached = await this.cacheService.get<WeatherCheckResult>(cacheKey);
    if (cached) {
      return cached;
    }

    let result: WeatherCheckResult;
    try {
      const metrics = await this.fetchForecast(location, forecastTime);
      result = this.evaluate(location, metrics, forecastTime);
    } catch (error) {
      this.logger.error(
        `Weather lookup failed for (${location.lat}, ${location.lng}):`,
        error,
      );
      result = this.unavailableResult(location, forecastTime);
    }

    await this.cacheService.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  /** Fetch the forecast hour nearest to the requested time from Open-Meteo. */
  private async fetchForecast(
    location: LatLng,
    forecastTime: Date,
  ): Promise<WeatherMetrics> {
    const params = new URLSearchParams({
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      hourly: [
        'temperature_2m',
        'precipitation',
        'precipitation_probability',
        'visibility',
        'wind_speed_10m',
        'wind_gusts_10m',
        'cloud_cover',
      ].join(','),
      wind_speed_unit: 'kmh',
      timezone: 'UTC',
      forecast_days: '3',
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo responded ${response.status}`);
    }

    const data: any = await response.json();
    const times: string[] = data?.hourly?.time ?? [];
    if (times.length === 0) {
      throw new Error('Open-Meteo returned no hourly data');
    }

    const idx = this.nearestHourIndex(times, forecastTime);
    const pick = (arr: any[]): number =>
      typeof arr?.[idx] === 'number' ? arr[idx] : 0;

    return {
      temperatureC: pick(data.hourly.temperature_2m),
      windSpeedKmh: pick(data.hourly.wind_speed_10m),
      windGustKmh: pick(data.hourly.wind_gusts_10m),
      precipitationMm: pick(data.hourly.precipitation),
      precipitationProbability: pick(data.hourly.precipitation_probability),
      // Open-Meteo omits visibility in some regions; treat missing as clear.
      visibilityM:
        typeof data.hourly.visibility?.[idx] === 'number'
          ? data.hourly.visibility[idx]
          : 10000,
      cloudCoverPct: pick(data.hourly.cloud_cover),
    };
  }

  /** Turn raw metrics into a tri-state result with reasons. */
  private evaluate(
    location: LatLng,
    metrics: WeatherMetrics,
    forecastTime: Date,
  ): WeatherCheckResult {
    const reasons: string[] = [];
    let status = ConditionStatus.GREEN;

    const escalate = (to: ConditionStatus) => {
      if (to === ConditionStatus.RED) status = ConditionStatus.RED;
      else if (to === ConditionStatus.YELLOW && status === ConditionStatus.GREEN)
        status = ConditionStatus.YELLOW;
    };

    const grade = (
      value: number,
      t: { yellow: number; red: number },
      label: string,
      unit: string,
      lowerIsWorse = false,
    ) => {
      const hitsRed = lowerIsWorse ? value < t.red : value > t.red;
      const hitsYellow = lowerIsWorse ? value < t.yellow : value > t.yellow;
      if (hitsRed) {
        escalate(ConditionStatus.RED);
        reasons.push(`${label} ${value}${unit} exceeds safe limit`);
      } else if (hitsYellow) {
        escalate(ConditionStatus.YELLOW);
        reasons.push(`${label} ${value}${unit} is marginal`);
      }
    };

    grade(metrics.windSpeedKmh, THRESHOLDS.windSpeedKmh, 'Wind speed', ' km/h');
    grade(metrics.windGustKmh, THRESHOLDS.windGustKmh, 'Wind gusts', ' km/h');
    grade(metrics.precipitationMm, THRESHOLDS.precipitationMm, 'Precipitation', ' mm');
    grade(
      metrics.precipitationProbability,
      THRESHOLDS.precipitationProbability,
      'Rain probability',
      '%',
    );
    grade(metrics.visibilityM, THRESHOLDS.visibilityM, 'Visibility', ' m', true);
    grade(metrics.cloudCoverPct, THRESHOLDS.cloudCoverPct, 'Cloud cover', '%');

    return {
      status,
      summary: this.summaryFor(status),
      reasons,
      metrics,
      forecastFor: forecastTime.toISOString(),
      checkedAt: new Date().toISOString(),
      provider: this.baseUrl === OPEN_METEO_URL ? 'open-meteo' : 'custom',
      location,
    };
  }

  private summaryFor(status: ConditionStatus): string {
    switch (status) {
      case ConditionStatus.GREEN:
        return 'Favorable conditions for flight.';
      case ConditionStatus.YELLOW:
        return 'Marginal conditions — proceed at your own risk.';
      case ConditionStatus.RED:
        return 'Unfavorable conditions — postponement recommended.';
    }
  }

  private unavailableResult(
    location: LatLng,
    forecastTime: Date,
  ): WeatherCheckResult {
    return {
      status: ConditionStatus.YELLOW,
      summary: 'Weather data unavailable — proceed with caution.',
      reasons: ['Weather provider could not be reached'],
      metrics: {
        temperatureC: 0,
        windSpeedKmh: 0,
        windGustKmh: 0,
        precipitationMm: 0,
        precipitationProbability: 0,
        visibilityM: 0,
        cloudCoverPct: 0,
      },
      forecastFor: forecastTime.toISOString(),
      checkedAt: new Date().toISOString(),
      provider: 'unavailable',
      location,
    };
  }

  private resolveForecastTime(scheduledAt?: string): Date {
    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private nearestHourIndex(times: string[], target: Date): number {
    const targetMs = target.getTime();
    let bestIdx = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < times.length; i++) {
      // Open-Meteo hourly timestamps are UTC (timezone=UTC requested).
      const delta = Math.abs(new Date(`${times[i]}:00Z`).getTime() - targetMs);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private cacheKey(location: LatLng, forecastTime: Date): string {
    // Round coords to ~1km grid and bucket by hour so nearby requests share cache.
    const lat = location.lat.toFixed(2);
    const lng = location.lng.toFixed(2);
    const hour = forecastTime.toISOString().slice(0, 13);
    return `weather:${lat}:${lng}:${hour}`;
  }
}
