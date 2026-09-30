import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDiagnosisDto {
  @IsString()
  findings!: string;

  @IsString()
  recommendedAction!: string;

  @IsOptional()
  @IsString()
  estimatedRepairTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredParts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsString()
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class DiagnosisResponseDto {
  id!: string;
  ticketId!: string;
  technicianUid!: string;
  findings!: string;
  recommendedAction!: string;
  estimatedRepairTime?: string;
  requiredParts?: string[];
  photos?: string[];
  severity?: string;
  createdAt!: string;
  updatedAt!: string;
}
