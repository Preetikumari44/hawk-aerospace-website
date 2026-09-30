import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { USER_STATUSES } from '../../../common/constants/roles.constant';

export class UpdateUserStatusDto {
  @IsIn(USER_STATUSES)
  status!: (typeof USER_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  adminApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  remarks?: string;
}
