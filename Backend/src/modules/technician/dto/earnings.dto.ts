import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum EarningsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class EarningsFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(EarningsPeriod)
  period?: EarningsPeriod;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class EarningsBreakdownDto {
  ticketId!: string;
  droneId!: string;
  completedAt!: string;
  baseCost!: number;
  additionalChargesCost!: number;
  technicianShare!: number;
  slaBonus!: number;
  finalEarning!: number;
  status!: 'pending' | 'settled';
}

export class EarningsSummaryDto {
  totalEarnings!: number;
  pendingEarnings!: number;
  settledEarnings!: number;
  completedTickets!: number;
  averagePerTicket!: number;
  slaBonusTotal!: number;
  breakdown!: EarningsBreakdownDto[];
  period!: string;
}

export class PayoutMethodDto {
  @IsString()
  method!: 'bank' | 'upi' | 'wallet';

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
