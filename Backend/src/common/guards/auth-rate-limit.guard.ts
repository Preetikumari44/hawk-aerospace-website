import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthRateLimitService } from '../services/auth-rate-limit.service';
import { getClientIdentifier, isPrivateIp, extractClientIp } from '../utils/ip-extraction.util';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const limit = Math.max(1, this.configService.get<number>('AUTH_RATE_LIMIT_MAX_REQUESTS', 10));
    const windowMs = Math.max(
      1000,
      this.configService.get<number>('AUTH_RATE_LIMIT_WINDOW_MS', 60_000),
    );

    // Get composite client identifier (IP + User-Agent fingerprint)
    const clientKey = getClientIdentifier(request, 'auth');

    // Warn if we're getting private IPs (indicates trust proxy might not be configured)
    const clientIp = extractClientIp(request);
    if (isPrivateIp(clientIp) && this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.warn(
        `Rate limiting using private IP address: ${clientIp}. ` +
        'Ensure "trust proxy" is properly configured if behind a proxy/load balancer.',
      );
    }

    const decision = this.authRateLimitService.check(clientKey, limit, windowMs);

    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(decision.remaining));
    response.setHeader('X-RateLimit-Reset', String(Math.ceil(decision.resetAt / 1000)));

    if (!decision.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));

      throw new HttpException(
        {
          message: 'Too many auth attempts. Try again later.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
