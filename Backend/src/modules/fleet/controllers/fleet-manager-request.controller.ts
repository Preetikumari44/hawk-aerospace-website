import { Controller, Post, Get, Patch, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { FleetManagerRequestService } from '../services/fleet-manager-request.service';
import { FleetManagerMatchingService } from '../services/fleet-manager-matching.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import {
  FleetManagerRequestDto,
  AcceptFleetManagerRequestDto,
  RejectFleetManagerRequestDto,
} from '../dto/fleet-manager-request.dto';
import { AssignDroneDto } from '../dto/assign-drone.dto';

@ApiTags('Fleet Manager Requests')
@ApiBearerAuth()
@Controller('fleet-manager-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetManagerRequestController {
  private readonly logger = new Logger(FleetManagerRequestController.name);

  constructor(
    private readonly fleetManagerRequestService: FleetManagerRequestService,
    private readonly fleetManagerMatchingService: FleetManagerMatchingService,
  ) {}

  /**
   * Auto-assign booking to top fleet managers and send requests
   * Admin/System endpoint - called after booking creation
   */
  @Post('auto-assign')
  @Roles('admin', 'subadmin')
  @ApiOperation({
    summary: 'Auto-assign booking to fleet managers',
    description: 'Finds top 3 fleet managers and sends booking requests to them',
  })
  @ApiResponse({ status: 201, description: 'Requests sent successfully' })
  async autoAssignFleetManager(@Body() dto: FleetManagerRequestDto) {
    this.logger.log(`Auto-assigning booking ${dto.bookingId} to fleet managers`);
    return this.fleetManagerRequestService.autoAssignFleetManagerRequest(dto.bookingId);
  }

  /**
   * Fleet manager accepts a booking request
   */
  @Post('accept')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Accept booking request',
    description: 'Fleet manager accepts the booking request (first to accept wins)',
  })
  @ApiResponse({ status: 200, description: 'Request accepted successfully' })
  async acceptRequest(
    @Body() dto: AcceptFleetManagerRequestDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(`Fleet manager ${user.uid} accepting request ${dto.requestId}`);
    return this.fleetManagerRequestService.acceptRequest(dto.requestId, user.uid);
  }

  /**
   * Fleet manager rejects a booking request
   */
  @Post('reject')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Reject booking request',
    description: 'Fleet manager declines the booking request',
  })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  async rejectRequest(
    @Body() dto: RejectFleetManagerRequestDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} rejecting request ${dto.requestId}. Reason: ${dto.reason}`
    );
    return this.fleetManagerRequestService.rejectRequest(dto.requestId, user.uid, dto.reason);
  }

  /**
   * Get pending requests for logged-in fleet manager
   */
  @Get('pending')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Get pending requests',
    description: 'Get all pending booking requests for the fleet manager',
  })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved' })
  async getPendingRequests(@CurrentUser() user: CurrentUserType) {
    return this.fleetManagerRequestService.getPendingRequests(user.uid);
  }

  /**
   * Get request history for logged-in fleet manager
   */
  @Get('history')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Get request history',
    description: 'Get all past booking requests (accepted/rejected/timeout)',
  })
  @ApiResponse({ status: 200, description: 'Request history retrieved' })
  async getRequestHistory(@CurrentUser() user: CurrentUserType) {
    return this.fleetManagerRequestService.getRequestHistory(user.uid);
  }

  /**
   * Get optimal fleet manager match for a booking
   * Admin/Debug endpoint
   */
  @Get('match/:bookingId')
  @Roles('admin', 'subadmin')
  @ApiOperation({
    summary: 'Get optimal fleet manager match',
    description: 'Calculate the best fleet manager for a booking (debug/preview)',
  })
  @ApiResponse({ status: 200, description: 'Fleet manager match calculated' })
  async getOptimalMatch(@Param('bookingId') bookingId: string) {
    // This would need booking details - simplified for now
    throw new Error('Not implemented - needs booking details');
  }

  /**
   * Handle timeout for booking requests
   * Background job endpoint - should be called by scheduler
   */
  @Post('timeout/:bookingId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Handle request timeout',
    description: 'Called by background job when fleet manager requests timeout',
  })
  @ApiResponse({ status: 200, description: 'Timeout handled' })
  async handleTimeout(@Param('bookingId') bookingId: string) {
    this.logger.log(`Handling timeout for booking ${bookingId}`);
    return this.fleetManagerRequestService.handleTimeout(bookingId);
  }

  /**
   * ⭐ Assign pilot to booking (Manual selection by fleet manager)
   * ENFORCES HIERARCHY: Only pilots from FM's roster can be assigned
   */
  @Post('bookings/:bookingId/assign-pilot')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Assign pilot to booking',
    description: 'Fleet manager manually selects and assigns a pilot from their roster to the booking',
  })
  @ApiResponse({ status: 200, description: 'Pilot assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or pilot not owned by fleet manager' })
  @ApiResponse({ status: 404, description: 'Booking or pilot not found' })
  async assignPilot(
    @Param('bookingId') bookingId: string,
    @Body() dto: { pilotId: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} assigning pilot ${dto.pilotId} to booking ${bookingId}`
    );
    return this.fleetManagerRequestService.assignPilotToBooking(bookingId, dto.pilotId, user.uid);
  }

  /**
   * Get pilot recommendations for a booking
   * Returns only pilots from the fleet manager's roster matching the service type
   */
  @Get('bookings/:bookingId/pilot-recommendations')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Get pilot recommendations',
    description: 'Get list of suitable pilots from fleet manager roster for the booking',
  })
  @ApiResponse({ status: 200, description: 'Pilot recommendations retrieved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getPilotRecommendations(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} requesting pilot recommendations for booking ${bookingId}`
    );
    return this.fleetManagerRequestService.getPilotRecommendations(bookingId, user.uid);
  }

  /**
   * ⭐ Assign drone to booking (Manual selection by fleet manager)
   * ENFORCES HIERARCHY: Only drones from FM's inventory can be assigned
   */
  @Post('bookings/:bookingId/assign-drone')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Assign drone to booking',
    description: 'Fleet manager manually selects and assigns a drone from their inventory to the booking',
  })
  @ApiResponse({ status: 200, description: 'Drone assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or drone not owned by fleet manager' })
  @ApiResponse({ status: 404, description: 'Booking or drone not found' })
  async assignDrone(
    @Param('bookingId') bookingId: string,
    @Body() dto: AssignDroneDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} assigning drone ${dto.droneId} to booking ${bookingId}`
    );
    return this.fleetManagerRequestService.assignDroneToBooking(bookingId, dto.droneId, user.uid);
  }

  /**
   * ⭐ Verify drone return (FM enters the pilot's 4-char return code).
   * Only on a correct code is the service marked as completed.
   */
  @Post('bookings/:bookingId/verify-return')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Verify drone return',
    description: 'Fleet manager enters the return code shown on the pilot screen to confirm drone hand-back and complete the service',
  })
  @ApiResponse({ status: 200, description: 'Drone return verified, service completed' })
  @ApiResponse({ status: 400, description: 'Incorrect code or return not pending' })
  async verifyDroneReturn(
    @Param('bookingId') bookingId: string,
    @Body() dto: { code: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} verifying drone return for booking ${bookingId}`
    );
    return this.fleetManagerRequestService.verifyDroneReturn(bookingId, dto?.code, user.uid);
  }

  /**
   * Get drone recommendations for a booking
   * Returns only drones from the fleet manager's inventory
   */
  @Get('bookings/:bookingId/drone-recommendations')
  @Roles('fleet_manager')
  @ApiOperation({
    summary: 'Get drone recommendations',
    description: 'Get list of suitable drones from fleet manager inventory for the booking',
  })
  @ApiResponse({ status: 200, description: 'Drone recommendations retrieved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getDroneRecommendations(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    this.logger.log(
      `Fleet manager ${user.uid} requesting drone recommendations for booking ${bookingId}`
    );
    return this.fleetManagerRequestService.getDroneRecommendations(bookingId, user.uid);
  }
}
