import { IsString, IsOptional } from 'class-validator';

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectRefundDto {
  @IsString()
  reason!: string;
}
