import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
