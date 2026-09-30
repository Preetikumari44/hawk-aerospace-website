import { Body, Controller, Get, Param, Patch, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { RoleApplicationQueryDto } from './dto/review-role-application.dto';
import { SubmitGuestRoleApplicationDto } from './dto/submit-guest-application.dto';
import { SubmitRoleApplicationDto } from './dto/submit-role-application.dto';
import { ReviewRoleApplicationDto } from './dto/review-role-application.dto';
import { RoleApplicationsService } from './role-applications.service';

@Controller('role-applications')
export class RoleApplicationsController {
  constructor(private readonly roleApplicationsService: RoleApplicationsService) {}

  /**
   * Self-service: submit an application for a new role.
   * Uses whitelist WITHOUT forbidNonWhitelisted so older/newer APKs sending
   * extra document keys (fileName, mimeType, fileSize, ...) get those keys
   * stripped instead of rejected with "property X should not exist".
   */
  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  submit(@Body() dto: SubmitRoleApplicationDto, @CurrentUser() user: CurrentUserType) {
    return this.roleApplicationsService.submit(dto, user);
  }

  /**
   * Public: no-login application from a Refer & Earn invite link.
   * Phone ownership is proven by a Firebase ID token from the in-form OTP
   * step. Strictly rate-limited; a referral code is mandatory.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('guest')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  submitGuest(@Body() dto: SubmitGuestRoleApplicationDto) {
    return this.roleApplicationsService.submitGuest(dto);
  }

  /** Self-service: list the current user's role applications. ?role=<role> filters to one role. */
  @Get('my')
  getMyApplications(
    @CurrentUser() user: CurrentUserType,
    @Query('role') role?: string,
  ) {
    if (role) {
      return this.roleApplicationsService.getMyApplicationForRole(
        user.uid,
        this.roleApplicationsService.normalizeRole(role),
      );
    }
    return this.roleApplicationsService.getMyApplications(user);
  }

  /** Admin: list all role applications with status/role filters. */
  @Get()
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  listAll(@Query() query: RoleApplicationQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.roleApplicationsService.listAdmin(query, user);
  }

  /** Admin: single application detail. */
  @Get(':id')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  getById(@Param('id') id: string) {
    return this.roleApplicationsService.getById(id);
  }

  /** Admin: approve or reject an application. */
  @Patch(':id/review')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewRoleApplicationDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.roleApplicationsService.review(id, dto, user);
  }
}