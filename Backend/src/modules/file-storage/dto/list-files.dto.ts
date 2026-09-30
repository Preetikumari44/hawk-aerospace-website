import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileCategory, KYCDocumentType } from './upload-file.dto';
import { VerificationStatus } from './verify-document.dto';

export class ListFilesDto {
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @IsOptional()
  @IsEnum(KYCDocumentType)
  documentType?: KYCDocumentType;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}
