import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsISO8601,
  ValidateNested,
} from 'class-validator';

export class DestinationDto {
  @ApiProperty({ example: 28.62 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 77.22 })
  @IsLongitude()
  lng!: number;
}

/**
 * Coordinate-based check request. Used by the pre-booking flying-restriction and
 * weather checks, which run BEFORE a booking exists (so they take raw coordinates,
 * not a bookingId).
 */
export class FlightCheckDto {
  @ApiProperty({ example: 28.6139, description: 'Latitude of the operation site' })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 77.209, description: 'Longitude of the operation site' })
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({
    example: '2026-07-10T09:00:00.000Z',
    description:
      'Planned operation time (ISO 8601). Weather is evaluated for the nearest forecast hour. Defaults to now.',
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description:
      'Delivery destination/drop-off. When provided, the airspace check evaluates the whole source→destination route (worst point wins).',
    type: DestinationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DestinationDto)
  destination?: DestinationDto;
}
