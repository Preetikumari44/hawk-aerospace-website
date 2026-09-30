import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  applicationDefault,
  cert,
  deleteApp,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

import { getFirebaseAdminRuntimeConfig } from '../common/config/firebase.config';

@Injectable()
export class FirebaseAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private appInstance: App | null = null;
  private firestoreInstance: Firestore | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {
    this.bootstrap();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  auth(): Auth {
    return getAuth(this.getAuthenticatedApp());
  }

  firestore(): Firestore {
    if (this.firestoreInstance) {
      return this.firestoreInstance;
    }

    const app = this.getAuthenticatedApp();
    const databaseId = this.configService.get<string>('FIREBASE_DATABASE_ID');
    const firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

    firestore.settings({
      ignoreUndefinedProperties: true,
    });

    this.firestoreInstance = firestore;
    return firestore;
  }

  messaging() {
    return getMessaging(this.getAuthenticatedApp());
  }

  storage() {
    return getStorage(this.getAuthenticatedApp());
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    return this.auth().verifyIdToken(token);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.appInstance) {
      await deleteApp(this.appInstance);
    }
  }

  private bootstrap(): void {
    const runtimeConfig = getFirebaseAdminRuntimeConfig(this.configService);

    if (!runtimeConfig) {
      this.logger.warn(
        'Firebase Admin runtime configuration is missing. Firestore/Auth/FCM features are disabled until env vars are provided.',
      );
      return;
    }

    const existingApp = getApps().find((app) => app.name === 'hawk-backend');
    this.appInstance =
      existingApp ??
      initializeApp(
        {
          credential: runtimeConfig.privateKey
            ? cert({
              projectId: runtimeConfig.projectId,
              clientEmail: runtimeConfig.clientEmail,
              privateKey: runtimeConfig.privateKey,
            })
            : applicationDefault(),
          projectId: runtimeConfig.projectId,
          storageBucket: runtimeConfig.storageBucket,
        },
        'hawk-backend',
      );

    this.enabled = true;
    this.logger.log(
      `Firebase Admin initialized (project=${runtimeConfig.projectId}, storageBucket=${runtimeConfig.storageBucket})`,
    );
  }

  /** Active storage bucket name (from FIREBASE_STORAGE_BUCKET). Useful for diagnostics. */
  getStorageBucketName(): string {
    try {
      return this.storage().bucket().name;
    } catch {
      return this.configService.get<string>('FIREBASE_STORAGE_BUCKET') ?? '(unknown)';
    }
  }

  private getAuthenticatedApp(): App {
    if (!this.appInstance) {
      throw new ServiceUnavailableException('Firebase Admin is not configured.');
    }

    return this.appInstance;
  }
}