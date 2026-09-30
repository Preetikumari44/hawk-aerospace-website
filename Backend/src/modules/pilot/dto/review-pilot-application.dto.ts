import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ApplicationAction {
  APPROVE = 'approved',
  REJECT = 'rejected',
}

export class ReviewPilotApplicationDto {
  @ApiProperty({ description: 'Action to take on the application', enum: ApplicationAction })
  @IsEnum(ApplicationAction)
  @IsNotEmpty()
  action!: ApplicationAction;

  @ApiProperty({ description: 'Reason for rejection (required if rejecting)', required: false })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiProperty({ description: 'Additional notes from reviewer', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiProperty({ description: 'Fleet manager UID to assign pilot to (optional)', required: false })
  @IsString()
  @IsOptional()
  assignedFleetManagerUid?: string;
}

export class UpdateApplicationDocumentDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  @IsNotEmpty()
  applicationId!: string;

  @ApiProperty({ description: 'Document type to update' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ description: 'Verification status' })
  @IsEnum(['pending', 'verified', 'rejected'])
  @IsNotEmpty()
  status!: 'pending' | 'verified' | 'rejected';

  @ApiProperty({ description: 'Verification notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
