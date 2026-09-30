import { Module } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { BookingModule } from '../booking/booking.module';
import { UsersModule } from '../users/users.module';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

@Module({
  imports: [BookingModule, UsersModule, CacheModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
