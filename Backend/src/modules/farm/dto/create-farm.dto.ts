import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AREA_UNITS, type AreaUnit } from '../../pricing/data/crop-rates';

class GeoPointDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

class AreaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsIn(AREA_UNITS)
  unit!: AreaUnit;
}

export class CreateFarmDto {
  @IsString()
  @MaxLength(200)
  farmName!: string;

  @ValidateNested()
  @Type(() => GeoPointDto)
  gpsCenter!: GeoPointDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  gpsBoundary!: GeoPointDto[];

  @IsString()
  @MaxLength(500)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  village?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taluka?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ValidateNested()
  @Type(() => AreaDto)
  area!: AreaDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  crop?: string;

  @IsOptional()
  @IsIn(['Kharif', 'Rabi', 'Zaid'])
  season?: 'Kharif' | 'Rabi' | 'Zaid';

  @IsOptional()
  @IsDateString()
  plantingDate?: string;

  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  soilType?: string;

  @IsOptional()
  @IsIn(['Poor', 'Fair', 'Good', 'Excellent'])
  soilHealth?: 'Poor' | 'Fair' | 'Good' | 'Excellent';

  @IsOptional()
  @IsIn(['Rain Fed', 'Well', 'Tube Well', 'Drip', 'Sprinkler'])
  irrigationType?: 'Rain Fed' | 'Well' | 'Tube Well' | 'Drip' | 'Sprinkler';

  @IsOptional()
  @IsIn(['Rainwater', 'Borewell', 'Canal', 'River', 'Pond'])
  waterSource?: 'Rainwater' | 'Borewell' | 'Canal' | 'River' | 'Pond';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
