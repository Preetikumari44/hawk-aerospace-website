import { IsString, IsOptional, IsBoolean, IsIn, ValidateIf } from 'class-validator';

export class AddPayoutMethodDto {
  @IsIn(['bank', 'upi'])
  type!: 'bank' | 'upi';

  @ValidateIf((o) => o.type === 'bank')
  @IsString()
  accountNumber?: string;

  @ValidateIf((o) => o.type === 'bank')
  @IsString()
  ifscCode?: string;

  @ValidateIf((o) => o.type === 'bank')
  @IsString()
  accountHolderName?: string;

  @ValidateIf((o) => o.type === 'upi')
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
