import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoginHistoryService } from '../auth/services/login-history.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/users/:uid/login-history')
export class AdminLoginHistoryController {
  constructor(
    private readonly loginHistoryService: LoginHistoryService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get login history for a specific user
   */
  @Get()
  async getUserLoginHistory(
    @Param('uid') uid: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('status') status?: 'success' | 'failed' | 'blocked',
  ) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    const history = await this.loginHistoryService.getUserLoginHistory(uid, {
      limit,
      status,
    });

    return {
      success: true,
      data: {
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        history,
        count: history.length,
      },
    };
  }

  /**
   * Get login statistics for a user
   */
  @Get('stats')
  async getUserLoginStats(
    @Param('uid') uid: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    const stats = await this.loginHistoryService.getLoginStats(uid, days);

    return {
      success: true,
      data: {
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        stats,
      },
    };
  }
}
