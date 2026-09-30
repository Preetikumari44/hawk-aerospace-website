import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class FleetManagerRequestDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsObject()
  @IsOptional()
  bookingDetails?: {
    serviceType: string;
    location: { lat: number; lng: number };
    scheduledDate: string;
    cropType: string;
    area: { value: number; unit: string };
  };
}

export class AcceptFleetManagerRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

export class RejectFleetManagerRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
