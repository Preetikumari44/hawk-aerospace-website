import { IsIn, IsOptional, IsString } from 'class-validator';

export class FleetAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  period?: string = 'month';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  pilotId?: string;

  @IsOptional()
  @IsString()
  droneId?: string;
}

export class DroneUtilizationQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'quarter', 'year'])
  period?: string = 'month';

  @IsOptional()
  @IsString()
  droneId?: string;
}

export class PilotPerformanceQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'quarter', 'year'])
  period?: string = 'month';

  @IsOptional()
  @IsString()
  pilotId?: string;

  @IsOptional()
  @IsIn(['missions', 'earnings', 'rating', 'onTimeRate'])
  sortBy?: string = 'missions';
}
