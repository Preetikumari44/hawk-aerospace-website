import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const COUPON_USER_ROLES = [
  'customer',
  'aggregator',
  'fleet_manager',
  'pilot',
  'technician',
] as const;

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsIn(['percentage', 'fixed'])
  discountType!: 'percentage' | 'fixed';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue!: number;

  /** Empty array (or ['*']) = universal coupon for all users. */
  @IsOptional()
  @IsArray()
  @IsIn(COUPON_USER_ROLES, { each: true })
  applicableRoles?: string[];

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
