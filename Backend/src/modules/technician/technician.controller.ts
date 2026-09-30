import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import {
  type CreateComplaintDto,
  type ComplaintFilterDto,
} from './dto/complaint.dto';
import { type EarningsFilterDto, type PayoutMethodDto } from './dto/earnings.dto';
import { TechnicianFilterDto } from './dto/technician-filter.dto';
import { TechnicianOnboardDto } from './dto/technician-onboard.dto';
import { TechnicianProfileDto } from './dto/technician-profile.dto';
import { type TicketFilterDto } from './dto/technician-ticket.dto';
import {
  type AcceptTicketDto,
  type CompleteTicketDto,
  type RejectTicketDto,
  type UpdateTicketStageDto,
} from './dto/ticket-stage.dto';
import { type SubmitAdditionalChargesDto } from './dto/additional-charges.dto';
import { TechnicianService } from './technician.service';

/**
 * Technician Controller - Complete API implementation per implementation_plan.md §5.3
 * Self-service shape: /technicians/me/* for technician-owned operations
 * Admin shape: /technicians/:id/* for admin operations
 */
@Controller('technicians')
export class TechnicianController {
  constructor(private readonly technicianService: TechnicianService) {}

  // ==================== PROFILE & ONBOARDING ====================

  @Post('onboard')
  @Roles('technician')
  onboard(@Body() dto: TechnicianOnboardDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.onboard(dto, user);
  }

  @Get('me')
  @Roles('technician')
  getMyProfile(@CurrentUser() user: CurrentUserType) {
    return this.technicianService.get(user.uid);
  }

  @Patch('me')
  @Roles('technician')
  updateProfile(@Body() dto: TechnicianProfileDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.updateProfile(dto, user);
  }

  @Patch('me/notification-settings')
  @Roles('technician')
  updateNotificationSettings(@Body() settings: any, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.updateNotificationSettings(settings, user);
  }

  // ==================== P0: TICKET WORKFLOW ====================

  @Get('me/incoming-tickets')
  @Roles('technician')
  getIncomingTickets(@Query() filter: TicketFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getIncomingTickets(user, filter);
  }

  @Get('me/tickets')
  @Roles('technician')
  getMyTickets(@Query() filter: TicketFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getMyTickets(user, filter);
  }

  @Get('me/tickets/:id')
  @Roles('technician')
  getTicketById(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getTicketById(id, user);
  }

  @Patch('me/tickets/:id/accept')
  @Roles('technician')
  acceptTicket(
    @Param('id') id: string,
    @Body() dto: AcceptTicketDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.acceptTicket(id, dto, user);
  }

  @Patch('me/tickets/:id/reject')
  @Roles('technician')
  rejectTicket(
    @Param('id') id: string,
    @Body() dto: RejectTicketDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.rejectTicket(id, dto, user);
  }

  @Patch('me/tickets/:id/stage')
  @Roles('technician')
  updateTicketStage(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStageDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.updateTicketStage(id, dto, user);
  }

  @Post('me/tickets/:id/complete')
  @Roles('technician')
  completeTicket(
    @Param('id') id: string,
    @Body() dto: CompleteTicketDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.completeTicket(id, dto, user);
  }

  // ==================== P0: ADDITIONAL CHARGES ====================

  @Post('me/tickets/:id/additional-charges')
  @Roles('technician')
  submitAdditionalCharges(
    @Param('id') id: string,
    @Body() dto: SubmitAdditionalChargesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.submitAdditionalCharges(id, dto, user);
  }

  @Get('me/tickets/:id/additional-charges')
  @Roles('technician')
  getAdditionalCharges(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getAdditionalCharges(id, user);
  }

  // ==================== DIAGNOSIS & PARTS ====================

  @Get('me/rejected-tickets')
  @Roles('technician')
  getRejectedTickets(@Query() filter: TicketFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getRejectedTickets(user, filter);
  }

  @Post('me/tickets/:id/diagnosis')
  @Roles('technician')
  createDiagnosis(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.createDiagnosis(id, dto, user);
  }

  @Post('me/tickets/:id/parts-request')
  @Roles('technician')
  createPartsRequest(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.createPartsRequest(id, dto, user);
  }

  @Patch('me/tickets/:id/parts-received')
  @Roles('technician')
  confirmPartsReceived(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.confirmPartsReceived(id, dto, user);
  }

  @Patch('me/tickets/:ticketId/additional-charges/:chargeId')
  @Roles('technician', 'admin', 'vendor')
  updateAdditionalCharge(
    @Param('ticketId') ticketId: string,
    @Param('chargeId') chargeId: string,
    @Body() updates: any,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.technicianService.updateAdditionalCharge(ticketId, chargeId, updates, user);
  }

  @Get('me/refunds')
  @Roles('technician')
  getRefunds(@Query() filter: any, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getRefunds(user, filter);
  }

  // ==================== P1: EARNINGS ====================

  @Get('me/earnings')
  @Roles('technician')
  getEarnings(@Query() filter: EarningsFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getEarnings(user, filter);
  }

  @Get('me/earnings/pending')
  @Roles('technician')
  getPendingEarnings(@CurrentUser() user: CurrentUserType) {
    return this.technicianService.getPendingEarnings(user);
  }

  @Get('me/earnings/history')
  @Roles('technician')
  getEarningsHistory(@Query() filter: EarningsFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getEarningsHistory(user, filter);
  }

  @Patch('me/payout-method')
  @Roles('technician')
  updatePayoutMethod(@Body() dto: PayoutMethodDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.updatePayoutMethod(dto, user);
  }

  // ==================== P2: UPI QR (PLACEHOLDER) ====================

  @Get('me/upi-qr')
  @Roles('technician')
  generateUpiQr(@CurrentUser() user: CurrentUserType) {
    return this.technicianService.generateUpiQr(user);
  }

  // ==================== P1: COMPLAINTS ====================

  @Post('me/complaints')
  @Roles('technician')
  createComplaint(@Body() dto: CreateComplaintDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.createComplaint(dto, user);
  }

  @Get('me/complaints')
  @Roles('technician')
  getMyComplaints(@Query() filter: ComplaintFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.technicianService.getMyComplaints(user, filter);
  }

  // ==================== ADMIN ROUTES ====================

  @Get()
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  list(@Query() filter: TechnicianFilterDto) {
    return this.technicianService.list(filter);
  }

  @Get(':id')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  get(@Param('id') id: string) {
    return this.technicianService.get(id);
  }

  @Get(':id/maintenance-tickets')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin', 'technician')
  getMaintenanceTickets(@Param('id') id: string) {
    return this.technicianService.getMaintenanceTickets(id);
  }

  @Get(':id/repaired-drones')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin', 'technician')
  getRepairedDrones(@Param('id') id: string) {
    return this.technicianService.getRepairedDrones(id);
  }

  @Get(':id/support-documents')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin', 'technician')
  getSupportDocuments(@Param('id') id: string) {
    return this.technicianService.getSupportDocuments(id);
  }

  @Delete(':id')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  remove(@Param('id') id: string) {
    return this.technicianService.remove(id);
  }
}

