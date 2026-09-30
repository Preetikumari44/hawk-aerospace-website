import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PilotDocumentDto {
  @ApiProperty({ description: 'Document type identifier' })
  @IsString()
  @IsNotEmpty()
  type!: 'aadhaar_front' | 'aadhaar_back' | 'pilot_license' | 'gst_registration' | 'pilot_registration' | 'medical_certificate';

  @ApiProperty({ description: 'Firebase Storage path' })
  @IsString()
  @IsNotEmpty()
  storagePath!: string;

  @ApiProperty({ description: 'Download URL for the document' })
  @IsString()
  @IsNotEmpty()
  downloadUrl!: string;

  @ApiProperty({ description: 'Verification status', required: false })
  @IsOptional()
  @IsEnum(['pending', 'verified', 'rejected'])
  verified?: 'pending' | 'verified' | 'rejected';
}

export class SubmitPilotApplicationDto {
  @ApiProperty({ description: 'Full name of the applicant' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Age of the applicant' })
  @IsNumber()
  @Min(18)
  @Max(70)
  age!: number;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Complete address' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ description: 'Pilot license number' })
  @IsString()
  @IsNotEmpty()
  pilotLicenseNumber!: string;

  @ApiProperty({ description: 'Pilot license expiry date' })
  @IsDateString()
  @IsNotEmpty()
  pilotExpiryDate!: string;

  @ApiProperty({ description: 'Aadhaar card number' })
  @IsString()
  @IsNotEmpty()
  aadhaarCardNumber!: string;

  @ApiProperty({ description: 'PAN card number' })
  @IsString()
  @IsNotEmpty()
  panNumber!: string;

  @ApiProperty({ description: 'GST number', required: false })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiProperty({ description: 'Array of service types', example: ['spraying', 'mapping'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  serviceTypes!: string[];

  @ApiProperty({ description: 'Array of uploaded documents', type: [PilotDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PilotDocumentDto)
  @IsNotEmpty()
  documents!: PilotDocumentDto[];

  @ApiProperty({ description: 'Total flight hours experience', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  flightHours?: number;

  @ApiProperty({ description: 'Years of experience', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  experience?: number;

  @ApiProperty({ description: 'Additional notes or qualifications', required: false })
  @IsString()
  @IsOptional()
  additionalNotes?: string;
}
