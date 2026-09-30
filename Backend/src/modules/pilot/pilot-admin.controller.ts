import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Patch, 
  Post, 
  Query 
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PilotAdminService } from './pilot-admin.service';

/**
 * Admin Controller for managing pilots
 * Accessible by admin, subadmin, and super_admin roles
 */
@Controller('admin/pilots')
@Roles('admin', 'subadmin', 'super_admin')
export class PilotAdminController {
  constructor(private readonly pilotAdminService: PilotAdminService) {}

  /**
   * Get all pilots with optional filters
   * GET /admin/pilots?status=AVAILABLE&state=Maharashtra&page=1&limit=20
   */
  @Get()
  async getAllPilots(
    @Query('status') status?: string,
    @Query('state') state?: string,
    @Query('district') district?: string,
    @Query('vendorUid') vendorUid?: string,
    @Query('minRating') minRating?: number,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pilotAdminService.getAllPilots({
      status,
      state,
      district,
      vendorUid,
      minRating,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // ==================== PILOT REQUESTS MANAGEMENT ====================
  // Note: These routes MUST come before :pilotId route to avoid conflicts

  /**
   * Get all pilot requests
   * GET /admin/pilots/requests?status=PENDING
   */
  @Get('requests')
  async getAllPilotRequests(@Query('status') status?: string) {
    return this.pilotAdminService.getAllPilotRequests(status);
  }

  /**
   * Get pilot request by ID
   * GET /admin/pilots/requests/:requestId
   */
  @Get('requests/:requestId')
  async getPilotRequestById(@Param('requestId') requestId: string) {
    return this.pilotAdminService.getPilotRequestById(requestId);
  }

  /**
   * Approve pilot request
   * POST /admin/pilots/requests/:requestId/approve
   */
  @Post('requests/:requestId/approve')
  async approvePilotRequest(
    @Param('requestId') requestId: string,
    @Body('assignedFleetManagerId') assignedFleetManagerId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotAdminService.approvePilotRequest(
      requestId,
      assignedFleetManagerId,
      user,
    );
  }

  /**
   * Reject pilot request
   * POST /admin/pilots/requests/:requestId/reject
   */
  @Post('requests/:requestId/reject')
  async rejectPilotRequest(
    @Param('requestId') requestId: string,
    @Body('rejectionReason') rejectionReason: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotAdminService.rejectPilotRequest(
      requestId,
      rejectionReason,
      user,
    );
  }

  // ==================== DASHBOARD QUERIES ====================
  // Note: These routes MUST come before :pilotId route to avoid conflicts

  /**
   * Get active pilots today
   * GET /admin/pilots/dashboard/active-today
   */
  @Get('dashboard/active-today')
  async getActivePilotsToday() {
    return this.pilotAdminService.getActivePilotsToday();
  }

  /**
   * Get pilots with expiring licenses
   * GET /admin/pilots/dashboard/expiring-licenses?days=30
   */
  @Get('dashboard/expiring-licenses')
  async getExpiringLicenses(@Query('days') days: number = 30) {
    return this.pilotAdminService.getExpiringLicenses(days);
  }

  /**
   * Get top performing pilots
   * GET /admin/pilots/dashboard/top-performers?period=month&limit=10
   */
  @Get('dashboard/top-performers')
  async getTopPerformers(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @Query('limit') limit: number = 10,
  ) {
    return this.pilotAdminService.getTopPerformers(period, limit);
  }

  // ==================== PILOT DETAILS ====================

  /**
   * Get pilot by ID with all details
   * GET /admin/pilots/:pilotId
   * NOTE: This route MUST come after specific routes like /requests, /dashboard
   */
  @Get(':pilotId')
  async getPilotById(@Param('pilotId') pilotId: string) {
    return this.pilotAdminService.getPilotById(pilotId);
  }


  /**
   * Get pilot statistics
   * GET /admin/pilots/:pilotId/stats
   */
  @Get(':pilotId/stats')
  async getPilotStats(@Param('pilotId') pilotId: string) {
    return this.pilotAdminService.getPilotStats(pilotId);
  }

  /**
   * Get pilot bookings
   * GET /admin/pilots/:pilotId/bookings?status=COMPLETED&limit=50
   */
  @Get(':pilotId/bookings')
  async getPilotBookings(
    @Param('pilotId') pilotId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.pilotAdminService.getPilotBookings(pilotId, { status, limit });
  }

  /**
   * Get pilot support tickets
   * GET /admin/pilots/:pilotId/support-tickets
   */
  @Get(':pilotId/support-tickets')
  async getPilotSupportTickets(@Param('pilotId') pilotId: string) {
    return this.pilotAdminService.getPilotSupportTickets(pilotId);
  }

  /**
   * Get pilot maintenance tickets
   * GET /admin/pilots/:pilotId/maintenance-tickets
   */
  @Get(':pilotId/maintenance-tickets')
  async getPilotMaintenanceTickets(@Param('pilotId') pilotId: string) {
    return this.pilotAdminService.getPilotMaintenanceTickets(pilotId);
  }

  /**
   * Get pilot's fleet manager
   * GET /admin/pilots/:pilotId/fleet-manager
   */
  @Get(':pilotId/fleet-manager')
  async getPilotFleetManager(@Param('pilotId') pilotId: string) {
    return this.pilotAdminService.getPilotFleetManager(pilotId);
  }

  /**
   * Get pilot earnings
   * GET /admin/pilots/:pilotId/earnings?startDate=2026-01-01&endDate=2026-06-30
   */
  @Get(':pilotId/earnings')
  async getPilotEarnings(
    @Param('pilotId') pilotId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.pilotAdminService.getPilotEarnings(pilotId, startDate, endDate);
  }

  /**
   * Update pilot information
   * PATCH /admin/pilots/:pilotId
   */
  @Patch(':pilotId')
  async updatePilot(
    @Param('pilotId') pilotId: string,
    @Body() updateData: any,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotAdminService.updatePilot(pilotId, updateData, user);
  }

  /**
   * Update pilot status
   * PATCH /admin/pilots/:pilotId/status
   */
  @Patch(':pilotId/status')
  async updatePilotStatus(
    @Param('pilotId') pilotId: string,
    @Body('status') status: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotAdminService.updatePilotStatus(pilotId, status, user);
  }

  /**
   * Remove/suspend pilot
   * DELETE /admin/pilots/:pilotId
   */
  @Delete(':pilotId')
  async removePilot(
    @Param('pilotId') pilotId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotAdminService.removePilot(pilotId, user);
  }
}
