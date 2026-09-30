import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class TechnicianFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(['active', 'pending', 'blocked', 'suspended', 'rejected'])
  status?: 'active' | 'pending' | 'blocked' | 'suspended' | 'rejected';

  @IsOptional()
  @IsString()
  specialization?: string;
}
