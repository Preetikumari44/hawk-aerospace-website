import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminLockoutController } from './admin-lockout.controller';
import { AdminLoginHistoryController } from './admin-login-history.controller';
import { AdminSessionController } from './admin-session.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CacheModule, AuthModule, UsersModule],
  controllers: [
    AdminController,
    AdminSessionController,
    AdminLockoutController,
    AdminLoginHistoryController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
