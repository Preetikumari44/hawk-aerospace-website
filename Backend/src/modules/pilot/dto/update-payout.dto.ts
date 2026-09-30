import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdatePayoutMethodDto {
  @IsIn(['bank', 'upi'])
  method!: 'bank' | 'upi';

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  upiId?: string;
}
