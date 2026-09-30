import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';

export class UpdatePilotProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTypes?: string[];

  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
}
