import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import {
  AREA_UNITS,
  DRONE_TIERS,
  type AreaUnit,
  type DroneTier,
} from '../../pricing/data/crop-rates';

export class PilotPriceLockDto {
  @IsString()
  cropType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  actualAreaValue!: number;

  @IsIn(AREA_UNITS)
  actualAreaUnit!: AreaUnit;

  @IsOptional()
  @IsIn(DRONE_TIERS)
  droneTier?: DroneTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualFlightHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  couponDiscountAmount?: number;

  @IsIn(['cash', 'upi', 'wallet'])
  paymentMethod!: 'cash' | 'upi' | 'wallet';
}
