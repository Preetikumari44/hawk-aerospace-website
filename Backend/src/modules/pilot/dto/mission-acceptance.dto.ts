import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MissionAcceptanceDto {
  @IsBoolean()
  accepted!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;
}
