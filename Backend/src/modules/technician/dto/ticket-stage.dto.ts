import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Technician repair workflow stages per implementation_plan.md §5.2
 * 5-stage state machine: INCOMING → ACCEPTED → DIAGNOSIS → PARTS_PROCUREMENT → REPAIR_ACTIVE → QUALITY_CHECK → COMPLETED
 */
export enum TicketStage {
  INCOMING = 'INCOMING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DIAGNOSIS = 'DIAGNOSIS',
  PARTS_PROCUREMENT = 'PARTS_PROCUREMENT',
  REPAIR_ACTIVE = 'REPAIR_ACTIVE',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
}

export class TicketPhotoDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  uploadedAt?: string;
}

export class UpdateTicketStageDto {
  @IsEnum(TicketStage)
  stage!: TicketStage;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPhotoDto)
  photos?: TicketPhotoDto[];
}

export class AcceptTicketDto {
  @IsOptional()
  @IsString()
  estimatedCompletionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectTicketDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteTicketDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPhotoDto)
  beforePhotos!: TicketPhotoDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketPhotoDto)
  afterPhotos!: TicketPhotoDto[];

  @IsString()
  completionNotes!: string;

  @IsOptional()
  @IsString()
  recommendationsForFutureUse?: string;
}
