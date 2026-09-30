import { Controller, Get, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { RevenueFilterDto } from './dto/revenue-filter.dto';
import { RevenueService } from './revenue.service';

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('dashboard')
  @Roles('admin', 'subadmin', 'super_admin')
  dashboard(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getDashboard(filter, user);
  }

  @Get('today')
  @Roles('admin', 'super_admin')
  today() {
    return this.revenueService.getTodaySnapshot();
  }

  @Get('summary')
  @Roles('admin', 'super_admin')
  summary(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getSummary(filter, user);
  }

  @Get('charts/bookings-by-state')
  @Roles('admin', 'super_admin')
  bookingsByState(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getBookingsByState(filter, user);
  }

  @Get('charts/bookings-by-service')
  @Roles('admin', 'super_admin')
  bookingsByService(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getBookingsByService(filter, user);
  }

  @Get('charts/bookings-by-crop')
  @Roles('admin', 'super_admin')
  bookingsByCrop(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getBookingsByCrop(filter, user);
  }

  @Get('charts/trend')
  @Roles('admin', 'super_admin')
  trend(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getTrend(filter, user);
  }

  @Get('charts/vendor-performance')
  @Roles('admin', 'super_admin')
  vendorPerformance(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getVendorPerformance(filter, user);
  }

  @Get('export/csv')
  @Roles('admin', 'super_admin')
  exportCsv(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.exportCsv(filter, user);
  }

  @Get('export/pdf')
  @Roles('admin', 'super_admin')
  exportPdf(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.exportPdf(filter, user);
  }

  @Get('vendor')
  @Roles('vendor')
  vendor(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getVendorRevenue(filter, user);
  }

  @Get('vendor/commission')
  @Roles('vendor')
  vendorCommission(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getVendorCommission(filter, user);
  }

  @Get('aggregator/commission')
  @Roles('aggregator')
  aggregatorCommission(@Query() filter: RevenueFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.revenueService.getAggregatorCommission(filter, user);
  }

  @Get('debug/stats')
  @Roles('admin', 'super_admin')
  async debugStats(@CurrentUser() user: CurrentUserType) {
    return this.revenueService.getDebugStats(user);
  }

  @Get('debug/sample-records')
  @Roles('admin', 'super_admin')
  async debugSampleRecords(
    @Query() filter: RevenueFilterDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.revenueService.getDebugSampleRecords(filter, user);
  }
}
