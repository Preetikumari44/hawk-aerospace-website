import { IsEnum, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ApplicationRole {
  FLEET_MANAGER = 'fleet_manager',
  VENDOR = 'vendor',
  TECHNICIAN = 'technician',
}

export class DocumentDto {
  @IsString()
  type: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ApplyRoleDto {
  @IsEnum(ApplicationRole)
  targetRole: ApplicationRole;

  @IsString()
  reason: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsOptional()
  @IsString()
  businessName?: string; // For vendor applications

  @IsOptional()
  @IsString()
  gstNumber?: string; // For vendor applications

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceRegions?: string[]; // For vendor/fleet manager applications

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[]; // For technician applications
}

export interface RoleApplication {
  applicationId: string;
  pilotId: string;
  pilotName: string;
  currentRole: string;
  targetRole: ApplicationRole;
  reason: string;
  documents?: DocumentDto[];
  businessName?: string;
  gstNumber?: string;
  serviceRegions?: string[];
  specializations?: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
