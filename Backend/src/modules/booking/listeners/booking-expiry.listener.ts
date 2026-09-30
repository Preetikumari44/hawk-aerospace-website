import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { BookingService } from '../booking.service';

/**
 * Hourly sweep that system auto-cancels bookings whose service date has fully
 * passed (23:59:59 IST) without admin approval, FM/pilot/drone assignment,
 * service start, or completion.
 *
 * - Cancellation runs through `BookingService.autoCancelExpiredBooking`, which
 *   grants a FULL (100%) refund when an amount is due and notifies all parties
 *   over the existing `MISSION_CANCELLED` socket event.
 * - The sweep is idempotent: already terminal bookings are no-ops, and
 *   per-booking failures are logged without aborting the run.
 * - Set `BOOKING_EXPIRY_ENABLED=false` to pause the job without a redeploy.
 *   The job never runs under `NODE_ENV=test`.
 */
@Injectable()
export class BookingExpiryListener {
  private readonly logger = new Logger(BookingExpiryListener.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredBookings(): Promise<void> {
    if (this.configService.get<boolean>('BOOKING_EXPIRY_ENABLED', true) === false) {
      this.logger.debug('Booking expiry sweep skipped (BOOKING_EXPIRY_ENABLED=false).');
      return;
    }
    if (this.configService.get<string>('NODE_ENV', 'development') === 'test') {
      return;
    }

    this.logger.log('Running booking expiry sweep...');
    try {
      const result = await this.bookingService.autoCancelExpiredBookings();
      this.logger.log(
        `Booking expiry sweep done: checked=${result.checked} cancelled=${result.cancelled.length} failed=${result.failed.length}`,
      );
      for (const item of result.failed) {
        this.logger.warn(`Expiry cancel failed for ${item.id}: ${item.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Booking expiry sweep failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
