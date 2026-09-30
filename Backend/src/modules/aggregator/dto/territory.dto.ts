import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GeographicBoundaryDto {
  @IsArray()
  coordinates!: number[][]; // Array of [lat, lng] pairs forming a polygon

  @IsString()
  @IsNotEmpty()
  type!: 'Polygon' | 'Circle';

  @IsOptional()
  center?: { lat: number; lng: number };

  @IsOptional()
  radius?: number; // in kilometers for Circle type
}

export class AssignTerritoryDto {
  @IsString()
  @IsNotEmpty()
  aggregatorUid!: string;

  @IsArray()
  @IsString({ each: true })
  states!: string[];

  @IsArray()
  @IsString({ each: true })
  districts!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GeographicBoundaryDto)
  boundary?: GeographicBoundaryDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TerritoryFilterDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  aggregatorUid?: string;
}

export class CheckTerritoryDto {
  @IsNotEmpty()
  lat!: number;

  @IsNotEmpty()
  lng!: number;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;
}
