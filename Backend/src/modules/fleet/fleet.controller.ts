import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { AssignDroneDto } from './dto/assign-drone.dto';
import { CreateDroneDto } from './dto/create-drone.dto';
import { DroneFilterDto } from './dto/drone-filter.dto';
import { MaintenanceLogDto } from './dto/maintenance-log.dto';
import { UpdateDroneStatusDto } from './dto/update-drone-status.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { MissionAssignmentDto, AssignPilotToMissionDto, AssignDroneToMissionDto } from './dto/mission-assignment.dto';
import { AddPilotToFleetDto, UpdatePilotInFleetDto } from './dto/pilot-onboarding.dto';
import { TriggerMaintenanceDto } from './dto/drone-health.dto';
import { CreateMaintenanceTicketDto, UpdateMaintenanceStageDto, SubmitAdditionalChargesDto, ApproveAdditionalChargesDto, AssignTechnicianDto } from './dto/maintenance-ticket.dto';
import { FleetAnalyticsQueryDto, DroneUtilizationQueryDto, PilotPerformanceQueryDto } from './dto/fleet-analytics.dto';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post('drones')
  @Roles('vendor')
  createDrone(@Body() dto: CreateDroneDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.createDrone(dto, user);
  }

  @Get('drones')
  @Roles('vendor', 'admin', 'super_admin')
  listDrones(@Query() filter: DroneFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.listDrones(filter, user);
  }

  @Get('drones/available')
  @Roles('vendor', 'super_admin')
  availableDrones(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.listAvailableDrones(user);
  }

  @Get('drones/:id')
  @Roles('vendor', 'admin', 'super_admin')
  getDrone(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getDrone(id, user);
  }

  @Patch('drones/:id')
  @Roles('vendor')
  updateDrone(
    @Param('id') id: string,
    @Body() dto: UpdateDroneDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fleetService.updateDrone(id, dto, user);
  }

  @Patch('drones/:id/status')
  @Roles('vendor', 'admin')
  updateDroneStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDroneStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fleetService.updateDroneStatus(id, dto, user);
  }

  @Delete('drones/:id')
  @Roles('vendor', 'admin')
  deleteDrone(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.decommissionDrone(id, user);
  }

  @Post('drones/:id/assign')
  @Roles('vendor')
  assignDrone(
    @Param('id') id: string,
    @Body() dto: AssignDroneDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fleetService.assignDrone(id, dto, user);
  }

  @Get('drones/:id/maintenance')
  @Roles('vendor', 'technician')
  listMaintenance(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.listMaintenance(id, user);
  }

  @Post('drones/:id/maintenance')
  @Roles('vendor', 'technician')
  logMaintenance(
    @Param('id') id: string,
    @Body() dto: MaintenanceLogDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.fleetService.logMaintenance(id, dto, user);
  }

  @Get('maintenance/schedule')
  @Roles('vendor', 'admin')
  maintenanceSchedule(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getMaintenanceSchedule(user);
  }

  @Get('maintenance/overdue')
  @Roles('vendor', 'admin')
  overdueDrones(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getOverdueDrones(user);
  }

  @Get('dashboard')
  @Roles('vendor', 'admin')
  dashboard(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getDashboard(user);
  }

  @Get('incoming-requests')
  @Roles('vendor', 'admin')
  incomingRequests() {
    return this.fleetService.getIncomingRequests();
  }

  @Get('managers')
  @Roles('admin')
  managers() {
    return this.fleetService.listManagers();
  }

  @Get('managers/:id')
  @Roles('admin')
  managerProfile(@Param('id') id: string) {
    return this.fleetService.getManagerProfile(id);
  }

  // ==================== MISSION MANAGEMENT (8-STAGE) ====================
  
  @Get('missions')
  @Roles('vendor', 'admin')
  listMissions(
    @Query() filter: { page?: number; limit?: number; status?: string; tab?: string },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.listMissions(filter, user);
  }

  @Get('missions/incoming')
  @Roles('vendor')
  incomingMissions(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getIncomingMissions(user);
  }

  @Get('missions/:id')
  @Roles('vendor', 'admin')
  getMissionDetail(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getMissionDetail(id, user);
  }

  @Post('missions/:id/assign')
  @Roles('vendor')
  assignMission(
    @Param('id') id: string,
    @Body() dto: MissionAssignmentDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.assignMission(id, dto, user);
  }

  @Post('missions/:id/assign-pilot')
  @Roles('vendor')
  assignPilotToMission(
    @Param('id') id: string,
    @Body() dto: AssignPilotToMissionDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.assignPilotToMission(id, dto, user);
  }

  @Post('missions/:id/assign-drone')
  @Roles('vendor')
  assignDroneToMission(
    @Param('id') id: string,
    @Body() dto: AssignDroneToMissionDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.assignDroneToMission(id, dto, user);
  }

  @Post('missions/:id/auto-assign')
  @Roles('vendor')
  autoAssignMission(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.autoAssignMission(id, user);
  }

  @Get('missions/rejected')
  @Roles('vendor', 'admin')
  rejectedMissions(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getRejectedMissions(user);
  }

  // ==================== PILOT MANAGEMENT ====================
  
  @Post('pilots/initiate')
  @Roles('vendor')
  initiatePilotCreation(@Body() dto: AddPilotToFleetDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.initiatePilotCreation(dto, user);
  }

  @Post('pilots/verify')
  @Roles('vendor')
  completePilotCreation(@Body() dto: { phone: string; otp: string }, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.completePilotCreation(dto, user);
  }

  @Post('pilots')
  @Roles('vendor')
  addPilotToFleet(@Body() dto: AddPilotToFleetDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.addPilotToFleet(dto, user);
  }

  @Get('pilots')
  @Roles('vendor', 'admin')
  listFleetPilots(
    @Query() filter: { page?: number; limit?: number; status?: string },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.listFleetPilots(filter, user);
  }

  @Get('pilots/:id')
  @Roles('vendor', 'admin')
  getPilotDetail(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getPilotDetail(id, user);
  }

  @Patch('pilots/:id')
  @Roles('vendor')
  updatePilotInFleet(
    @Param('id') id: string,
    @Body() dto: UpdatePilotInFleetDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.updatePilotInFleet(id, dto, user);
  }

  @Patch('pilots/:id/status')
  @Roles('vendor', 'admin')
  updatePilotStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.updatePilotStatus(id, dto.status, user);
  }

  @Delete('pilots/:id')
  @Roles('vendor')
  removePilotFromFleet(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.removePilotFromFleet(id, user);
  }

  // ==================== ENHANCED DRONE HEALTH MONITORING ====================

  @Get('drones/:id/health')
  @Roles('vendor', 'admin')
  getDroneHealth(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getDroneHealth(id, user);
  }

  @Get('drones/health/alerts')
  @Roles('vendor', 'admin')
  getHealthAlerts(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getHealthAlerts(user);
  }

  @Post('drones/:id/trigger-maintenance')
  @Roles('vendor')
  triggerMaintenance(
    @Param('id') id: string,
    @Body() dto: TriggerMaintenanceDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.triggerMaintenance(id, dto, user);
  }

  @Get('drones/:id/flight-history')
  @Roles('vendor', 'admin')
  getDroneFlightHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getDroneFlightHistory(id, user);
  }

  // ==================== ENHANCED MAINTENANCE TICKETS ====================

  @Post('maintenance-tickets')
  @Roles('vendor')
  createMaintenanceTicket(
    @Body() dto: CreateMaintenanceTicketDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.createMaintenanceTicket(dto, user);
  }

  @Get('maintenance-tickets')
  @Roles('vendor', 'admin', 'technician')
  listMaintenanceTickets(
    @Query() filter: { page?: number; limit?: number; status?: string; priority?: string },
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.listMaintenanceTickets(filter, user);
  }

  @Get('maintenance-tickets/:id')
  @Roles('vendor', 'admin', 'technician')
  getMaintenanceTicketDetail(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getMaintenanceTicketDetail(id, user);
  }

  @Patch('maintenance-tickets/:id/stage')
  @Roles('vendor', 'technician')
  updateMaintenanceStage(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceStageDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.updateMaintenanceStage(id, dto, user);
  }

  @Post('maintenance-tickets/:id/additional-charges')
  @Roles('technician')
  submitAdditionalCharges(
    @Param('id') id: string,
    @Body() dto: SubmitAdditionalChargesDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.submitAdditionalCharges(id, dto, user);
  }

  @Patch('maintenance-tickets/:id/additional-charges/:chargeId')
  @Roles('vendor')
  approveAdditionalCharge(
    @Param('id') ticketId: string,
    @Param('chargeId') chargeId: string,
    @Body() dto: ApproveAdditionalChargesDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.approveAdditionalCharge(ticketId, chargeId, dto, user);
  }

  @Patch('maintenance-tickets/:id/assign-technician')
  @Roles('vendor')
  assignTechnicianToTicket(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser() user: CurrentUserType
  ) {
    return this.fleetService.assignTechnicianToTicket(id, dto, user);
  }

  // ==================== RESOURCE MANAGEMENT ====================

  @Get('resources')
  @Roles('vendor', 'admin')
  getAllResources(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getAllResources(user);
  }

  @Post('resources')
  @Roles('vendor')
  addResource(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.addResource(dto, user);
  }

  // ==================== ANALYTICS & REPORTING ====================

  @Get('analytics')
  @Roles('vendor', 'admin')
  getFleetAnalytics(@Query() query: FleetAnalyticsQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getFleetAnalytics(query, user);
  }

  @Get('analytics/drone-utilization')
  @Roles('vendor', 'admin')
  getDroneUtilization(@Query() query: DroneUtilizationQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getDroneUtilization(query, user);
  }

  @Get('analytics/pilot-performance')
  @Roles('vendor', 'admin')
  getPilotPerformance(@Query() query: PilotPerformanceQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.getPilotPerformance(query, user);
  }

  // ==================== COMMISSION ====================

  @Get('commission')
  @Roles('vendor')
  getCommission(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getCommission(user);
  }

  @Get('commission/pending')
  @Roles('vendor')
  getPendingCommission(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getPendingCommission(user);
  }

  @Get('commission/history')
  @Roles('vendor')
  getCommissionHistory(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getCommissionHistory(user);
  }

  // ==================== REFUNDS ====================

  @Get('refunds')
  @Roles('vendor')
  getRefunds(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getRefunds(user);
  }

  // ==================== PROFILE & SETTINGS ====================

  @Get('profile')
  @Roles('vendor')
  getFleetProfile(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getFleetProfile(user);
  }

  @Patch('availability')
  @Roles('vendor')
  updateAvailability(@Body() dto: { isOnline: boolean }, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.updateAvailability(dto, user);
  }

  @Patch('profile')
  @Roles('vendor')
  updateFleetProfile(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.updateFleetProfile(dto, user);
  }

  // ==================== COMPLAINTS ====================

  @Get('complaints')
  @Roles('vendor')
  getComplaints(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.getComplaints(user);
  }

  @Post('complaints')
  @Roles('vendor')
  createComplaint(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.createComplaint(dto, user);
  }

  // ==================== NOTIFICATION SETTINGS ====================

  @Patch('notification-settings')
  @Roles('vendor')
  updateNotificationSettings(@Body() dto: any, @CurrentUser() user: CurrentUserType) {
    return this.fleetService.updateNotificationSettings(dto, user);
  }

  // ==================== ACCOUNT ====================

  @Delete('account')
  @Roles('vendor')
  deleteAccount(@CurrentUser() user: CurrentUserType) {
    return this.fleetService.deleteAccount(user);
  }
}
