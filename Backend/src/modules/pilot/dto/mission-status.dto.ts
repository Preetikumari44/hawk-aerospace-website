import { IsIn, IsOptional, IsString, MaxLength, Length } from 'class-validator';

export class MissionStatusDto {
  @IsIn(['en_route', 'at_location', 'preflight', 'started', 'completed'])
  status!: 'en_route' | 'at_location' | 'preflight' | 'started' | 'completed';

  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;

  /**
   * Drone handover issue code (shared by the FM in person). Required to move
   * to 'started' while the issue verification is pending.
   */
  @IsOptional()
  @IsString()
  @Length(4, 4)
  handoverCode?: string;
}
