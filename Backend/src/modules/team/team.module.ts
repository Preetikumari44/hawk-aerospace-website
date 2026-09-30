import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [CacheModule, UsersModule, NotificationModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
