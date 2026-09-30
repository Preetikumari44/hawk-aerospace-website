import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

export interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    return this.authenticate(client);
  }

  async authenticate(client: AuthenticatedSocket): Promise<boolean> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`WS auth failed: no token from ${client.id}`);
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      client.user = payload;
      return true;
    } catch {
      this.logger.warn(`WS auth failed: invalid token from ${client.id}`);
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader =
      (client.handshake.auth as Record<string, string>)?.token ??
      client.handshake.headers?.authorization;

    if (!authHeader) return null;
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return authHeader;
  }
}
