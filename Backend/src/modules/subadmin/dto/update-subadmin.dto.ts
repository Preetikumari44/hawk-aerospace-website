import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSubAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('IN')
  mobile?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedDepartment?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;
}
