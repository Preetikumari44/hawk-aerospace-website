import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { MissionAcceptanceDto } from './dto/mission-acceptance.dto';
import { MissionStatusDto } from './dto/mission-status.dto';
import { PilotOnboardDto } from './dto/pilot-onboard.dto';
import { PilotPriceLockDto } from './dto/price-lock.dto';
import { PostMissionDto } from './dto/post-mission.dto';
import { RejectMissionDto } from './dto/reject-mission.dto';
import { PreFlightCheckDto } from './dto/pre-flight-check.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdatePilotProfileDto } from './dto/update-profile.dto';
import { UpdatePayoutMethodDto } from './dto/update-payout.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateMissionProgressDto } from './dto/update-mission-progress.dto';
import { MissionService } from './mission/mission.service';
import { PilotService } from './pilot.service';

@Controller('pilots')
@Roles('pilot')
export class PilotController {
  constructor(
    private readonly pilotService: PilotService,
    private readonly missionService: MissionService,
  ) {}

  @Post('onboard')
  onboard(@Body() dto: PilotOnboardDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.onboardPilot(dto, user);
  }

  @Get('missions')
  listMissions(@CurrentUser() user: CurrentUserType) {
    return this.missionService.listMissions(user);
  }

  @Get('missions/:id')
  getMission(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.missionService.getEnrichedMission(id, user);
  }

  @Patch('missions/:id/accept')
  acceptMission(
    @Param('id') id: string,
    @Body() dto: MissionAcceptanceDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.acceptMission(id, dto, user);
  }

  @Patch('missions/:id/status')
  updateMissionStatus(
    @Param('id') id: string,
    @Body() dto: MissionStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.updateMissionStatus(id, dto, user);
  }

  @Post('missions/:id/report')
  postMissionReport(
    @Param('id') id: string,
    @Body() dto: PostMissionDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.postMissionReport(id, dto, user);
  }

  @Post('missions/:id/lock-price')
  lockMissionPrice(
    @Param('id') id: string,
    @Body() dto: PilotPriceLockDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotService.lockPrice(id, dto, user);
  }

  @Get('rewards')
  getRewards(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getRewards(user);
  }

  // Profile Management
  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getProfile(user);
  }

  @Patch('profile')
  updateProfile(@Body() dto: UpdatePilotProfileDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.updateProfile(dto, user);
  }

  // Availability & Location
  @Patch('availability')
  updateAvailability(@Body() dto: UpdateAvailabilityDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.updateAvailability(dto, user);
  }

  @Post('location')
  updateLocation(@Body() dto: UpdateLocationDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.updateLocation(dto, user);
  }

  // Incoming Missions & Rejection
  @Get('incoming-requests')
  getIncomingRequests(@CurrentUser() user: CurrentUserType) {
    return this.missionService.getIncomingMissions(user);
  }

  @Post('missions/:id/reject')
  rejectMission(
    @Param('id') id: string,
    @Body() dto: RejectMissionDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.rejectMission(id, dto, user);
  }

  @Get('rejected-missions')
  getRejectedMissions(@CurrentUser() user: CurrentUserType) {
    return this.missionService.getRejectedMissions(user);
  }

  // Mission Stage Transitions
  @Post('missions/:id/start-navigation')
  startNavigation(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.missionService.startNavigation(id, user);
  }

  @Post('missions/:id/arrive')
  markArrived(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.missionService.markArrived(id, user);
  }

  @Post('missions/:id/pre-flight')
  submitPreFlightCheck(
    @Param('id') id: string,
    @Body() dto: PreFlightCheckDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.submitPreFlightCheck(id, dto, user);
  }

  @Post('missions/:id/start')
  startMission(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.missionService.startMission(id, user);
  }

  @Post('missions/:id/complete')
  completeMission(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.missionService.completeMission(id, user);
  }

  @Post('missions/:id/upload-media')
  uploadMissionMedia(
    @Param('id') id: string,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.uploadMissionMedia(id, dto, user);
  }

  @Post('missions/:id/cancel')
  cancelMission(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.missionService.cancelMission(id, body.reason, user);
  }

  @Post('missions/:id/progress')
  async updateMissionProgress(
    @Param('id') id: string,
    @Body() dto: UpdateMissionProgressDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.missionService.updateMissionProgress(
      id,
      dto.progressPercentage,
      dto.currentPhase,
      user,
    );
    return { message: 'Mission progress updated successfully' };
  }

  // Earnings & Payments
  @Get('earnings')
  getEarnings(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getEarningsDashboard(user);
  }

  @Get('earnings/pending')
  getPendingEarnings(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getPendingEarnings(user);
  }

  @Get('earnings/history')
  getEarningsHistory(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getEarningsHistory(user);
  }

  @Patch('payout-method')
  updatePayoutMethod(@Body() dto: UpdatePayoutMethodDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.updatePayoutMethod(dto, user);
  }

  // Maintenance Tickets
  @Get('maintenance-tickets')
  getMaintenanceTickets(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getMaintenanceTickets(user);
  }

  @Post('maintenance-tickets')
  createMaintenanceTicket(
    @Body() dto: CreateMaintenanceTicketDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotService.createMaintenanceTicket(dto, user);
  }

  @Get('maintenance-tickets/:ticketId')
  getMaintenanceTicket(@Param('ticketId') ticketId: string, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.getMaintenanceTicket(ticketId, user);
  }

  // Complaints
  @Get('complaints')
  getComplaints(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getComplaints(user);
  }

  @Post('complaints')
  createComplaint(@Body() dto: CreateComplaintDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.createComplaint(dto, user);
  }

  @Get('complaints/:complaintId')
  getComplaint(@Param('complaintId') complaintId: string, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.getComplaint(complaintId, user);
  }

  // Notification Settings
  @Patch('notification-settings')
  updateNotificationSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotService.updateNotificationSettings(dto, user);
  }

  @Get('notification-settings')
  getNotificationSettings(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getNotificationSettings(user);
  }

  // Account Deletion
  @Delete('account')
  requestDeletion(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.requestDeletion(user);
  }

  // Availability Schedule
  @Get('availability/schedule')
  getSchedule(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getSchedule(user);
  }

  @Patch('availability/schedule')
  updateSchedule(@Body() dto: UpdateScheduleDto, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.updateSchedule(dto, user);
  }

  // Onboarding Status
  @Get('onboarding/status')
  getOnboardingStatus(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getOnboardingStatus(user);
  }

  @Post('onboarding/resubmit')
  resubmitOnboardingDocuments(
    @Body() body: { documents: Array<{ type: string; url: string }> },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pilotService.resubmitOnboardingDocuments(body.documents, user);
  }

  // Settlements
  @Get('settlements/pending')
  getPendingSettlements(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getPendingSettlements(user.uid);
  }

  @Get('settlements/history')
  getSettlementHistory(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getSettlementHistory(user.uid);
  }

  // Role Application & Switching
  @Post('apply-role')
  applyForRole(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.applyForRole(dto, user);
  }

  @Get('roles')
  getAvailableRoles(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getAvailableRoles(user);
  }

  @Post('switch-role')
  switchRole(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.pilotService.switchRole(dto, user);
  }

  @Get('role-application/status')
  getRoleApplicationStatus(@CurrentUser() user: CurrentUserType) {
    return this.pilotService.getRoleApplicationStatus(user);
  }
}
