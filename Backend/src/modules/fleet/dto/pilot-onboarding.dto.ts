import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class PilotLicenseDto {
  @IsNotEmpty()
  @IsString()
  licenseNumber!: string;

  @IsNotEmpty()
  @IsString()
  licenseType!: string;

  @IsNotEmpty()
  @IsDateString()
  issueDate!: string;

  @IsNotEmpty()
  @IsDateString()
  expiryDate!: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;
}

class PilotExperienceDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalFlightHours!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalMissions!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousEmployers?: string[];
}

class PilotBankDetailsDto {
  @IsNotEmpty()
  @IsString()
  accountNumber!: string;

  @IsNotEmpty()
  @IsString()
  ifscCode!: string;

  @IsNotEmpty()
  @IsString()
  accountHolderName!: string;

  @IsNotEmpty()
  @IsString()
  bankName!: string;
}

export class AddPilotToFleetDto {
  // Step 1: Personal Details
  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @IsNotEmpty()
  @IsString()
  mobile!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  // Step 2: License & Certifications
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PilotLicenseDto)
  license!: PilotLicenseDto;

  @IsOptional()
  @IsArray()
  certifications?: string[];

  @IsOptional()
  @IsNumber()
  @Min(18)
  age?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTypes?: string[];

  @IsOptional()
  availability?: {
    startTime: string;
    endTime: string;
    mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean;
  };

  @IsOptional()
  isOnline?: boolean;

  // Step 3: Experience
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PilotExperienceDto)
  experience!: PilotExperienceDto;

  // Bank Details (for payouts)
  @IsOptional()
  @ValidateNested()
  @Type(() => PilotBankDetailsDto)
  bankDetails?: PilotBankDetailsDto;

  // Documents
  @IsOptional()
  @IsArray()
  documents?: Array<{
    type: string;
    url: string;
  }>;
}

export class UpdatePilotInFleetDto {
  @IsOptional()
  @IsIn(['AVAILABLE', 'ON_MISSION', 'ON_BREAK', 'OFFLINE'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTypes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PilotLicenseDto)
  license?: PilotLicenseDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PilotBankDetailsDto)
  bankDetails?: PilotBankDetailsDto;
}
