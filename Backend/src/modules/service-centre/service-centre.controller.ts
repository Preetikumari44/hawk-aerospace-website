import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ScheduleSlotDto } from './dto/schedule-slot.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { UpdateTicketDetailsDto } from './dto/update-ticket-details.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ServiceCentreService } from './service-centre.service';

@Controller('service-centre')
export class ServiceCentreController {
  constructor(private readonly serviceCentreService: ServiceCentreService) {}

  @Post('tickets')
  @Roles('pilot')
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: CurrentUserType) {
    return this.serviceCentreService.createTicket(dto, user);
  }

  @Get('tickets')
  @Roles('technician', 'vendor', 'admin')
  listTickets(@Query() filter: TicketFilterDto, @CurrentUser() user: CurrentUserType) {
    return this.serviceCentreService.listTickets(filter, user);
  }

  @Get('tickets/:id')
  @Roles('technician', 'vendor', 'admin', 'pilot')
  getTicket(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.serviceCentreService.getTicket(id, user);
  }

  @Patch('tickets/:id/assign')
  @Roles('vendor', 'admin')
  assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.serviceCentreService.assignTechnician(id, dto, user);
  }

  @Patch('tickets/:id/status')
  @Roles('technician')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.serviceCentreService.updateStatus(id, dto, user);
  }

  @Patch('tickets/:id/details')
  @Roles('technician')
  updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDetailsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.serviceCentreService.updateDetails(id, dto, user);
  }

  @Get('calendar')
  @Roles('technician', 'admin')
  calendar(@CurrentUser() user: CurrentUserType, @Query('mode') mode?: 'day' | 'week' | 'month') {
    return this.serviceCentreService.calendar(user, mode);
  }

  @Get('calendar/:date')
  @Roles('technician', 'admin')
  calendarDate(@Param('date') date: string, @CurrentUser() user: CurrentUserType) {
    return this.serviceCentreService.calendarDate(date, user);
  }

  @Post('schedule')
  @Roles('vendor', 'admin')
  schedule(@Body() dto: ScheduleSlotDto) {
    return this.serviceCentreService.schedule(dto);
  }

  @Patch('schedule/:id/reschedule')
  @Roles('vendor', 'admin')
  reschedule(@Param('id') id: string, @Body() dto: ScheduleSlotDto) {
    return this.serviceCentreService.reschedule(id, dto);
  }

  @Get('drones/:droneId/history')
  @Roles('pilot', 'vendor')
  serviceHistory(@Param('droneId') droneId: string) {
    return this.serviceCentreService.serviceHistory(droneId);
  }

  @Get('dashboard')
  @Roles('admin', 'super_admin')
  dashboard() {
    return this.serviceCentreService.dashboard();
  }

  @Get('sla/breaches')
  @Roles('admin', 'super_admin')
  slaBreaches() {
    return this.serviceCentreService.slaBreaches();
  }

  @Get('technicians')
  @Roles('admin', 'super_admin')
  technicians() {
    return this.serviceCentreService.listTechnicians();
  }

  @Get('technicians/:id')
  @Roles('admin', 'super_admin')
  technician(@Param('id') id: string) {
    return this.serviceCentreService.getTechnician(id);
  }

  @Patch('technicians/:id/verify')
  @Roles('admin', 'super_admin')
  verifyTechnician(@Param('id') id: string, @Body('approved') approved: boolean) {
    return this.serviceCentreService.verifyTechnician(id, approved);
  }
}
