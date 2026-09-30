import { IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

import { APP_ROLES } from '../../../common/constants/roles.constant';

export class VerifyOtpDto {
  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  otpCode?: string;

  @IsOptional()
  @IsString()
  firebaseIdToken?: string;

  @IsOptional()
  @IsIn(APP_ROLES)
  role?: (typeof APP_ROLES)[number];

  @IsOptional()
  @IsString()
  name?: string;

  /** Refer & Earn code (e.g. HAWK-CUST-XXXXXX) captured at signup. */
  @IsOptional()
  @IsString()
  referralCode?: string;
}
