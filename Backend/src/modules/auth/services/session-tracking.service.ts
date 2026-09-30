import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';

import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';

export interface UserSession {
  sessionId: string;
  userId: string;
  deviceInfo: {
    deviceId?: string;
    deviceName: string;
    platform: 'ios' | 'android' | 'web';
    os?: string;
    browser?: string;
  };
  loginInfo: {
    ipAddress: string;
    userAgent: string;
    location?: string;
    method: 'phone' | 'email';
  };
  tokens: {
    accessTokenHash: string;
    refreshTokenHash: string;
  };
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface CreateSessionParams {
  uid: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    platform: 'ios' | 'android' | 'web';
    os?: string;
    browser?: string;
  };
  method: 'phone' | 'email';
  location?: string;
}

@Injectable()
export class SessionTrackingService {
  private readonly logger = new Logger(SessionTrackingService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  /**
   * Create a new user session
   */
  async createSession(params: CreateSessionParams): Promise<string> {
    try {
      const sessionId = randomUUID();
      const now = new Date().toISOString();

      const session: UserSession = {
        sessionId,
        userId: params.uid,
        deviceInfo: {
          platform: params.deviceInfo?.platform || 'web',
          deviceName: params.deviceInfo?.deviceName || 'Unknown Device',
          ...(params.deviceInfo?.deviceId && { deviceId: params.deviceInfo.deviceId }),
          ...(params.deviceInfo?.os && { os: params.deviceInfo.os }),
          ...(params.deviceInfo?.browser && { browser: params.deviceInfo.browser }),
        },
        loginInfo: {
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          ...(params.location && { location: params.location }),
          method: params.method,
        },
        tokens: {
          accessTokenHash: this.hashToken(params.accessToken),
          refreshTokenHash: this.hashToken(params.refreshToken),
        },
        status: 'active',
        createdAt: now,
        lastActivityAt: now,
        expiresAt: this.getTokenExpiry(params.refreshToken),
      };

      await this.firebaseAdmin.firestore()
        .collection(`users/${params.uid}/sessions`)
        .doc(sessionId)
        .set(session);

      this.logger.log(
        `Session ${sessionId} created for user ${params.uid} (${params.deviceInfo?.platform || 'web'})`,
      );

      return sessionId;
    } catch (error) {
      this.logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Update session activity timestamp (on token refresh)
   */
  async updateSessionActivity(uid: string, refreshTokenHash: string): Promise<void> {
    try {
      // Find session by refresh token hash
      const snapshot = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/sessions`)
        .where('tokens.refreshTokenHash', '==', refreshTokenHash)
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        this.logger.warn(`No active session found for user ${uid} with given refresh token`);
        return;
      }

      const batch = this.firebaseAdmin.firestore().batch();
      const now = new Date().toISOString();

      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { lastActivityAt: now });
      });

      await batch.commit();
      this.logger.debug(`Updated activity for ${snapshot.docs.length} session(s)`);
    } catch (error) {
      this.logger.error('Error updating session activity:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    uid: string,
    sessionId: string,
    reason?: string,
  ): Promise<void> {
    try {
      const sessionRef = this.firebaseAdmin.firestore()
        .collection(`users/${uid}/sessions`)
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        this.logger.warn(`Session ${sessionId} not found for user ${uid}`);
        return;
      }

      await sessionRef.update({
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedReason: reason || 'Manual revocation',
      });

      this.logger.log(`Session ${sessionId} revoked for user ${uid}`);
    } catch (error) {
      this.logger.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeAllSessionsExceptCurrent(
    uid: string,
    currentSessionId: string,
  ): Promise<number> {
    try {
      const snapshot = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/sessions`)
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.firebaseAdmin.firestore().batch();
      const now = new Date().toISOString();
      let count = 0;

      snapshot.docs
        .filter((doc: any) => doc.id !== currentSessionId)
        .forEach((doc: any) => {
          batch.update(doc.ref, {
            status: 'revoked',
            revokedAt: now,
            revokedReason: 'Logged out from all other devices',
          });
          count++;
        });

      if (count > 0) {
        await batch.commit();
        this.logger.log(`Revoked ${count} session(s) for user ${uid}`);
      }

      return count;
    } catch (error) {
      this.logger.error('Error revoking sessions:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(uid: string, reason?: string): Promise<number> {
    try {
      const snapshot = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/sessions`)
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.firebaseAdmin.firestore().batch();
      const now = new Date().toISOString();

      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          status: 'revoked',
          revokedAt: now,
          revokedReason: reason || 'All sessions revoked',
        });
      });

      await batch.commit();
      this.logger.log(`Revoked ${snapshot.docs.length} session(s) for user ${uid}`);

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error('Error revoking all sessions:', error);
      throw error;
    }
  }

  /**
   * Get user sessions (active only by default)
   */
  async getUserSessions(
    uid: string,
    includeInactive = false,
  ): Promise<UserSession[]> {
    try {
      let query: any = this.firebaseAdmin.firestore().collection(`users/${uid}/sessions`);

      if (!includeInactive) {
        query = query.where('status', '==', 'active');
      }

      const snapshot = await query.orderBy('lastActivityAt', 'desc').limit(50).get();

      return snapshot.docs.map((doc: any) => doc.data() as UserSession);
    } catch (error) {
      this.logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Get a specific session
   */
  async getSession(uid: string, sessionId: string): Promise<UserSession | null> {
    try {
      const doc = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/sessions`)
        .doc(sessionId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as UserSession;
    } catch (error) {
      this.logger.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Mark expired sessions as expired (cleanup job)
   */
  async markExpiredSessions(): Promise<number> {
    try {
      const now = new Date().toISOString();

      // Query sessions that are active but past expiry
      const snapshot = await this.firebaseAdmin.firestore()
        .collectionGroup('sessions')
        .where('status', '==', 'active')
        .where('expiresAt', '<', now)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.firebaseAdmin.firestore().batch();

      snapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { status: 'expired' });
      });

      await batch.commit();
      this.logger.log(`Marked ${snapshot.docs.length} session(s) as expired`);

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error('Error marking expired sessions:', error);
      throw error;
    }
  }

  /**
   * Delete old sessions (cleanup job)
   */
  async deleteOldSessions(daysOld = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffIso = cutoffDate.toISOString();

      const snapshot = await this.firebaseAdmin.firestore()
        .collectionGroup('sessions')
        .where('createdAt', '<', cutoffIso)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.firebaseAdmin.firestore().batch();

      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      this.logger.log(`Deleted ${snapshot.docs.length} old session(s)`);

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error('Error deleting old sessions:', error);
      throw error;
    }
  }

  /**
   * Hash token for storage (first 32 chars for correlation)
   */
  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token.substring(0, 32))
      .digest('hex');
  }

  /**
   * Extract expiry from JWT token
   */
  private getTokenExpiry(token: string): string {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        // Default to 7 days from now
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString(),
      );

      if (payload.exp) {
        return new Date(payload.exp * 1000).toISOString();
      }

      // Default to 7 days from now
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } catch (error) {
      this.logger.error('Error parsing token expiry:', error);
      // Default to 7 days from now
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
}
