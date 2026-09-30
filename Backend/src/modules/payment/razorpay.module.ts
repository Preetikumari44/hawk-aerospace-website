import { Module } from '@nestjs/common';

import { RazorpayService } from './razorpay.service';

/**
 * Standalone module so booking + marketplace flows can verify Razorpay
 * payments without importing the whole PaymentModule (which depends on
 * BookingModule — importing it back would create a cycle).
 */
@Module({
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class RazorpayModule {}
