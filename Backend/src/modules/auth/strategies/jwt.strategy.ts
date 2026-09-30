import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { TokenDenylistService } from '../services/token-denylist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly tokenDenylistService: TokenDenylistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(request: any, payload: JwtPayload): Promise<JwtPayload> {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    if (token) {
      // Check if token is denylisted
      const isDenylisted = await this.tokenDenylistService.isTokenDenylisted(token);
      
      if (isDenylisted) {
        throw new UnauthorizedException(
          'This session has been invalidated. Please log in again.',
        );
      }
    }

    return payload;
  }
}
