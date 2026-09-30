import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { GPSTrackingService, type GPSCoordinate } from '../services/gps-tracking.service';

/**
 * GPS Tracking REST API
 * 
 * Endpoints for retrieving GPS trails and statistics
 */
@Controller('gps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GPSTrackingController {
  constructor(private readonly gpsTrackingService: GPSTrackingService) {}

  /**
   * GET /gps/trail/:bookingId
   * 
   * Get complete GPS trail for a booking
   * 
   * Query params:
   * - limit: number (optional)
   * - startTime: ISO string (optional)
   * - endTime: ISO string (optional)
   */
  @Get('trail/:bookingId')
  @Roles('customer', 'pilot', 'vendor', 'admin', 'subadmin', 'aggregator')
  async getGPSTrail(
    @Param('bookingId') bookingId: string,
    @Query('limit') limit?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<{
    bookingId: string;
    totalPoints: number;
    trail: GPSCoordinate[];
  }> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      startTime,
      endTime,
    };

    const trail = await this.gpsTrackingService.getGPSTrail(bookingId, options);

    return {
      bookingId,
      totalPoints: trail.length,
      trail,
    };
  }

  /**
   * GET /gps/stats/:bookingId
   * 
   * Get GPS trail statistics (total points, distance, avg speed, etc.)
   */
  @Get('stats/:bookingId')
  @Roles('customer', 'pilot', 'vendor', 'admin', 'subadmin', 'aggregator')
  async getGPSStats(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const stats = await this.gpsTrackingService.getGPSTrailStats(bookingId);

    return {
      bookingId,
      ...stats,
    };
  }

  /**
   * POST /gps/flush/:bookingId (Admin only)
   * 
   * Force flush GPS buffer for a specific booking
   */
  @Get('flush/:bookingId')
  @Roles('admin', 'subadmin')
  async forceFlush(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    await this.gpsTrackingService.forceFlush(bookingId);

    return {
      success: true,
      message: `GPS buffer flushed for booking ${bookingId}`,
    };
  }
}
