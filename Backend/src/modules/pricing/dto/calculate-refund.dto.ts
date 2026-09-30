import { Type } from 'class-transformer';
import { IsString, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class CalculateRefundDto {
  @IsString()
  bookingId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsString()
  scheduledDateTime!: string; // ISO date-time string

  @IsString()
  cancellationDateTime!: string; // ISO date-time string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  pilotDispatched?: boolean; // If pilot already en route

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  travelCostIncurred?: number; // If pilot already traveling
}
