import { IsOptional, IsString, IsIn } from 'class-validator';

export class RefundFilterDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  customerUid?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
