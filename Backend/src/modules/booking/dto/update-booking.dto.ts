import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ServiceDetailsDto, DetailedAddressDto } from './create-booking.dto';

class LocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DetailedAddressDto)
  detailedAddress?: DetailedAddressDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaValue?: number;

  @IsOptional()
  @IsString()
  areaUnit?: string;

  @IsOptional()
  @IsString()
  cropType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceDetailsDto)
  serviceDetails?: ServiceDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation?: LocationDto;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
