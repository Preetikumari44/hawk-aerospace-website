import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { CacheModule } from '../../common/cache/cache.module';
import { AuthRateLimitGuard } from '../../common/guards/auth-rate-limit.guard';
import { AuthRateLimitService } from '../../common/services/auth-rate-limit.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DebugAuthController } from './debug-auth.controller';
import { LoginHistoryController } from './login-history.controller';
import { SessionController } from './session.controller';
import { AccountLockoutService } from './services/account-lockout.service';
import { LoginHistoryService } from './services/login-history.service';
import { OtpService } from './services/otp.service';
import { SessionTrackingService } from './services/session-tracking.service';
import { TokenDenylistService } from './services/token-denylist.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
    CacheModule,
    FirebaseModule,
    UsersModule,
    NotificationModule,
  ],
  controllers: [
    AuthController,
    DebugAuthController,
    SessionController,
    LoginHistoryController,
  ],
  providers: [
    AuthService,
    TokenDenylistService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    JwtStrategy,
    AccountLockoutService,
    LoginHistoryService,
    SessionTrackingService,
    OtpService,
  ],
  exports: [
    AuthService,
    TokenDenylistService,
    AccountLockoutService,
    LoginHistoryService,
    SessionTrackingService,
    OtpService,
  ],
})
export class AuthModule {}
