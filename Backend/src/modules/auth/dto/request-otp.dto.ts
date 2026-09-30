import { IsIn, IsOptional, IsPhoneNumber } from 'class-validator';

import { APP_ROLES } from '../../../common/constants/roles.constant';

export class RequestOtpDto {
  @IsPhoneNumber('IN')
  phone!: string;

  @IsOptional()
  @IsIn(APP_ROLES)
  role?: (typeof APP_ROLES)[number];
}
