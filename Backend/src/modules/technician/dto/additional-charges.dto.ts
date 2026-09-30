import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ChargeItemDto {
  @IsString()
  itemName!: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsNumber()
  @Min(0)
  partsCost!: number;

  @IsNumber()
  @Min(0)
  laborCost!: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class SubmitAdditionalChargesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargeItemDto)
  charges!: ChargeItemDto[];

  @IsString()
  justification!: string;
}

export class AdditionalChargeResponseDto {
  id!: string;
  itemName!: string;
  partNumber?: string;
  partsCost!: number;
  laborCost!: number;
  totalCost!: number;
  description!: string;
  photos?: string[];
  status!: 'pending' | 'approved' | 'rejected';
  approvedAmount?: number;
  comments?: string;
  submittedAt!: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
