import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccountLockoutService } from '../auth/services/account-lockout.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/users/:uid')
export class AdminLockoutController {
  constructor(
    private readonly lockoutService: AccountLockoutService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get lockout status for a user
   */
  @Get('lockout')
  async getUserLockoutStatus(@Param('uid') uid: string) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    // Check by email or phone (identifier used in lockout)
    const identifier = user.email || user.phone || uid;
    const lockoutInfo = await this.lockoutService.getLockoutInfo(identifier);
    const lockStatus = await this.lockoutService.isAccountLocked(identifier);

    return {
      success: true,
      data: {
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        lockout: {
          locked: lockStatus.locked,
          attempts: lockStatus.attempts,
          lockedUntil: lockStatus.lockedUntil,
          ...lockoutInfo,
        },
      },
    };
  }

  /**
   * Unlock a user account (reset failed attempts)
   */
  @Post('unlock')
  async unlockUserAccount(@Param('uid') uid: string) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    // Unlock by email or phone (identifier used in lockout)
    const identifier = user.email || user.phone || uid;
    await this.lockoutService.unlockAccount(identifier);

    return {
      success: true,
      message: `Account unlocked for user ${user.name}. Failed login attempts have been reset.`,
    };
  }
}
