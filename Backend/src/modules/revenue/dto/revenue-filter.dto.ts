import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class RevenueFilterDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  cropType?: string;

  @IsOptional()
  @IsIn(['spraying', 'seeding', 'monitoring'])
  serviceType?: 'spraying' | 'seeding' | 'monitoring';

  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @IsString()
  aggregatorUid?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';
}
