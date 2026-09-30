import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MarketplaceService } from './marketplace.service';

/**
 * Hourly sweep that auto-marks marketplace orders as delivered once their
 * delivery day has fully passed. Orders stay active only up to and including
 * the delivery date — never after.
 *
 * - Idempotent: only pending/in_progress orders with a past delivery moment
 *   are touched; per-order failures are logged without aborting the run.
 * - Set `MARKETPLACE_AUTOCOMPLETE_ENABLED=false` to pause without redeploy.
 *   Never runs under `NODE_ENV=test`.
 */
@Injectable()
export class MarketplaceAutocompleteListener {
  private readonly logger = new Logger(MarketplaceAutocompleteListener.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepPastDueOrders(): Promise<void> {
    if (this.configService.get<boolean>('MARKETPLACE_AUTOCOMPLETE_ENABLED', true) === false) {
      this.logger.debug('Marketplace autocomplete sweep skipped (MARKETPLACE_AUTOCOMPLETE_ENABLED=false).');
      return;
    }
    if (this.configService.get<string>('NODE_ENV', 'development') === 'test') {
      return;
    }

    this.logger.log('Running marketplace autocomplete sweep...');
    try {
      const result = await this.marketplaceService.autoCompletePastDueOrders();
      this.logger.log(
        `Marketplace autocomplete sweep done: checked=${result.checked} completed=${result.completed.length} failed=${result.failed.length}`,
      );
      for (const item of result.failed) {
        this.logger.warn(`Autocomplete failed for ${item.id}: ${item.error}`);
      }
    } catch (error) {
      this.logger.error(
        `Marketplace autocomplete sweep failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
