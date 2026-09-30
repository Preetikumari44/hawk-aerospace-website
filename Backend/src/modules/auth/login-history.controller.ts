import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { LoginHistoryService } from './services/login-history.service';

@UseGuards(JwtAuthGuard)
@Controller('auth/login-history')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  /**
   * Get current user's login history
   */
  @Get()
  async getMyLoginHistory(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('status') status?: 'success' | 'failed' | 'blocked',
  ) {
    const history = await this.loginHistoryService.getUserLoginHistory(user.uid, {
      limit,
      status,
    });

    return {
      success: true,
      data: history,
      count: history.length,
    };
  }

  /**
   * Get login statistics for current user
   */
  @Get('stats')
  async getMyLoginStats(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    const stats = await this.loginHistoryService.getLoginStats(user.uid, days);

    return {
      success: true,
      data: stats,
    };
  }
}
