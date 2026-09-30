import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum FileCategory {
  KYC = 'kyc',
  PROFILE = 'profile',
  DRONE = 'drone',
  BOOKING = 'booking',
  INCIDENT = 'incident',
  SERVICE_TICKET = 'service_ticket',
  OTHER = 'other',
}

export enum KYCDocumentType {
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  PASSPORT = 'passport',
  DRIVING_LICENSE = 'driving_license',
  VOTER_ID = 'voter_id',
  DRONE_PILOT_LICENSE = 'drone_pilot_license',
  DRONE_LICENSE = 'drone_license',
  REMOTE_PILOT_CERTIFICATE = 'remote_pilot_certificate',
  BUSINESS_REGISTRATION = 'business_registration',
  GST_CERTIFICATE = 'gst_certificate',
  DRONE_REGISTRATION = 'drone_registration',
  INSURANCE_DOCUMENT = 'insurance_document',
  OTHER = 'other',
  OTHERS = 'others',
}

export class UploadFileDto {
  @IsEnum(FileCategory)
  @IsNotEmpty()
  category!: FileCategory;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string; // droneId, bookingId, incidentId, etc.

  @IsOptional()
  @IsString()
  description?: string;
}
