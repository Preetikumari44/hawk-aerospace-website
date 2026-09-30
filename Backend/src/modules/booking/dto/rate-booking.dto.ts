import { Type } from 'class-transformer';
import { IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class RateBookingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pilotFeedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  serviceFeedback?: string;
}
