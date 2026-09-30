import { IsString } from 'class-validator';

export class InvoiceDto {
  @IsString()
  paymentId!: string;
}
