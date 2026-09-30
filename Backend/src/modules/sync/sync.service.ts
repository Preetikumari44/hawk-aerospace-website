import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type {
  DocumentData,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase-admin/firestore';
import type { Connection } from 'mongoose';

import {
  ROOT_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

interface MirrorConfig {
  firestoreLabel: string;
  mongoCollection: string;
  idField: string;
  parentField?: string;
}

interface HistoryEntry {
  value: unknown;
  updatedAt: string;
}

interface HistoryField {
  current: unknown;
  history: HistoryEntry[];
}

const HISTORICAL_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  users: ['name', 'email', 'phone', 'location'],
  booking: [
    'address',
    'area',
    'cropType',
    'serviceType',
    'droneTier',
    'location',
    'couponCode',
    'priceEstimation',
    'finalPrice',
    'paymentMethod',
    'paymentStatus',
    'status',
    'scheduledDate',
  ],
  drones: [
    'model',
    'type',
    'status',
    'specs',
    'totalFlightHours',
    'lastMaintenance',
    'nextMaintenanceDue',
  ],
};

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private readonly unsubscribers: Array<() => void> = [];
  private startedAt: string | null = null;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  onModuleInit(): void {
    if (this.configService.get<boolean>('FIRESTORE_SYNC_ENABLED', false)) {
      this.start();
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start() {
    if (this.unsubscribers.length > 0) {
      return this.getStatus();
    }

    const firestore = this.firebaseAdminService.firestore();
    const rootConfigs: MirrorConfig[] = [
      { firestoreLabel: ROOT_COLLECTIONS.users, mongoCollection: 'users', idField: 'uid' },
      { firestoreLabel: ROOT_COLLECTIONS.coupons, mongoCollection: 'coupons', idField: 'id' },
      {
        firestoreLabel: ROOT_COLLECTIONS.missions,
        mongoCollection: 'missions',
        idField: 'requestId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.pricingLocks,
        mongoCollection: 'pricing_locks',
        idField: 'pricingId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.pricingConfigs,
        mongoCollection: 'pricing_configs',
        idField: 'id',
      },
      { firestoreLabel: ROOT_COLLECTIONS.payments, mongoCollection: 'payments', idField: 'id' },
      {
        firestoreLabel: ROOT_COLLECTIONS.maintenanceLogs,
        mongoCollection: 'maintenance_logs',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.incidents,
        mongoCollection: 'incidents',
        idField: 'incidentId',
      },
      { firestoreLabel: ROOT_COLLECTIONS.subadmins, mongoCollection: 'subadmins', idField: 'uid' },
      {
        firestoreLabel: ROOT_COLLECTIONS.adminSettings,
        mongoCollection: 'admin_settings',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.revenueSnapshots,
        mongoCollection: 'revenue_snapshots',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.bookingHistory,
        mongoCollection: 'booking_history',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.rewardPoints,
        mongoCollection: 'reward_points',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.rewardRedemptions,
        mongoCollection: 'reward_redemptions',
        idField: 'id',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.delegatedBookings,
        mongoCollection: 'delegated_bookings',
        idField: 'bookingId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.serviceTickets,
        mongoCollection: 'service_tickets',
        idField: 'ticketId',
      },
      // Additional collections from constants
      {
        firestoreLabel: ROOT_COLLECTIONS.maintenanceTickets,
        mongoCollection: 'maintenanceTickets',
        idField: 'ticketId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.pilots,
        mongoCollection: 'pilots',
        idField: 'pilotId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.fleetManagers,
        mongoCollection: 'fleetManagers',
        idField: 'fleetManagerId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.pilotRequests,
        mongoCollection: 'pilotRequests',
        idField: 'requestId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.supportTickets,
        mongoCollection: 'supportTickets',
        idField: 'ticketId',
      },
      {
        firestoreLabel: ROOT_COLLECTIONS.bookingProgress,
        mongoCollection: 'booking_progress',
        idField: 'bookingId',
      },
    ];
    const collectionGroupConfigs: Array<MirrorConfig & { group: string }> = [
      {
        firestoreLabel: USER_SUBCOLLECTIONS.bookings,
        group: USER_SUBCOLLECTIONS.bookings,
        mongoCollection: 'booking',
        idField: 'id',
        parentField: 'userId',
      },
      {
        firestoreLabel: USER_SUBCOLLECTIONS.drones,
        group: USER_SUBCOLLECTIONS.drones,
        mongoCollection: 'drones',
        idField: 'id',
        parentField: 'userId',
      },
      {
        firestoreLabel: USER_SUBCOLLECTIONS.transactions,
        group: USER_SUBCOLLECTIONS.transactions,
        mongoCollection: 'transactions',
        idField: 'id',
        parentField: 'userId',
      },
      {
        firestoreLabel: USER_SUBCOLLECTIONS.notifications,
        group: USER_SUBCOLLECTIONS.notifications,
        mongoCollection: 'notifications',
        idField: 'id',
        parentField: 'userId',
      },
      {
        firestoreLabel: USER_SUBCOLLECTIONS.invoices,
        group: USER_SUBCOLLECTIONS.invoices,
        mongoCollection: 'invoice',
        idField: 'id',
        parentField: 'userId',
      },
      {
        firestoreLabel: USER_SUBCOLLECTIONS.adminActions,
        group: USER_SUBCOLLECTIONS.adminActions,
        mongoCollection: 'admin_actions',
        idField: 'id',
        parentField: 'adminUserId',
      },
    ];

    rootConfigs.forEach((config) => {
      this.watchQuery(firestore.collection(config.firestoreLabel), config);
    });
    collectionGroupConfigs.forEach((config) => {
      this.watchQuery(firestore.collectionGroup(config.group), config);
    });
    this.startedAt = new Date().toISOString();
    return this.getStatus();
  }

  stop() {
    while (this.unsubscribers.length > 0) {
      this.unsubscribers.pop()?.();
    }
    this.startedAt = null;
    return this.getStatus();
  }

  getStatus() {
    return {
      running: this.unsubscribers.length > 0,
      watchers: this.unsubscribers.length,
      startedAt: this.startedAt,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      autoStartEnabled: this.configService.get<boolean>('FIRESTORE_SYNC_ENABLED', false),
    };
  }

  private watchQuery(query: Query<DocumentData>, config: MirrorConfig): void {
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        void this.processSnapshot(snapshot, config).catch((error: unknown) => {
          this.lastError = error instanceof Error ? error.message : String(error);
          this.logger.error(`Sync failed for ${config.firestoreLabel}: ${this.lastError}`);
        });
      },
      (error) => {
        this.lastError = error.message;
        this.logger.error(`Listener failed for ${config.firestoreLabel}: ${error.message}`);
      },
    );

    this.unsubscribers.push(unsubscribe);
  }

  private async processSnapshot(
    snapshot: QuerySnapshot<DocumentData>,
    config: MirrorConfig,
  ): Promise<void> {
    for (const change of snapshot.docChanges()) {
      const data = change.doc.data();
      const mirrorId = this.resolveMirrorId(change.doc, data, config);
      const collection = this.connection.collection(config.mongoCollection);

      if (change.type === 'removed') {
        await collection.deleteOne({ [config.idField]: mirrorId });
        continue;
      }

      const existing = (await collection.findOne({
        [config.idField]: mirrorId,
      })) as Record<string, unknown> | null;
      const nextDocument = this.buildMirrorDocument(change.doc, data, config, existing);
      await collection.updateOne(
        { [config.idField]: mirrorId },
        { $set: nextDocument },
        { upsert: true },
      );
      this.lastSyncedAt = new Date().toISOString();
    }
  }

  private buildMirrorDocument(
    doc: QueryDocumentSnapshot<DocumentData>,
    data: DocumentData,
    config: MirrorConfig,
    existing: Record<string, unknown> | null,
  ): Record<string, unknown> {
    const syncedAt = new Date().toISOString();
    const mirrorId = this.resolveMirrorId(doc, data, config);
    const document: Record<string, unknown> = {
      ...data,
      [config.idField]: mirrorId,
      firestoreId: doc.id,
      sourcePath: doc.ref.path,
      syncedAt,
    };
    const parentId = doc.ref.parent.parent?.id;

    if (config.parentField && parentId) {
      document[config.parentField] = parentId;
    }

    if (config.mongoCollection === 'users') {
      const verification = this.asRecord(data.verification);
      const profileData = this.asRecord(data.profileData);
      document.verified = verification?.isVerified === true;
      document.documents = verification?.documents ?? [];
      document.location = profileData?.location ?? data.location ?? null;
    }

    const historicalFields = HISTORICAL_FIELDS_BY_COLLECTION[config.mongoCollection] ?? [];
    historicalFields.forEach((field) => {
      document[field] = this.mergeHistoryField(existing?.[field], document[field], syncedAt);
    });

    return document;
  }

  private mergeHistoryField(
    existingValue: unknown,
    nextValue: unknown,
    updatedAt: string,
  ): HistoryField {
    const normalizedNext = nextValue ?? null;
    const existingHistoryField = this.asHistoryField(existingValue);

    if (!existingHistoryField) {
      return { current: normalizedNext, history: [] };
    }

    if (this.valuesEqual(existingHistoryField.current, normalizedNext)) {
      return {
        current: normalizedNext,
        history: existingHistoryField.history,
      };
    }

    return {
      current: normalizedNext,
      history: [
        ...existingHistoryField.history,
        {
          value: existingHistoryField.current,
          updatedAt,
        },
      ],
    };
  }

  private asHistoryField(value: unknown): HistoryField | null {
    if (!this.isRecord(value) || !('current' in value)) {
      return null;
    }

    const history = Array.isArray(value.history) ? value.history : [];
    return {
      current: value.current,
      history: history.filter((entry): entry is HistoryEntry => this.isHistoryEntry(entry)),
    };
  }

  private isHistoryEntry(value: unknown): value is HistoryEntry {
    return this.isRecord(value) && 'value' in value && typeof value.updatedAt === 'string';
  }

  private resolveMirrorId(
    doc: QueryDocumentSnapshot<DocumentData>,
    data: DocumentData,
    config: MirrorConfig,
  ): string {
    const value: unknown = (data as Record<string, unknown>)[config.idField];
    return typeof value === 'string' && value.length > 0 ? value : doc.id;
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return this.isRecord(value) ? value : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
