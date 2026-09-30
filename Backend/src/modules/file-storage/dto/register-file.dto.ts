import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory, KYCDocumentType } from './upload-file.dto';

export class RegisterFileDto {
  @ApiProperty({
    description: 'Storage path returned from upload URL request',
    example: 'documents/user-123/kyc/aadhaar/1234567890_aadhaar-front.jpg',
  })
  @IsString()
  @IsNotEmpty()
  storagePath!: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'aadhaar-front.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  @IsNumber()
  fileSize!: number;

  @ApiProperty({
    description: 'File category',
    enum: FileCategory,
    example: FileCategory.KYC,
  })
  @IsEnum(FileCategory)
  @IsNotEmpty()
  category!: FileCategory;

  @ApiPropertyOptional({
    description: 'KYC document type (required if category is KYC)',
    enum: KYCDocumentType,
    example: KYCDocumentType.AADHAAR,
  })
  @IsOptional()
  @IsEnum(KYCDocumentType)
  documentType?: KYCDocumentType;

  @ApiPropertyOptional({
    description: 'Related entity ID',
    example: 'BOK-001',
  })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @ApiPropertyOptional({
    description: 'File description',
    example: 'Aadhaar card front side',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Public download URL from Firebase Storage',
    example: 'https://firebasestorage.googleapis.com/...',
  })
  @IsOptional()
  @IsUrl()
  downloadUrl?: string;
}
