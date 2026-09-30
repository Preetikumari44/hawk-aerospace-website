import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { APP_ROLES, USER_STATUSES } from '../../../common/constants/roles.constant';

class LocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

class VerificationDocumentDto {
  @IsString()
  type!: string;

  @IsString()
  url!: string;
}

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsIn(APP_ROLES)
  role!: (typeof APP_ROLES)[number];

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  adminApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationDocumentDto)
  verificationDocuments?: VerificationDocumentDto[];

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;
}
