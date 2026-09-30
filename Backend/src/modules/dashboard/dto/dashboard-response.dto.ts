import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class DashboardMetricsDto {
  @Expose()
  @ApiProperty({ description: 'Total number of active bookings' })
  totalActiveBookings: number;

  @Expose()
  @ApiProperty({ description: 'Total number of completed bookings' })
  totalCompletedBookings: number;

  @Expose()
  @ApiProperty({ description: 'Total number of upcoming bookings' })
  totalUpcomingBookings: number;

  @Expose()
  @ApiProperty({ description: 'Total revenue in INR' })
  totalRevenue: number;

  @Expose()
  @ApiProperty({ description: 'Total number of cancelled bookings' })
  totalCancelledBookings: number;

  @Expose()
  @ApiProperty({ description: 'Revenue growth percentage' })
  revenueGrowth: number;

  @Expose()
  @ApiProperty({ description: 'Bookings growth percentage' })
  bookingsGrowth: number;
}

@Exclude()
export class UserCategoryMetricsDto {
  @Expose()
  @ApiProperty({ description: 'Number of customers' })
  customers: number;

  @Expose()
  @ApiProperty({ description: 'Number of pilots' })
  pilots: number;

  @Expose()
  @ApiProperty({ description: 'Number of fleet managers' })
  fleetManagers: number;

  @Expose()
  @ApiProperty({ description: 'Number of technicians' })
  technicians: number;

  @Expose()
  @ApiProperty({ description: 'Number of sales aggregators' })
  salesAggregators: number;

  @Expose()
  @ApiProperty({ description: 'Number of marketplace vendors' })
  marketplaceVendors: number;
}

@Exclude()
export class ServiceDistributionDto {
  @Expose()
  @ApiProperty({ description: 'Service type name' })
  service: string;

  @Expose()
  @ApiProperty({ description: 'Number of bookings for this service' })
  count: number;

  @Expose()
  @ApiProperty({ description: 'Percentage of total bookings' })
  percentage: number;
}

@Exclude()
export class CoordinatesDto {
  @Expose()
  @ApiProperty({ description: 'Latitude coordinate' })
  latitude: number;

  @Expose()
  @ApiProperty({ description: 'Longitude coordinate' })
  longitude: number;
}

@Exclude()
export class StateDistributionDto {
  @Expose()
  @ApiProperty({ description: 'State name' })
  state: string;

  @Expose()
  @ApiProperty({ description: 'Number of bookings in this state' })
  count: number;

  @Expose()
  @Type(() => CoordinatesDto)
  @ApiProperty({ description: 'Geographic coordinates for map visualization', required: false })
  coordinates?: CoordinatesDto;
}

@Exclude()
export class TaskMetricsDto {
  @Expose()
  @ApiProperty({ description: 'Number of pending fleet manager approvals' })
  pendingFleetManagerApprovals: number;

  @Expose()
  @ApiProperty({ description: 'Number of pending pilot approvals' })
  pendingPilotApprovals: number;

  @Expose()
  @ApiProperty({ description: 'Number of pending technician approvals' })
  pendingTechnicianApprovals: number;

  @Expose()
  @ApiProperty({ description: 'Number of open complaint tickets' })
  totalOpenComplaintTickets: number;
}

@Exclude()
export class MarketplaceMetricsDto {
  @Expose()
  @ApiProperty({ description: 'Number of active marketplace orders' })
  totalActiveOrders: number;

  @Expose()
  @ApiProperty({ description: 'Number of completed marketplace orders' })
  totalCompletedOrders: number;

  @Expose()
  @ApiProperty({ description: 'Total marketplace revenue in INR' })
  totalRevenue: number;

  @Expose()
  @ApiProperty({ description: 'Marketplace revenue growth percentage' })
  revenueGrowth: number;
}

@Exclude()
export class RevenueTimeSeriesDto {
  @Expose()
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  date: string;

  @Expose()
  @ApiProperty({ description: 'Revenue amount for this date' })
  revenue: number;
}

@Exclude()
export class TimeSeriesDataDto {
  @Expose()
  @ApiProperty({ description: 'Date or month in YYYY-MM format' })
  date: string;

  @Expose()
  @ApiProperty({ description: 'Number of customers' })
  customers: number;

  @Expose()
  @ApiProperty({ description: 'Number of pilots' })
  pilots: number;

  @Expose()
  @ApiProperty({ description: 'Number of fleet managers' })
  fleetManagers: number;

  @Expose()
  @ApiProperty({ description: 'Number of technicians' })
  technicians: number;

  @Expose()
  @ApiProperty({ description: 'Number of sales aggregators' })
  salesAggregators: number;

  @Expose()
  @ApiProperty({ description: 'Number of marketplace vendors' })
  marketplaceVendors: number;
}

@Exclude()
export class DashboardResponseDto {
  @Expose()
  @Type(() => DashboardMetricsDto)
  @ApiProperty({ description: 'Core dashboard metrics' })
  metrics: DashboardMetricsDto;

  @Expose()
  @Type(() => UserCategoryMetricsDto)
  @ApiProperty({ description: 'User category distribution' })
  userCategoryMetrics: UserCategoryMetricsDto;

  @Expose()
  @Type(() => ServiceDistributionDto)
  @ApiProperty({ description: 'Service type distribution', type: [ServiceDistributionDto] })
  serviceDistribution: ServiceDistributionDto[];

  @Expose()
  @Type(() => StateDistributionDto)
  @ApiProperty({ description: 'State-wise distribution', type: [StateDistributionDto] })
  stateDistribution: StateDistributionDto[];

  @Expose()
  @Type(() => TaskMetricsDto)
  @ApiProperty({ description: 'Pending tasks and approvals' })
  taskMetrics: TaskMetricsDto;

  @Expose()
  @Type(() => MarketplaceMetricsDto)
  @ApiProperty({ description: 'Marketplace metrics' })
  marketplaceMetrics: MarketplaceMetricsDto;

  @Expose()
  @Type(() => RevenueTimeSeriesDto)
  @ApiProperty({ description: 'Revenue time series data', type: [RevenueTimeSeriesDto] })
  revenueTimeSeries: RevenueTimeSeriesDto[];

  @Expose()
  @Type(() => TimeSeriesDataDto)
  @ApiProperty({ description: 'User category density over time', type: [TimeSeriesDataDto] })
  timeSeriesData: TimeSeriesDataDto[];

  @Expose()
  @ApiProperty({ description: 'Timestamp when dashboard data was generated' })
  generatedAt: string;
}

