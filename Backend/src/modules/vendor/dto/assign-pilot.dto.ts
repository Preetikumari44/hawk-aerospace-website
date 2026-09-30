import { IsString } from 'class-validator';

export class VendorAssignPilotDto {
  @IsString()
  bookingId!: string;

  @IsString()
  pilotUid!: string;

  @IsString()
  droneId!: string;
}
