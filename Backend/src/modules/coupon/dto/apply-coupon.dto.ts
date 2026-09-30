import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  code!: string;

  /** Pre-discount order amount used to compute the discount preview. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseAmount?: number;
}
