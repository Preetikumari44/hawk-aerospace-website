import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { AREA_UNITS, DRONE_TIERS, type AreaUnit, type DroneTier } from '../data/crop-rates';

export class EstimatePriceDto {
  @IsString()
  cropType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaValue!: number;

  @IsIn(AREA_UNITS)
  areaUnit!: AreaUnit;

  @IsOptional()
  @IsIn(DRONE_TIERS)
  droneTier?: DroneTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedFlightHours?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  chemicalRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  couponDiscountAmount?: number;

  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  preferredDate?: string; // ISO date string for seasonal/time-based calculations

  @IsOptional()
  @IsString()
  preferredTime?: string; // HH:MM format for time-of-day surcharge

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pilotLocation?: { lat: number; lng: number }; // For accurate travel charges
}
