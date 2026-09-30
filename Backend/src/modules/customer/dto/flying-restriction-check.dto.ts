import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FlyingRestrictionCheckDto {
  @IsLatitude()
  @Type(() => Number)
  latitude: number;

  @IsLongitude()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsString()
  serviceType?: string;
}

export type AirspaceZone = 'GREEN' | 'YELLOW' | 'RED';

export interface FlyingRestrictionResult {
  zone: AirspaceZone;
  status: 'CLEAR' | 'RESTRICTED' | 'NO_FLY';
  message: string;
  details?: {
    restrictionType?: string;
    authority?: string;
    allowedAltitude?: number; // in meters
    requiresPermit?: boolean;
    nearbyAirports?: Array<{
      name: string;
      distance: number; // in kilometers
    }>;
  };
  cachedAt: string;
}
