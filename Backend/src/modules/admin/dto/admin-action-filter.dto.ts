import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AdminActionFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsIn(['pending', 'in_review', 'approved', 'rejected'])
  status?: 'pending' | 'in_review' | 'approved' | 'rejected';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
