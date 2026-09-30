import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export enum DocumentType {
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  GST_CERTIFICATE = 'gst_certificate',
  BUSINESS_LICENSE = 'business_license',
  BANK_STATEMENT = 'bank_statement',
  ADDRESS_PROOF = 'address_proof',
  PHOTO = 'photo',
  OTHER = 'other',
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export class VerifyDocumentDto {
  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  status!: DocumentStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  verifiedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDocumentDto {
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type!: DocumentType;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DocumentFilterDto {
  @IsOptional()
  @IsString()
  aggregatorUid?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  expiringWithinDays?: number;
}
