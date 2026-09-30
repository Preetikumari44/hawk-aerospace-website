import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Unified complaint schema for all user roles
 */
export enum ComplaintRelatedEntityType {
  BOOKING = 'BOOKING',
  MISSION = 'MISSION',
  MAINTENANCE = 'MAINTENANCE',
  GENERAL = 'GENERAL',
}

export enum ComplaintType {
  SERVICE_QUALITY = 'SERVICE_QUALITY',
  PAYMENT = 'PAYMENT',
  BEHAVIOR = 'BEHAVIOR',
  TECHNICAL = 'TECHNICAL',
  OTHER = 'OTHER',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum ComplaintPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsString()
  type?: string; // e.g., 'image/jpeg', 'application/pdf'

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  size?: string; // in bytes
}

export class CreateComplaintDto {
  @IsEnum(ComplaintType)
  type!: ComplaintType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsEnum(ComplaintRelatedEntityType)
  relatedEntityType!: ComplaintRelatedEntityType;

  @IsOptional()
  @IsString()
  relatedEntityId?: string; // bookingId, missionId, maintenanceId, etc.

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority; // Optional, will be auto-assigned if not provided

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string; // Required when status is RESOLVED or CLOSED

  @IsOptional()
  @IsString()
  assignedTo?: string; // Admin/SubAdmin userId
}

export class ComplaintFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintType)
  type?: ComplaintType;

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @IsOptional()
  @IsString()
  userId?: string; // Filter by user who created the complaint

  @IsOptional()
  @IsString()
  userRole?: string; // Filter by role (customer, pilot, technician, etc.)

  @IsOptional()
  @IsString()
  assignedTo?: string; // Filter by assigned admin/subadmin

  @IsOptional()
  @IsString()
  relatedEntityType?: ComplaintRelatedEntityType;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}

export class ComplaintResponseDto {
  complaintId!: string;
  userId!: string;
  userRole!: string;
  relatedEntityType!: ComplaintRelatedEntityType;
  relatedEntityId?: string;
  type!: ComplaintType;
  description!: string;
  attachments!: AttachmentDto[];
  status!: ComplaintStatus;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  priority!: ComplaintPriority;
  slaDeadline!: string; // ISO timestamp
  slaBreached!: boolean;
  createdAt!: string;
  updatedAt!: string;
}

export class ComplaintStatsDto {
  total!: number;
  byStatus!: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  byPriority!: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  slaCompliance!: {
    withinSla: number;
    breached: number;
    complianceRate: number; // percentage
  };
  avgResolutionTime!: number; // in hours
}
