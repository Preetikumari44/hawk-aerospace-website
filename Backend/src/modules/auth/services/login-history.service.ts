import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  timestamp: string;
  method: 'phone' | 'email';
  status: 'success' | 'failed' | 'blocked';
  failureReason?:
    | 'invalid_credentials'
    | 'invalid_otp'
    | 'account_blocked'
    | 'account_suspended'
    | 'account_pending'
    | 'rate_limited'
    | 'account_locked'
    | 'token_expired'
    | 'other';
  ipAddress: string;
  userAgent: string;
  deviceInfo?: {
    platform: 'ios' | 'android' | 'web';
    os?: string;
    browser?: string;
    deviceName?: string;
  };
  location?: string;
  sessionId?: string; // if successful login
}

export interface LogLoginAttemptParams {
  userId: string;
  method: 'phone' | 'email';
  status: 'success' | 'failed' | 'blocked';
  failureReason?: LoginHistoryEntry['failureReason'];
  ipAddress: string;
  userAgent: string;
  deviceInfo?: LoginHistoryEntry['deviceInfo'];
  location?: string;
  sessionId?: string;
}

@Injectable()
export class LoginHistoryService {
  private readonly logger = new Logger(LoginHistoryService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  /**
   * Log a login attempt (success or failure)
   */
  async logAttempt(params: LogLoginAttemptParams): Promise<string> {
    try {
      const id = randomUUID();
      
      // Build entry without undefined values
      const entry: Partial<LoginHistoryEntry> = {
        id,
        userId: params.userId,
        timestamp: new Date().toISOString(),
        method: params.method,
        status: params.status,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      };

      // Only add optional fields if they have values
      if (params.failureReason) {
        entry.failureReason = params.failureReason;
      }

      if (params.deviceInfo) {
        // Filter out undefined values from deviceInfo
        const cleanDeviceInfo: any = {
          platform: params.deviceInfo.platform,
        };
        if (params.deviceInfo.os) cleanDeviceInfo.os = params.deviceInfo.os;
        if (params.deviceInfo.browser) cleanDeviceInfo.browser = params.deviceInfo.browser;
        if (params.deviceInfo.deviceName) cleanDeviceInfo.deviceName = params.deviceInfo.deviceName;
        
        entry.deviceInfo = cleanDeviceInfo;
      }

      if (params.location) {
        entry.location = params.location;
      }

      if (params.sessionId) {
        entry.sessionId = params.sessionId;
      }

      await this.firebaseAdmin.firestore()
        .collection(`users/${params.userId}/login_history`)
        .doc(id)
        .set(entry);

      this.logger.log(
        `Login ${params.status} logged for user ${params.userId} from ${params.ipAddress}`,
      );

      return id;
    } catch (error) {
      this.logger.error('Error logging login attempt:', error);
      // Don't throw - login history is non-critical
      return '';
    }
  }

  /**
   * Get user's login history
   */
  async getUserLoginHistory(
    uid: string,
    options?: {
      limit?: number;
      status?: 'success' | 'failed' | 'blocked';
      startDate?: string;
      endDate?: string;
    },
  ): Promise<LoginHistoryEntry[]> {
    try {
      let query: any = this.firebaseAdmin.firestore().collection(`users/${uid}/login_history`);

      if (options?.status) {
        query = query.where('status', '==', options.status);
      }

      if (options?.startDate) {
        query = query.where('timestamp', '>=', options.startDate);
      }

      if (options?.endDate) {
        query = query.where('timestamp', '<=', options.endDate);
      }

      query = query.orderBy('timestamp', 'desc').limit(options?.limit || 50);

      const snapshot = await query.get();

      return snapshot.docs.map((doc: any) => doc.data() as LoginHistoryEntry);
    } catch (error) {
      this.logger.error('Error getting login history:', error);
      throw error;
    }
  }

  /**
   * Get recent failed login attempts count
   */
  async getRecentFailedAttempts(
    uid: string,
    minutesAgo: number,
  ): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

      const snapshot = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/login_history`)
        .where('status', '==', 'failed')
        .where('timestamp', '>=', cutoffTime)
        .get();

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error('Error getting recent failed attempts:', error);
      return 0;
    }
  }

  /**
   * Get login statistics for a user
   */
  async getLoginStats(uid: string, daysAgo = 30): Promise<{
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    blockedAttempts: number;
    uniqueIPs: number;
    uniqueDevices: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      const cutoffIso = cutoffDate.toISOString();

      const snapshot = await this.firebaseAdmin.firestore()
        .collection(`users/${uid}/login_history`)
        .where('timestamp', '>=', cutoffIso)
        .get();

      const entries = snapshot.docs.map((doc: any) => doc.data() as LoginHistoryEntry);

      const uniqueIPs = new Set(entries.map((e: any) => e.ipAddress)).size;
      const uniqueDevices = new Set(
        entries.map((e: any) => `${e.deviceInfo?.platform}-${e.deviceInfo?.deviceName}`),
      ).size;

      return {
        totalLogins: entries.length,
        successfulLogins: entries.filter((e: any) => e.status === 'success').length,
        failedLogins: entries.filter((e: any) => e.status === 'failed').length,
        blockedAttempts: entries.filter((e: any) => e.status === 'blocked').length,
        uniqueIPs,
        uniqueDevices,
      };
    } catch (error) {
      this.logger.error('Error getting login stats:', error);
      throw error;
    }
  }

  /**
   * Delete old login history (cleanup job)
   */
  async deleteOldHistory(daysOld = 180): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffIso = cutoffDate.toISOString();

      const snapshot = await this.firebaseAdmin.firestore()
        .collectionGroup('login_history')
        .where('timestamp', '<', cutoffIso)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.firebaseAdmin.firestore().batch();

      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      this.logger.log(`Deleted ${snapshot.docs.length} old login history entries`);

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error('Error deleting old login history:', error);
      throw error;
    }
  }
}
