import { IsNumber, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CommissionChartDataDto {
  @IsString()
  date: string;

  @IsNumber()
  commission: number;

  @IsNumber()
  bookings: number;
}

export class CommissionDashboardDto {
  @IsNumber()
  totalCommission: number;

  @IsNumber()
  pendingCommission: number;

  @IsNumber()
  settledCommission: number;

  @IsString()
  currentTier: string;

  @IsNumber()
  commissionRate: number;

  @IsNumber()
  monthlyBookings: number;

  @IsOptional()
  @IsNumber()
  nextTierBookings?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionChartDataDto)
  chartData: CommissionChartDataDto[];

  @IsString()
  period: string;
}
