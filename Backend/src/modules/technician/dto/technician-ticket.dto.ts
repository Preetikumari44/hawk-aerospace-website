import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';
import type { TicketStage } from './ticket-stage.dto';

export enum TicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_PARTS = 'AWAITING_PARTS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export class TicketFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  droneId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class TicketResponseDto {
  id!: string;
  droneId!: string;
  pilotUid?: string;
  technicianUid?: string;
  fleetManagerUid?: string;
  category!: string;
  description!: string;
  priority!: TicketPriority;
  status!: TicketStatus;
  stage!: TicketStage;
  mediaUrls!: string[];
  createdAt!: string;
  updatedAt!: string;
  scheduledDate?: string;
  slaDeadline?: string;
  resolvedAt?: string;
  estimatedCost?: number;
  finalCost?: number;
  drone?: any;
  additionalCharges?: any[];
  beforePhotos?: any[];
  afterPhotos?: any[];
  completionNotes?: string;
  diagnosisNotes?: string;
}
