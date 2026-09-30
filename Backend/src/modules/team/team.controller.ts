import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CreateInviteDto, CreateJoinRequestDto } from './dto/team.dto';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /** FM: pilots without a fleet manager (home carousel + search). Supports 150km geo filter via lat/lng. */
  @Get('unassigned-pilots')
  @Roles('fleet_manager', 'vendor')
  unassigned(
    @CurrentUser() user: CurrentUserType,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.teamService.listUnassignedPilots(user, search, limit ? parseInt(limit, 10) : 30, {
      lat: lat != null && lat !== '' ? Number(lat) : null,
      lng: lng != null && lng !== '' ? Number(lng) : null,
      radiusKm: radiusKm != null && radiusKm !== '' ? Number(radiusKm) : null,
    });
  }

  /** Pilot: my fleet manager (null when unassigned). Drives conditional UI. */
  @Get('my-manager')
  @Roles('pilot')
  myManager(@CurrentUser() user: CurrentUserType) {
    return this.teamService.getMyFleetManager(user);
  }

  /** Pilot: all my fleet managers (0..3). */
  @Get('my-managers')
  @Roles('pilot')
  myManagers(@CurrentUser() user: CurrentUserType) {
    return this.teamService.getMyManagers(user);
  }

  /** Pilot: 5 nearest fleet managers with stats (suggestion carousel). Supports 150km geo filter via lat/lng. */
  @Get('suggested-managers')
  @Roles('pilot')
  suggested(
    @CurrentUser() user: CurrentUserType,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.teamService.listSuggestedManagers(user, limit ? parseInt(limit, 10) : 5, {
      lat: lat != null && lat !== '' ? Number(lat) : null,
      lng: lng != null && lng !== '' ? Number(lng) : null,
      radiusKm: radiusKm != null && radiusKm !== '' ? Number(radiusKm) : null,
    });
  }

  /** FM invites a pilot (by uid or phone). */
  @Post('invites')
  @Roles('fleet_manager', 'vendor')
  invite(@Body() dto: CreateInviteDto, @CurrentUser() user: CurrentUserType) {
    return this.teamService.invitePilot(dto, user);
  }

  /** Pilot requests to join an FM (by FM phone or uid). */
  @Post('requests')
  @Roles('pilot')
  request(@Body() dto: CreateJoinRequestDto, @CurrentUser() user: CurrentUserType) {
    return this.teamService.requestToJoin(dto, user);
  }

  /** Pending items where I am the recipient. */
  @Get('incoming')
  @Roles('pilot', 'fleet_manager', 'vendor')
  incoming(@CurrentUser() user: CurrentUserType) {
    return this.teamService.incoming(user);
  }

  /** Pending items I created. */
  @Get('outgoing')
  @Roles('pilot', 'fleet_manager', 'vendor')
  outgoing(@CurrentUser() user: CurrentUserType) {
    return this.teamService.outgoing(user);
  }

  @Post(':id/accept')
  @Roles('pilot', 'fleet_manager', 'vendor')
  accept(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.teamService.accept(id, user);
  }

  @Post(':id/reject')
  @Roles('pilot', 'fleet_manager', 'vendor')
  reject(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.teamService.reject(id, user);
  }

  @Post(':id/cancel')
  @Roles('pilot', 'fleet_manager', 'vendor')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.teamService.cancel(id, user);
  }
}
