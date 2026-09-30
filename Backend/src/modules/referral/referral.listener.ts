import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { REFERRAL_EVENTS } from './referral.constants';
import { ReferralService } from './referral.service';

@Injectable()
export class ReferralListener {
  private readonly logger = new Logger(ReferralListener.name);

  constructor(private readonly referralService: ReferralService) {}

  @OnEvent(REFERRAL_EVENTS.SIGNED_UP)
  async onSignedUp(payload: { inviteeUid: string; inviteePhone?: string; code: string }) {
    try {
      if (!payload?.inviteeUid || !payload?.code) return;
      await this.referralService.handleSignedUp(
        payload.inviteeUid,
        payload.inviteePhone,
        payload.code,
      );
    } catch (e) {
      this.logger.warn(`referral.signed_up failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('referral.applied.attach')
  async onAppliedAttach(payload: { inviteeUid: string; applicationId: string; code: string }) {
    try {
      if (!payload?.inviteeUid || !payload?.code) return;
      await this.referralService.handleApplied(
        payload.inviteeUid,
        payload.applicationId,
        payload.code,
      );
    } catch (e) {
      this.logger.warn(`referral.applied.attach failed: ${(e as Error).message}`);
    }
  }

  @OnEvent(REFERRAL_EVENTS.ROLE_APPROVED)
  async onRoleApproved(payload: { uid: string; role: string; applicationId?: string }) {
    try {
      if (!payload?.uid || !payload?.role) return;
      await this.referralService.handleRoleApproved(payload.uid, payload.role);
    } catch (e) {
      this.logger.warn(`referral.role.approved failed: ${(e as Error).message}`);
    }
  }

  @OnEvent(REFERRAL_EVENTS.BOOKING_PAID)
  async onBookingPaid(payload: { customerUid: string; bookingId: string; amount?: number }) {
    try {
      if (!payload?.customerUid || !payload?.bookingId) return;
      await this.referralService.handleBookingPaid(payload.customerUid, payload.bookingId);
    } catch (e) {
      this.logger.warn(`referral.booking.paid failed: ${(e as Error).message}`);
    }
  }
}
