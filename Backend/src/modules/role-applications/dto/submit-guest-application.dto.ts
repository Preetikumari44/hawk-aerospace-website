import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

import {
  ApplicationDocumentDto,
  SubmitRoleApplicationDto,
} from './submit-role-application.dto';

const APPLICABLE_TARGET_ROLES = ['pilot', 'aggregator', 'fleet_manager', 'technician'] as const;

/**
 * No-login role application, used exclusively by the Refer & Earn guest flow:
 * invite link → role form directly (with in-form Firebase OTP proving phone
 * ownership) → admin approval → normal OTP login. referralCode is REQUIRED —
 * guest applications only exist as referral conversions.
 */
export class SubmitGuestRoleApplicationDto {
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

  /** 6-letter invite code (e.g. X7K2QM). Required for guest submit. */
  @IsString()
  @IsNotEmpty()
  referralCode!: string;

  /** Firebase ID token from the in-form OTP step. Proves phone ownership. */
  @IsString()
  @IsNotEmpty()
  firebaseIdToken!: string;

  /** Applicant phone in any format (digits compared against the token). */
  @IsPhoneNumber('IN')
  phone!: string;
}

export function toSubmitDto(
  dto: SubmitGuestRoleApplicationDto,
): SubmitRoleApplicationDto {
  const out = new SubmitRoleApplicationDto();
  out.role = dto.role;
  out.roleLabel = dto.roleLabel;
  out.formData = dto.formData;
  out.documents = dto.documents;
  (out as { referralCode?: string }).referralCode = dto.referralCode;
  return out;
}
