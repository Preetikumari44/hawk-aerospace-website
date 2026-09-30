import { IsEmail, IsString, IsEnum, IsOptional, IsObject, ValidateNested, IsArray, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from './admin-query.dto';

export class ScopeDto {
  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  districts?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];
}

export class CreateAdminDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  designation: string;

  @ApiProperty({ enum: AdminRole })
  @IsEnum(AdminRole)
  role: AdminRole;

  @ApiProperty()
  @IsString()
  department: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportingTo?: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => ScopeDto)
  scope: ScopeDto;

  @ApiProperty()
  @IsString()
  permissionsProfile: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;
}
