import { IsArray, IsOptional, IsString } from 'class-validator';

export class TechnicianProfileDto {
  @IsOptional()
  @IsArray()
  specializations?: string[];

  @IsOptional()
  @IsString()
  serviceRegion?: string;
}
