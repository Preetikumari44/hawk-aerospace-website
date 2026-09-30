import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SubAdminFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @IsOptional()
  @IsString()
  assignedRegion?: string;

  @IsOptional()
  @IsString()
  assignedDepartment?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
