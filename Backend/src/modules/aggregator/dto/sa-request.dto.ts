import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum SARequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class CreateSARequestDto {
  @IsString()
  @IsNotEmpty()
  aggregatorId!: string;

  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  contactPerson!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsOptional()
  documents?: Array<{ type: string; url: string; name: string }>;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSARequestDto {
  @IsEnum(SARequestStatus)
  @IsNotEmpty()
  status!: SARequestStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;
}

export class SARequestFilterDto {
  @IsOptional()
  @IsString()
  status?: SARequestStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
