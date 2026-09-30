import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyCustomerOtpDto {
  @IsPhoneNumber('IN')
  phone!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
