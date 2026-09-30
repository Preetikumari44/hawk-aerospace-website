import { IsDateString, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class BookingFilterDto extends PaginationDto {
  /**
   * Single booking status OR a comma-separated list of statuses, e.g.
   * `status=confirmed,in_progress`. Multiple values are applied with an
   * `in` query so admin tabs like "Active" can show several statuses.
   */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerUid?: string;

  @IsOptional()
  @IsString()
  pilotUid?: string;

  @IsOptional()
  @IsString()
  fleetManagerUid?: string;

  @IsOptional()
  @IsString()
  aggregatorUid?: string;

  @IsOptional()
  @IsString()
  cropType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  adminApprovalStatus?: string;
}
