import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { EscalateIncidentDto } from './dto/escalate-incident.dto';
import { FollowUpDto } from './dto/follow-up.dto';
import { IncidentFilterDto } from './dto/incident-filter.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentService } from './incident.service';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @Roles('pilot', 'vendor', 'admin', 'super_admin', 'state_admin', 'dept_admin')
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: CurrentUserType) {
    return this.incidentService.create(dto, user);
  }

  @Get()
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  list(@Query() filter: IncidentFilterDto) {
    return this.incidentService.list(filter);
  }

  @Get('summary')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  summary() {
    return this.incidentService.summary();
  }

  @Get('types/drone-malfunction')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  droneMalfunctions() {
    return this.incidentService.byType('drone_malfunction');
  }

  @Get('types/pilot-emergency')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  pilotEmergencies() {
    return this.incidentService.byType('pilot_emergency');
  }

  @Get('export')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  exportCsv(@Query() filter: IncidentFilterDto) {
    return this.incidentService.exportCsv(filter);
  }

  @Get(':id')
  @Roles('admin', 'subadmin', 'vendor', 'pilot', 'super_admin', 'state_admin', 'dept_admin')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.incidentService.get(id, user);
  }

  @Patch(':id/status')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.incidentService.updateStatus(id, dto, user);
  }

  @Patch(':id/escalate')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateIncidentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.incidentService.escalate(id, dto, user);
  }

  @Post(':id/follow-up')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  followUp(
    @Param('id') id: string,
    @Body() dto: FollowUpDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.incidentService.followUp(id, dto, user);
  }
}
