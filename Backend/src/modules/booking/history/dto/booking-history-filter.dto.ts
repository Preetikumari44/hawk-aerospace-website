import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { BOOKING_STATUSES } from '../../interfaces/booking-status.enum';

export class BookingHistoryFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];

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
  pilotId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  aggregatorId?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsIn(['date', 'amount', 'status'])
  sortBy?: 'date' | 'amount' | 'status';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
