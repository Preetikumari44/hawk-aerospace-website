import { IsLatitude, IsLongitude, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class WeatherCheckDto {
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string; // ISO date string for forecast
}

export type WeatherStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface WeatherCheckResult {
  status: WeatherStatus;
  condition: 'FAVORABLE' | 'MARGINAL' | 'UNFAVORABLE';
  message: string;
  forecast: {
    temperature: number; // in Celsius
    windSpeed: number; // in km/h
    windGust?: number; // in km/h
    precipitation: number; // in mm
    humidity: number; // in %
    visibility: number; // in km
    cloudCover: number; // in %
    weatherDescription: string;
  };
  warnings?: string[];
  recommendation: string;
  cachedAt: string;
}
