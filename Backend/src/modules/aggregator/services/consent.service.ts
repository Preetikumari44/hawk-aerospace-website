import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { NotificationService } from '../../notification/notification.service';
import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import {
  ConsentChannel,
  ConsentFilterDto,
  ConsentStatus,
  ConsentType,
  RequestConsentDto,
  UpdateConsentDto,
} from '../dto/consent.dto';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';

export interface ConsentRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  aggregatorId: string;
  aggregatorName: string;
  consentType: ConsentType;
  status: ConsentStatus;
  channel: ConsentChannel;
  requestedAt: string;
  respondedAt?: string;
  expiresAt?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Request consent from customer
   */
  async requestConsent(
    dto: RequestConsentDto,
    aggregator: CurrentUser,
  ): Promise<ConsentRecord> {
    this.logger.log(`Requesting consent from customer: ${dto.customerId}`);

    const db = this.firebaseAdminService.firestore();

    // Get customer details
    const customerDoc = await db.collection(ROOT_COLLECTIONS.users).doc(dto.customerId).get();

    if (!customerDoc.exists) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const customerData = customerDoc.data();

    // Get aggregator details
    const aggregatorDoc = await db.collection(ROOT_COLLECTIONS.users).doc(aggregator.uid).get();
    const aggregatorData = aggregatorDoc.data();

    // Check if consent already exists
    const existingConsent = await db
      .collection('customer_consents')
      .where('customerId', '==', dto.customerId)
      .where('aggregatorId', '==', aggregator.uid)
      .where('consentType', '==', dto.consentType)
      .where('status', 'in', [ConsentStatus.PENDING, ConsentStatus.GRANTED])
      .get();

    if (!existingConsent.empty) {
      const existing = existingConsent.docs[0].data() as ConsentRecord;
      if (existing.status === ConsentStatus.GRANTED) {
        throw new BadRequestException('Consent already granted for this type');
      }
      if (existing.status === ConsentStatus.PENDING) {
        throw new BadRequestException('Consent request already pending');
      }
    }

    const consentId = `consent-${dto.customerId}-${aggregator.uid}-${dto.consentType}-${Date.now()}`;

    // Set expiry (30 days from request)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const consent: ConsentRecord = {
      id: consentId,
      customerId: dto.customerId,
      customerName: customerData?.name || 'Unknown',
      customerPhone: customerData?.phone,
      customerEmail: customerData?.email,
      aggregatorId: aggregator.uid,
      aggregatorName: aggregatorData?.name || 'Unknown',
      consentType: dto.consentType,
      status: ConsentStatus.PENDING,
      channel: dto.channel,
      requestedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('customer_consents').doc(consentId).set(consent);

    // Send consent request via specified channel
    await this.sendConsentRequest(consent, dto.message);

    this.logger.log(`Consent request created: ${consentId}`);
    return consent;
  }

  /**
   * Customer responds to consent request
   */
  async respondToConsent(
    consentId: string,
    dto: UpdateConsentDto,
    customer: CurrentUser,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ConsentRecord> {
    this.logger.log(`Customer responding to consent: ${consentId}`);

    const db = this.firebaseAdminService.firestore();
    const consentDoc = await db.collection('customer_consents').doc(consentId).get();

    if (!consentDoc.exists) {
      throw new NotFoundException(`Consent request ${consentId} not found`);
    }

    const consent = consentDoc.data() as ConsentRecord;

    // Verify customer owns this consent
    if (consent.customerId !== customer.uid) {
      throw new BadRequestException('Unauthorized to respond to this consent request');
    }

    // Check if expired
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      throw new BadRequestException('Consent request has expired');
    }

    // Check if already responded
    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException(`Consent already ${consent.status}`);
    }

    const updated: ConsentRecord = {
      ...consent,
      status: dto.status,
      respondedAt: new Date().toISOString(),
      notes: dto.notes,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('customer_consents').doc(consentId).set(updated, { merge: true });

    // If granted, link customer to aggregator
    if (dto.status === ConsentStatus.GRANTED && consent.consentType === ConsentType.AGGREGATOR_LINKAGE) {
      await this.linkCustomerToAggregator(consent.customerId, consent.aggregatorId);
    }

    // Emit event
    this.eventEmitter.emit('consent.responded', {
      consentId,
      customerId: consent.customerId,
      aggregatorId: consent.aggregatorId,
      status: dto.status,
    });

    this.logger.log(`Consent updated: ${consentId} - Status: ${dto.status}`);
    return updated;
  }

  /**
   * Revoke consent (customer action)
   */
  async revokeConsent(consentId: string, customer: CurrentUser): Promise<ConsentRecord> {
    this.logger.log(`Revoking consent: ${consentId}`);

    const db = this.firebaseAdminService.firestore();
    const consentDoc = await db.collection('customer_consents').doc(consentId).get();

    if (!consentDoc.exists) {
      throw new NotFoundException(`Consent ${consentId} not found`);
    }

    const consent = consentDoc.data() as ConsentRecord;

    // Verify customer owns this consent
    if (consent.customerId !== customer.uid) {
      throw new BadRequestException('Unauthorized to revoke this consent');
    }

    // Can only revoke granted consents
    if (consent.status !== ConsentStatus.GRANTED) {
      throw new BadRequestException('Can only revoke granted consents');
    }

    const updated: ConsentRecord = {
      ...consent,
      status: ConsentStatus.REVOKED,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('customer_consents').doc(consentId).set(updated, { merge: true });

    // If aggregator linkage revoked, unlink customer
    if (consent.consentType === ConsentType.AGGREGATOR_LINKAGE) {
      await this.unlinkCustomerFromAggregator(consent.customerId, consent.aggregatorId);
    }

    // Emit event
    this.eventEmitter.emit('consent.revoked', {
      consentId,
      customerId: consent.customerId,
      aggregatorId: consent.aggregatorId,
    });

    this.logger.log(`Consent revoked: ${consentId}`);
    return updated;
  }

  /**
   * Get consents by filter
   */
  async getConsents(filter: ConsentFilterDto): Promise<ConsentRecord[]> {
    const db = this.firebaseAdminService.firestore();
    let query = db.collection('customer_consents');

    if (filter.customerId) {
      query = query.where('customerId', '==', filter.customerId) as any;
    }

    if (filter.aggregatorId) {
      query = query.where('aggregatorId', '==', filter.aggregatorId) as any;
    }

    if (filter.consentType) {
      query = query.where('consentType', '==', filter.consentType) as any;
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status) as any;
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as ConsentRecord);
  }

  /**
   * Get consent history for customer
   */
  async getCustomerConsentHistory(customerId: string): Promise<ConsentRecord[]> {
    return this.getConsents({ customerId });
  }

  /**
   * Get pending consents for aggregator
   */
  async getPendingConsents(aggregatorId: string): Promise<ConsentRecord[]> {
    return this.getConsents({ aggregatorId, status: ConsentStatus.PENDING });
  }

  /**
   * Check if customer has granted specific consent
   */
  async hasConsent(
    customerId: string,
    aggregatorId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    const consents = await this.getConsents({
      customerId,
      aggregatorId,
      consentType,
      status: ConsentStatus.GRANTED,
    });

    return consents.length > 0;
  }

  /**
   * Send consent request via specified channel
   */
  private async sendConsentRequest(consent: ConsentRecord, message?: string): Promise<void> {
    const defaultMessage =
      message ||
      `${consent.aggregatorName} has requested your consent for ${consent.consentType}. Please respond within 30 days.`;

    // Always persist an in-app notification so the customer is reachable regardless
    // of channel. SMS/email additionally emit events for their (future) providers.
    if (consent.customerId) {
      await this.notificationService.broadcast({
        title: 'Consent request',
        message: defaultMessage,
        userIds: [consent.customerId],
      });
    }

    switch (consent.channel) {
      case ConsentChannel.SMS:
        // ponytail: SMS provider (MSG91/Twilio) not wired yet — event carries the
        // payload for a future consumer; in-app notification above is the real delivery.
        this.logger.log(`SMS consent request queued for: ${consent.customerPhone}`);
        this.eventEmitter.emit('consent.sms', {
          phone: consent.customerPhone,
          message: defaultMessage,
          consentId: consent.id,
        });
        break;

      case ConsentChannel.EMAIL:
        // ponytail: email provider (SendGrid) not wired yet — see note above.
        this.logger.log(`Email consent request queued for: ${consent.customerEmail}`);
        this.eventEmitter.emit('consent.email', {
          email: consent.customerEmail,
          message: defaultMessage,
          consentId: consent.id,
        });
        break;

      case ConsentChannel.IN_APP:
        // Delivered via the in-app notification above.
        break;

      case ConsentChannel.MANUAL:
        // No automatic sending, manual follow-up required
        this.logger.log(`Manual consent request created: ${consent.id}`);
        break;
    }
  }

  /**
   * Link customer to aggregator
   */
  private async linkCustomerToAggregator(
    customerId: string,
    aggregatorId: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    
    await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(customerId)
      .update({
        'profileData.managedByAggregatorId': aggregatorId,
        updatedAt: new Date().toISOString(),
      });

    this.logger.log(`Customer ${customerId} linked to aggregator ${aggregatorId}`);
  }

  /**
   * Unlink customer from aggregator
   */
  private async unlinkCustomerFromAggregator(
    customerId: string,
    aggregatorId: string,
  ): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    
    // Verify current linkage
    const customerDoc = await db.collection(ROOT_COLLECTIONS.users).doc(customerId).get();
    const customerData = customerDoc.data();

    if (customerData?.profileData?.managedByAggregatorId === aggregatorId) {
      await db
        .collection(ROOT_COLLECTIONS.users)
        .doc(customerId)
        .update({
          'profileData.managedByAggregatorId': null,
          updatedAt: new Date().toISOString(),
        });

      this.logger.log(`Customer ${customerId} unlinked from aggregator ${aggregatorId}`);
    }
  }

  /**
   * Auto-expire old pending consents (scheduled job)
   */
  async expirePendingConsents(): Promise<number> {
    const db = this.firebaseAdminService.firestore();
    const now = new Date().toISOString();

    const expiredConsents = await db
      .collection('customer_consents')
      .where('status', '==', ConsentStatus.PENDING)
      .where('expiresAt', '<', now)
      .get();

    let count = 0;
    for (const doc of expiredConsents.docs) {
      await doc.ref.update({
        status: ConsentStatus.DENIED,
        notes: 'Auto-expired due to no response',
        updatedAt: now,
      });
      count++;
    }

    this.logger.log(`Expired ${count} pending consents`);
    return count;
  }
}
