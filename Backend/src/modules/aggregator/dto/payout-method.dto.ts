import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PayoutMethodDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  @MaxLength(18)
  @Matches(/^[0-9]+$/, { message: 'Account number must contain only digits' })
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifscCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountHolderName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\w.-]+@[\w.-]+$/, { message: 'Invalid UPI ID format' })
  upiId?: string;
}
