import { Test, TestingModule } from '@nestjs/testing';

import { CouponService } from '../coupon/coupon.service';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { NotificationService } from '../notification/notification.service';
import { RazorpayService } from '../payment/razorpay.service';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralModule } from './referral.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { ReferralRulesService } from './referral-rules.service';

describe('ReferralModule wiring', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const firestoreMock = { firestore: jest.fn() };
    module = await Test.createTestingModule({
      imports: [ReferralModule, FirebaseModule],
    })
      .overrideProvider(FirebaseAdminService)
      .useValue(firestoreMock)
      .overrideProvider(CouponService)
      .useValue({})
      .overrideProvider(NotificationService)
      .useValue({ dispatch: jest.fn() })
      .overrideProvider(RazorpayService)
      .useValue({ isConfigured: false })
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('resolves all controllers and providers', () => {
    expect(module.get(ReferralController)).toBeDefined();
    expect(module.get(WalletController)).toBeDefined();
    expect(module.get(ReferralService)).toBeDefined();
    expect(module.get(ReferralRulesService)).toBeDefined();
    expect(module.get(WalletService)).toBeDefined();
  });
});
