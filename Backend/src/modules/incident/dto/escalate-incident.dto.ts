import { IsString } from 'class-validator';

export class EscalateIncidentDto {
  @IsString()
  escalateTo!: string;

  @IsString()
  reason!: string;
}
