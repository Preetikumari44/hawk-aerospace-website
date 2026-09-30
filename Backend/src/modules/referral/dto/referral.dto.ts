import { IsArray, IsIn, IsInt, IsOptional, IsPhoneNumber, IsString, Max, Min } from 'class-validator';

export class CreateReferralCodeDto {
  @IsString()
  targetRole!: string;
}

export class CreateReferralInvitesDto {
  @IsString()
  code!: string;

  @IsString()
  targetRole!: string;

  @IsArray()
  @IsPhoneNumber('IN', { each: true })
  phones!: string[];

  @IsOptional()
  @IsIn(['whatsapp', 'share', 'link'])
  channel?: 'whatsapp' | 'share' | 'link';
}

export class UpsertReferralRuleDto {
  @IsString()
  inviterRole!: string;

  @IsString()
  inviteeRole!: string;

  @IsIn(['role_approved', 'first_paid_booking'])
  trigger!: 'role_approved' | 'first_paid_booking';

  @IsInt()
  @Min(0)
  @Max(100000)
  walletAmount!: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  couponAmount!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxPerUserPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  codeExpiryDays?: number;

  @IsOptional()
  isActive?: boolean;
}

export class ReviewReferralDto {
  @IsIn(['voided'])
  status!: 'voided';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class WalletWithdrawDto {
  @IsInt()
  @Min(100)
  amount!: number;

  @IsString()
  payoutMethodId!: string;
}
