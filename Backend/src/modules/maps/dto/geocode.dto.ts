/**
 * Maps DTOs
 */

import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GeocodeQueryDto {
  @ApiProperty({ description: 'Address to geocode' })
  @IsNotEmpty()
  @IsString()
  address: string;
}

export class ReverseGeocodeQueryDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class CoordinatesDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class DistanceCalculationDto {
  @ApiProperty({ description: 'Origin coordinates', type: CoordinatesDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({ description: 'Destination coordinates', type: CoordinatesDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination: CoordinatesDto;
}

export class RouteCalculationDto {
  @ApiProperty({ description: 'Origin coordinates', type: CoordinatesDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({ description: 'Destination coordinates', type: CoordinatesDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination: CoordinatesDto;

  @ApiProperty({
    description: 'Optional waypoints',
    type: [CoordinatesDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  waypoints?: CoordinatesDto[];
}
