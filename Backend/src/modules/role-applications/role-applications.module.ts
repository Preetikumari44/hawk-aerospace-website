import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { UsersModule } from '../users/users.module';
import { RoleApplicationsController } from './role-applications.controller';
import { RoleApplicationsService } from './role-applications.service';

@Module({
  imports: [CacheModule, UsersModule],
  controllers: [RoleApplicationsController],
  providers: [RoleApplicationsService],
  exports: [RoleApplicationsService],
})
export class RoleApplicationsModule {}