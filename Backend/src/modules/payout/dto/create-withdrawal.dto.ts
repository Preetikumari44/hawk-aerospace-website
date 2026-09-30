import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
  @IsString()
  payoutMethodId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal amount is ₹100' })
  amount!: number;
}
