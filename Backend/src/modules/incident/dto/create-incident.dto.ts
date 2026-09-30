import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class LocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class CreateIncidentDto {
  @IsIn(['drone_malfunction', 'pilot_emergency', 'crash', 'chemical_spill', 'customer_complaint'])
  type!:
    | 'drone_malfunction'
    | 'pilot_emergency'
    | 'crash'
    | 'chemical_spill'
    | 'customer_complaint';

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  droneId?: string;

  @IsOptional()
  @IsString()
  pilotUid?: string;

  @IsString()
  description!: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @IsOptional()
  @IsArray()
  mediaUrls?: string[];
}
