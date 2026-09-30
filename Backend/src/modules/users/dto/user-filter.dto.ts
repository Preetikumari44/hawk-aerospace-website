import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';
import { APP_ROLES, USER_STATUSES } from '../../../common/constants/roles.constant';

export class UserFilterDto extends PaginationDto {
  @IsOptional()
  @IsIn(APP_ROLES)
  role?: (typeof APP_ROLES)[number];

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
