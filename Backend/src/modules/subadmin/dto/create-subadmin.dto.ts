import {
  IsEmail,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSubAdminDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsPhoneNumber('IN')
  mobile!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assignedDepartment?: string;

  @IsObject()
  permissions!: Record<string, boolean>;
}
