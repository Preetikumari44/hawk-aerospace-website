import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  ValidateNested,
  IsIn,
  Min,
} from 'class-validator';
import { AREA_UNITS, type AreaUnit } from '../../pricing/data/crop-rates';

class LocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class CreateFarmDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(500)
  address!: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaValue!: number;

  @IsIn(AREA_UNITS)
  areaUnit!: AreaUnit;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
