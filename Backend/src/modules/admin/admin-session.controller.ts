import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SessionTrackingService } from '../auth/services/session-tracking.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
@Controller('admin/users/:uid/sessions')
export class AdminSessionController {
  constructor(
    private readonly sessionService: SessionTrackingService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get all sessions for a specific user
   */
  @Get()
  async getUserSessions(
    @Param('uid') uid: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    const sessions = await this.sessionService.getUserSessions(
      uid,
      includeInactive === 'true',
    );

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
        sessions,
        count: sessions.length,
      },
    };
  }

  /**
   * Get a specific session for a user
   */
  @Get(':sessionId')
  async getUserSession(
    @Param('uid') uid: string,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.sessionService.getSession(uid, sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      success: true,
      data: session,
    };
  }

  /**
   * Revoke a specific session for a user
   */
  @Delete(':sessionId')
  async revokeUserSession(
    @Param('uid') uid: string,
    @Param('sessionId') sessionId: string,
  ) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    await this.sessionService.revokeSession(
      uid,
      sessionId,
      'Revoked by administrator',
    );

    return {
      success: true,
      message: `Session ${sessionId} revoked for user ${user.name}`,
    };
  }

  /**
   * Revoke all sessions for a user
   */
  @Delete()
  async revokeAllUserSessions(@Param('uid') uid: string) {
    // Verify user exists
    const user = await this.usersService.findByUid(uid);
    if (!user) {
      throw new NotFoundException(`User with UID ${uid} not found`);
    }

    const revokedCount = await this.sessionService.revokeAllSessions(
      uid,
      'All sessions revoked by administrator',
    );

    return {
      success: true,
      message: `Revoked all ${revokedCount} session(s) for user ${user.name}`,
      revokedCount,
    };
  }
}
