import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { SetLanguageDto } from './dto/set-language.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin', 'super_admin')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getByUid(user.uid);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateOwnProfile(user.uid, dto);
  }

  @Post('language')
  setLanguage(@CurrentUser() user: CurrentUserType, @Body() dto: SetLanguageDto) {
    return this.usersService.setLanguage(user.uid, dto);
  }

  @Delete('me')
  deleteMe(@CurrentUser() user: CurrentUserType) {
    return this.usersService.softDelete(user.uid);
  }

  @Get()
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  listUsers(@Query() filter: UserFilterDto) {
    return this.usersService.findMany(filter);
  }

  @Get(':uid')
  @Roles('admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  getUser(@Param('uid') uid: string) {
    return this.usersService.getByUid(uid);
  }

  @Patch(':uid/status')
  @Roles('admin', 'super_admin')
  updateUserStatus(@Param('uid') uid: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(uid, dto);
  }
}
