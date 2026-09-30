import { Module, forwardRef } from '@nestjs/common';

import { PricingModule } from '../pricing/pricing.module';
import { FlightConditionsModule } from '../flight-conditions/flight-conditions.module';
import { FarmModule } from '../farm/farm.module';
import { FleetModule } from '../fleet/fleet.module';
import { CouponModule } from '../coupon/coupon.module';
import { RazorpayModule } from '../payment/razorpay.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingHistoryController } from './history/booking-history.controller';
import { BookingHistoryService } from './history/booking-history.service';
import { BookingEventsService } from './services/booking-events.service';
import { BookingExpiryListener } from './listeners/booking-expiry.listener';

@Module({
  imports: [
    PricingModule,
    FlightConditionsModule,
    FarmModule,
    CouponModule,
    RazorpayModule,
    forwardRef(() => FleetModule), // �-? Import FleetModule with forwardRef to break circular dependency
  ],
  controllers: [BookingController, BookingHistoryController],
  providers: [BookingService, BookingHistoryService, BookingEventsService, BookingExpiryListener],
  exports: [BookingService, BookingHistoryService, BookingEventsService],
})
export class BookingModule {}
