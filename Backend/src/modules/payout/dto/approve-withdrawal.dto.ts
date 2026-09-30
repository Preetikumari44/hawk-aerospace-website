import { IsString, IsOptional } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectWithdrawalDto {
  @IsString()
  reason!: string;
}
