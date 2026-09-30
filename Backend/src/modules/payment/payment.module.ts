import { Module } from '@nestjs/common';

import { BookingModule } from '../booking/booking.module';
import { CouponModule } from '../coupon/coupon.module';
import { InvoiceService } from './invoice/invoice.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayModule } from './razorpay.module';

@Module({
  imports: [BookingModule, CouponModule, RazorpayModule],
  controllers: [PaymentController],
  providers: [PaymentService, InvoiceService],
  exports: [PaymentService],
})
export class PaymentModule {}
