import { IsString, IsOptional, IsArray } from 'class-validator';

export class AutoAssignPilotDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredPilots?: string[];

  @IsOptional()
  @IsString()
  vendorUid?: string;
}
