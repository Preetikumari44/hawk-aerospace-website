import { BadRequestException, Injectable } from '@nestjs/common';
import type { CollectionReference } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreRewardPointsDocument,
  FirestoreRewardRedemptionDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { RedeemDto } from './dto/redeem.dto';

@Injectable()
export class RewardService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async summary(user: CurrentUser) {
    const snapshot = await this.pointsCollection().where('pilotUid', '==', user.uid).get();
    const events = snapshot.docs.map((doc) => doc.data());
    const points = events.reduce((sum, event) => sum + event.rewardPoints, 0);
    return {
      pilotUid: user.uid,
      points,
      badges:
        points >= 1000 ? ['gold'] : points >= 500 ? ['silver'] : points >= 100 ? ['bronze'] : [],
    };
  }

  async award(pilotUid: string, points: number, bookingId?: string) {
    const ref = this.pointsCollection().doc();
    const now = new Date().toISOString();
    const event: FirestoreRewardPointsDocument = {
      id: ref.id,
      pilotUid,
      rewardPoints: points,
      itemRedeemed: bookingId ?? null,
      status: 'delivered',
      date: now,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(event);
    return event;
  }

  async redeem(dto: RedeemDto, user: CurrentUser) {
    const summary = await this.summary(user);
    if (summary.points < dto.points) throw new BadRequestException('Insufficient reward points.');
    const ref = this.redemptionCollection().doc();
    const now = new Date().toISOString();
    const redemption: FirestoreRewardRedemptionDocument = {
      id: ref.id,
      pilotUid: user.uid,
      points: dto.points,
      itemRedeemed: dto.itemRedeemed,
      status: 'shipped',
      date: now,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(redemption);
    await this.award(user.uid, -dto.points, dto.itemRedeemed);
    return redemption;
  }

  async history(user: CurrentUser) {
    const [points, redemptions] = await Promise.all([
      this.pointsCollection().where('pilotUid', '==', user.uid).get(),
      this.redemptionCollection().where('pilotUid', '==', user.uid).get(),
    ]);
    return {
      points: points.docs.map((doc) => doc.data()),
      redemptions: redemptions.docs.map((doc) => doc.data()),
    };
  }

  private pointsCollection(): CollectionReference<FirestoreRewardPointsDocument> {
    const collection: CollectionReference<FirestoreRewardPointsDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.rewardPoints);
    return collection;
  }

  private redemptionCollection(): CollectionReference<FirestoreRewardRedemptionDocument> {
    const collection: CollectionReference<FirestoreRewardRedemptionDocument> =
      this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.rewardRedemptions);
    return collection;
  }
}
