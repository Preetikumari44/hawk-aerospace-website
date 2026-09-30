import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';

@ApiTags('Dashboard')
@Controller('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get comprehensive dashboard data with all metrics and charts',
    description: 'Requires admin role. Returns aggregated metrics, charts, and analytics.'
  })
  @ApiOkResponse({ 
    description: 'Dashboard data retrieved successfully',
    type: DashboardResponseDto,
  })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  async getDashboard(
    @Query() filter: DashboardFilterDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.dashboardService.getDashboardData(filter, user);
    
    // Transform to DTO to ensure only exposed fields are returned
    const sanitizedData = plainToInstance(DashboardResponseDto, data, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    
    return {
      success: true,
      data: sanitizedData,
    };
  }
}
