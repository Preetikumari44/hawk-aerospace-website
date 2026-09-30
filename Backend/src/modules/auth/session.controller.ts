import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { SessionTrackingService } from './services/session-tracking.service';
import { TokenDenylistService } from './services/token-denylist.service';

@UseGuards(JwtAuthGuard)
@Controller('auth/sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionTrackingService,
    private readonly tokenDenylistService: TokenDenylistService,
  ) {}

  /**
   * Get current user's active sessions
   */
  @Get('me')
  async getMySessions(
    @CurrentUser() user: JwtPayload,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const sessions = await this.sessionService.getUserSessions(
      user.uid,
      includeInactive === 'true',
    );

    return {
      success: true,
      data: sessions,
      count: sessions.length,
    };
  }

  /**
   * Get a specific session
   */
  @Get('me/:sessionId')
  async getMySession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.sessionService.getSession(user.uid, sessionId);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    return {
      success: true,
      data: session,
    };
  }

  /**
   * Revoke a specific session
   */
  @Delete('me/:sessionId')
  async revokeMySession(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization?: string,
  ) {
    // Get the session to retrieve tokens for denylist
    const session = await this.sessionService.getSession(user.uid, sessionId);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Revoke the session in Firestore
    await this.sessionService.revokeSession(
      user.uid,
      sessionId,
      'Revoked by user',
    );

    // If this is not the current session, we can't denylist the tokens
    // (we don't have access to the original tokens, only hashes)
    // The tokens will expire naturally

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  /**
   * Revoke all other sessions (keep current one active)
   */
  @Delete('me/others')
  async revokeOtherSessions(
    @CurrentUser() user: JwtPayload,
    @Headers('x-session-id') sessionId?: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException(
        'X-Session-Id header is required to identify current session',
      );
    }

    const revokedCount = await this.sessionService.revokeAllSessionsExceptCurrent(
      user.uid,
      sessionId,
    );

    return {
      success: true,
      message: `Revoked ${revokedCount} other session(s)`,
      revokedCount,
    };
  }

  /**
   * Revoke all sessions (including current)
   */
  @Delete('me')
  async revokeAllSessions(
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authorization?: string,
  ) {
    const revokedCount = await this.sessionService.revokeAllSessions(
      user.uid,
      'All sessions revoked by user',
    );

    // Denylist current access token
    if (authorization) {
      const accessToken = authorization.replace('Bearer ', '');
      await this.tokenDenylistService.addToken(accessToken);
    }

    return {
      success: true,
      message: `Revoked all ${revokedCount} session(s). Please log in again.`,
      revokedCount,
    };
  }
}
