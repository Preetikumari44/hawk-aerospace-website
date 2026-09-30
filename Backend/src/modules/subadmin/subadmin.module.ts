import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { UsersModule } from '../users/users.module';
import { SubAdminController } from './subadmin.controller';
import { SubAdminService } from './subadmin.service';

@Module({
  imports: [UsersModule, CacheModule],
  controllers: [SubAdminController],
  providers: [SubAdminService],
  exports: [SubAdminService],
})
export class SubAdminModule {}
