import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { FirebaseModule } from '../../firebase/firebase.module';
import { CouponModule } from '../coupon/coupon.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceAutocompleteListener } from './marketplace-autocomplete.listener';

@Module({
  imports: [FirebaseModule, CouponModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceAutocompleteListener],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
