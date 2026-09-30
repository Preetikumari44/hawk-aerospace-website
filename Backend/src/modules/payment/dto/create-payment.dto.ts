import { IsIn, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  bookingId!: string;

  @IsIn(['cash', 'upi', 'wallet'])
  method!: 'cash' | 'upi' | 'wallet';
}
