import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BookingModule } from '../booking/booking.module';
import { RevenueModule } from '../revenue/revenue.module';
import { MapsModule } from '../maps/maps.module';
import { FleetModule } from '../fleet/fleet.module';
import { PilotModule } from '../pilot/pilot.module';
import { TechnicianModule } from '../technician/technician.module';
import { CustomerModule } from '../customer/customer.module';
import { VendorModule } from '../vendor/vendor.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { CacheModule } from '../../common/cache/cache.module';
import { FirebaseModule } from '../../firebase/firebase.module';

@Module({
  imports: [
    BookingModule,
    RevenueModule,
    MapsModule,
    FleetModule,
    PilotModule,
    TechnicianModule,
    CustomerModule,
    VendorModule,
    MarketplaceModule,
    CacheModule,
    FirebaseModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
