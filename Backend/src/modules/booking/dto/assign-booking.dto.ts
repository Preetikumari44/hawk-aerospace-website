import { IsString } from 'class-validator';

export class AssignBookingDto {
  @IsString()
  pilotUid!: string;

  @IsString()
  droneId!: string;
}
