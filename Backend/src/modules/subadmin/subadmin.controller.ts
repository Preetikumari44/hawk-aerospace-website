import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CreateSubAdminDto } from './dto/create-subadmin.dto';
import { SubAdminFilterDto } from './dto/subadmin-filter.dto';
import { UpdateSubAdminPermissionsDto } from './dto/update-subadmin-permissions.dto';
import { UpdateSubAdminScopeDto } from './dto/update-subadmin-scope.dto';
import { UpdateSubAdminDto } from './dto/update-subadmin.dto';
import { SubAdminService } from './subadmin.service';

@Controller('subadmins')
@Roles('admin', 'super_admin')
export class SubAdminController {
  constructor(private readonly subAdminService: SubAdminService) {}

  @Post()
  create(@Body() dto: CreateSubAdminDto, @CurrentUser() user: CurrentUserType) {
    return this.subAdminService.create(dto, user);
  }

  @Get()
  list(@Query() filter: SubAdminFilterDto) {
    return this.subAdminService.list(filter);
  }

  @Get('permissions/matrix')
  permissionsMatrix() {
    return this.subAdminService.getPermissionMatrix();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.subAdminService.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubAdminDto) {
    return this.subAdminService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subAdminService.remove(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.subAdminService.getPermissions(id);
  }

  @Patch(':id/permissions')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdateSubAdminPermissionsDto) {
    return this.subAdminService.updatePermissions(id, dto);
  }

  @Patch(':id/scope')
  updateScope(@Param('id') id: string, @Body() dto: UpdateSubAdminScopeDto) {
    return this.subAdminService.updateScope(id, dto);
  }

  @Get(':id/activity')
  activity(@Param('id') id: string) {
    return this.subAdminService.getActivity(id);
  }

  @Get(':id/managed-entities')
  managedEntities(@Param('id') id: string) {
    return this.subAdminService.getManagedEntities(id);
  }
}
