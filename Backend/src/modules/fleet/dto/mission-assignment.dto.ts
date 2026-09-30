import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MissionAssignmentDto {
  @IsNotEmpty()
  @IsString()
  bookingId!: string;

  @IsNotEmpty()
  @IsString()
  pilotId!: string;

  @IsNotEmpty()
  @IsString()
  droneId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignPilotToMissionDto {
  @IsNotEmpty()
  @IsString()
  pilotId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignDroneToMissionDto {
  @IsNotEmpty()
  @IsString()
  droneId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
