import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AREA_UNITS,
  DRONE_TIERS,
  type AreaUnit,
  type DroneTier,
} from '../data/crop-rates';
import { BOOKING_SERVICE_TYPES, type DroneServiceType } from '../../../database/firestore/contracts';

class LocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class PriceEstimateRequestDto {
  @IsString()
  cropType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaValue!: number;

  @IsIn(AREA_UNITS)
  areaUnit!: AreaUnit;

  @IsIn(BOOKING_SERVICE_TYPES as readonly string[])
  serviceType!: DroneServiceType;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @IsOptional()
  @IsIn(DRONE_TIERS)
  droneTier?: DroneTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedFlightHours?: number;
}
