import { Controller, Get, Param, Query, Delete, Patch, Body } from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { FleetManagerService } from './fleet-manager.service';
import { FleetManagerFilterDto } from './dto/fleet-manager-filter.dto';
import { FleetManagerStatsDto } from './dto/fleet-manager-stats.dto';

@Controller('fleet-managers')
export class FleetManagerController {
  constructor(private readonly fleetManagerService: FleetManagerService) {}
  
  /**
   * Get list of all fleet managers with pagination and filters
   * GET /fleet-managers?page=1&limit=20&status=ACTIVE&region=Punjab
   */
  @Get()
  @Roles('admin', 'super_admin')
  listFleetManagers(@Query() filter: FleetManagerFilterDto) {
    return this.fleetManagerService.listFleetManagers(filter);
  }

  /**
   * Get detailed profile of a specific fleet manager
   * GET /fleet-managers/:id
   */
  @Get(':id')
  @Roles('admin', 'super_admin', 'vendor', 'fleet_manager')
  getFleetManagerProfile(@Param('id') id: string) {
    return this.fleetManagerService.getFleetManagerProfile(id);
  }

  /**
   * Get statistics for a fleet manager
   * GET /fleet-managers/:id/stats?period=month
   */
  @Get(':id/stats')
  @Roles('admin', 'super_admin', 'vendor', 'fleet_manager')
  getFleetManagerStats(@Param('id') id: string, @Query() query: FleetManagerStatsDto) {
    return this.fleetManagerService.getFleetManagerStats(id, query);
  }

  /**
   * Get all pilots assigned to a fleet manager
   * GET /fleet-managers/:id/pilots?page=1&limit=20&status=AVAILABLE
   */
  @Get(':id/pilots')
  @Roles('admin', 'super_admin', 'vendor', 'fleet_manager')
  getAssignedPilots(
    @Param('id') id: string,
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    return this.fleetManagerService.getAssignedPilots(id, query);
  }

  /**
   * Get all drones assigned to a fleet manager
   * GET /fleet-managers/:id/drones?page=1&limit=20&status=AVAILABLE
   */
  @Get(':id/drones')
  @Roles('admin', 'super_admin', 'vendor', 'fleet_manager')
  getAssignedDrones(
    @Param('id') id: string,
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    return this.fleetManagerService.getAssignedDrones(id, query);
  }

  /**
   * Get all bookings for a fleet manager
   * GET /fleet-managers/:id/bookings?page=1&limit=20&status=COMPLETED
   */
  @Get(':id/bookings')
  @Roles('admin', 'super_admin', 'vendor', 'fleet_manager')
  getFleetManagerBookings(
    @Param('id') id: string,
    @Query()
    query: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.fleetManagerService.getFleetManagerBookings(id, query);
  }

  /**
   * Get all maintenance tickets for fleet manager's drones
   * GET /fleet-managers/:id/maintenance-tickets?page=1&limit=20&status=OPEN
   */
  @Get(':id/maintenance-tickets')
  @Roles('admin', 'super_admin')
  getMaintenanceTickets(
    @Param('id') id: string,
    @Query()
    query: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    },
  ) {
    return this.fleetManagerService.getMaintenanceTickets(id, query);
  }

  /**
   * Get all support tickets related to fleet manager's bookings
   * GET /fleet-managers/:id/support-tickets?page=1&limit=20&status=PENDING
   */
  @Get(':id/support-tickets')
  @Roles('admin', 'super_admin')
  getSupportTickets(
    @Param('id') id: string,
    @Query()
    query: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    },
  ) {
    return this.fleetManagerService.getSupportTickets(id, query);
  }

  /**
   * Get comprehensive dashboard data for fleet manager
   * GET /fleet-managers/:id/dashboard
   */
  @Get(':id/dashboard')
  @Roles('admin', 'super_admin')
  getFleetManagerDashboard(@Param('id') id: string) {
    return this.fleetManagerService.getFleetManagerDashboard(id);
  }

  /**
   * Delete/Remove a fleet manager
   * DELETE /fleet-managers/:id
   */
  @Delete(':id')
  @Roles('admin', 'super_admin')
  async removeFleetManager(@Param('id') id: string) {
    await this.fleetManagerService.removeFleetManager(id);
    return { success: true, message: 'Fleet manager removed successfully' };
  }

  /**
   * Approve a pending fleet manager request
   * PATCH /fleet-managers/:id/approve
   */
  @Patch(':id/approve')
  @Roles('admin', 'super_admin')
  async approveFleetManager(@Param('id') id: string) {
    await this.fleetManagerService.approveFleetManager(id);
    return { success: true, message: 'Fleet manager approved successfully' };
  }

  /**
   * Reject a pending fleet manager request
   * PATCH /fleet-managers/:id/reject
   */
  @Patch(':id/reject')
  @Roles('admin', 'super_admin')
  async rejectFleetManager(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    await this.fleetManagerService.rejectFleetManager(id, body.reason);
    return { success: true, message: 'Fleet manager rejected successfully' };
  }

  /**
   * Remove/Unassign a drone from a fleet manager
   * DELETE /fleet-managers/:fleetManagerId/drones/:droneId
   */
  @Delete(':fleetManagerId/drones/:droneId')
  @Roles('admin', 'super_admin')
  async removeDroneFromFleetManager(
    @Param('fleetManagerId') fleetManagerId: string,
    @Param('droneId') droneId: string
  ) {
    await this.fleetManagerService.removeDroneFromFleetManager(fleetManagerId, droneId);
    return { success: true, message: 'Drone removed from fleet manager successfully' };
  }
}
