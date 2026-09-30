import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PartItemDto {
  @IsString()
  partName!: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsString()
  vendor?: string;
}

export class CreatePartsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartItemDto)
  parts!: PartItemDto[];

  @IsString()
  justification!: string;

  @IsOptional()
  @IsString()
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class PartsReceivedDto {
  @IsArray()
  @IsString({ each: true })
  receivedPartIds!: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class PartsRequestResponseDto {
  id!: string;
  ticketId!: string;
  technicianUid!: string;
  parts!: PartItemDto[];
  justification!: string;
  urgency?: string;
  status!: 'pending' | 'approved' | 'rejected' | 'received';
  requestedAt!: string;
  approvedAt?: string;
  receivedAt?: string;
  rejectionReason?: string;
}
