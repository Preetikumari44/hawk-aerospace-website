import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const APPLICABLE_TARGET_ROLES = ['pilot', 'aggregator', 'fleet_manager', 'technician'] as const;

export class ApplicationDocumentDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  storagePath?: string;

  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fileSize?: number;

  @IsOptional()
  @IsString()
  fileId?: string;

  // Alias fields accepted for backwards/forwards compatibility with
  // older release APKs that may send these names instead.
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  uri?: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SubmitRoleApplicationDto {
  @IsIn(APPLICABLE_TARGET_ROLES)
  role!: (typeof APPLICABLE_TARGET_ROLES)[number];

  @IsOptional()
  @IsString()
  roleLabel?: string;

  @IsObject()
  @IsNotEmpty()
  formData!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationDocumentDto)
  documents?: ApplicationDocumentDto[];

  /** Refer & Earn code (e.g. HAWK-PILOT-XXXXXX). Attaches this application to a referral. */
  @IsOptional()
  @IsString()
  referralCode?: string;
}