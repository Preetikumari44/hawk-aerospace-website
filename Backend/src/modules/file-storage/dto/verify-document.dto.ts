import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export class VerifyDocumentDto {
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  status!: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
