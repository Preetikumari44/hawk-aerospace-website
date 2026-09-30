import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum ComplaintType {
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  EQUIPMENT_ISSUE = 'EQUIPMENT_ISSUE',
  WORK_ASSIGNMENT = 'WORK_ASSIGNMENT',
  HARASSMENT = 'HARASSMENT',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  OTHER = 'OTHER',
}

export enum ComplaintPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class AttachmentDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateComplaintDto {
  @IsEnum(ComplaintType)
  type!: ComplaintType;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class ComplaintFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintType)
  type?: ComplaintType;
}

export class ComplaintResponseDto {
  id!: string;
  userId!: string;
  userRole!: string;
  type!: ComplaintType;
  description!: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  status!: ComplaintStatus;
  priority!: ComplaintPriority;
  attachments?: AttachmentDto[];
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}
