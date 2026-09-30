import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class AdditionalChargeDto {
  @IsNotEmpty()
  @IsString()
  itemDescription!: string;

  @IsOptional()
  @IsString()
  partName?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  partsCost!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  laborCost!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  justification?: string;
}

export class CreateMaintenanceTicketDto {
  @IsNotEmpty()
  @IsString()
  droneId!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsIn(['ROUTINE', 'REPAIR', 'EMERGENCY', 'INSPECTION', 'UPGRADE'])
  category!: string;

  @IsNotEmpty()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority!: string;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  dateTime?: string;

  @IsOptional()
  @IsString()
  reporterName?: string;

  @IsOptional()
  @IsString()
  technicianUid?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationHours?: number;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}

export class UpdateMaintenanceStageDto {
  @IsNotEmpty()
  @IsIn(['REPORTED', 'DIAGNOSED', 'PARTS_ORDERED', 'REPAIR_IN_PROGRESS', 'COMPLETED'])
  stage!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class SubmitAdditionalChargesDto {
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  charges!: AdditionalChargeDto[];

  @IsOptional()
  @IsString()
  overallJustification?: string;
}

export class ApproveAdditionalChargesDto {
  @IsNotEmpty()
  @IsString()
  chargeId!: string;

  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION'])
  decision!: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number; // If partial approval
}

export class AssignTechnicianDto {
  @IsNotEmpty()
  @IsString()
  technicianUid!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
