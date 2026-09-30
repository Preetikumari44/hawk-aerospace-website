import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get Customer Lifetime Value analysis (Aggregator)
   */
  @Get('clv')
  @Roles('aggregator')
  getCustomerLifetimeValue(
    @CurrentUser() user: CurrentUserType,
    @Query('customerId') customerId?: string,
  ) {
    return this.analyticsService.calculateCustomerLifetimeValue(user.uid, customerId);
  }

  /**
   * Get Churn Analysis (Aggregator)
   */
  @Get('churn')
  @Roles('aggregator')
  getChurnAnalysis(@CurrentUser() user: CurrentUserType) {
    return this.analyticsService.analyzeChurn(user.uid);
  }

  /**
   * Get Predictive Analytics (Aggregator)
   */
  @Get('predictive')
  @Roles('aggregator')
  getPredictiveAnalytics(
    @CurrentUser() user: CurrentUserType,
    @Query('period') period?: 'next_month' | 'next_quarter' | 'next_year',
  ) {
    return this.analyticsService.generatePredictiveAnalytics(user.uid, period);
  }

  /**
   * Get CLV for specific aggregator (Admin)
   */
  @Get('clv/:aggregatorId')
  @Roles('admin', 'super_admin')
  getAggregatorCLV(
    @Param('aggregatorId') aggregatorId: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.analyticsService.calculateCustomerLifetimeValue(aggregatorId, customerId);
  }

  /**
   * Get Churn Analysis for specific aggregator (Admin)
   */
  @Get('churn/:aggregatorId')
  @Roles('admin', 'super_admin')
  getAggregatorChurn(@Param('aggregatorId') aggregatorId: string) {
    return this.analyticsService.analyzeChurn(aggregatorId);
  }

  /**
   * Get Predictive Analytics for specific aggregator (Admin)
   */
  @Get('predictive/:aggregatorId')
  @Roles('admin', 'super_admin')
  getAggregatorPredictive(
    @Param('aggregatorId') aggregatorId: string,
    @Query('period') period?: 'next_month' | 'next_quarter' | 'next_year',
  ) {
    return this.analyticsService.generatePredictiveAnalytics(aggregatorId, period);
  }
}
