import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BookingModule } from '../modules/booking/booking.module';
import { EventBusModule } from './events/event-bus.module';
import { HawkGateway } from './hawk.gateway';
import { WsAuthGuard } from './ws-auth.guard';
import { GPSTrackingService } from './services/gps-tracking.service';
import { GPSTrackingController } from './controllers/gps-tracking.controller';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    EventBusModule,
    JwtModule.register({}),
    BookingModule,
    FirebaseModule,
  ],
  controllers: [GPSTrackingController],
  providers: [HawkGateway, WsAuthGuard, GPSTrackingService],
  exports: [HawkGateway, GPSTrackingService],
})
export class GatewayModule {}
