import { IsOptional, IsEnum } from 'class-validator';

export class FleetManagerStatsDto {
  @IsOptional()
  @IsEnum(['week', 'month', 'year'])
  period?: 'week' | 'month' | 'year';
}
