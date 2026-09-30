import { Module } from '@nestjs/common';

import { CouponModule } from '../coupon/coupon.module';
import { NotificationModule } from '../notification/notification.module';
import { RazorpayModule } from '../payment/razorpay.module';
import { ReferralController } from './referral.controller';
import { ReferralListener } from './referral.listener';
import { ReferralRulesService } from './referral-rules.service';
import { ReferralService } from './referral.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [CouponModule, NotificationModule, RazorpayModule],
  controllers: [ReferralController, WalletController],
  providers: [ReferralService, ReferralRulesService, WalletService, ReferralListener],
  exports: [ReferralService, ReferralRulesService, WalletService],
})
export class ReferralModule {}
