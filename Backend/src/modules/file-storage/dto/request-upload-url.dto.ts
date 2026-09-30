import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StorageBucket {
  PROFILE_IMAGES = 'profile-images',
  DOCUMENTS = 'documents',
  BOOKING_MEDIA = 'booking-media',
  MAINTENANCE_MEDIA = 'maintenance-media',
  GENERAL = 'general',
}

export class RequestUploadUrlDto {
  @ApiProperty({
    description: 'Original filename with extension',
    example: 'aadhaar-front.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
    enum: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/quicktime',
    ],
  })
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  @IsNumber()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50MB max
  fileSize!: number;

  @ApiProperty({
    description: 'Storage bucket category',
    enum: StorageBucket,
    example: StorageBucket.DOCUMENTS,
  })
  @IsEnum(StorageBucket)
  @IsNotEmpty()
  bucket!: StorageBucket;

  @ApiPropertyOptional({
    description: 'Subfolder within the bucket (e.g., kyc/aadhaar, bookings/BOK-001)',
    example: 'kyc/aadhaar',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Related entity ID (bookingId, droneId, etc.)',
    example: 'BOK-001',
  })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}
