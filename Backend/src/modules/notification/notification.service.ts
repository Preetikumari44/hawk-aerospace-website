import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference } from 'firebase-admin/firestore';

import {
  ROOT_COLLECTIONS,
  USER_SUBCOLLECTIONS,
} from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreNotificationDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { SendNotificationDto } from './dto/send-notification.dto';
import {
  NotificationRequestDto,
  NotificationResult,
  NotificationTargetDto,
} from './dto/notification-request.dto';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPriority,
} from './interfaces/notification-provider.interface';
import { FcmProvider } from './providers/fcm.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private providers: Map<NotificationChannel, INotificationProvider> = new Map();

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly fcmProvider: FcmProvider,
    private readonly whatsappProvider: WhatsAppCloudProvider,
    private readonly sendGridProvider: SendGridProvider,
  ) {
    // Register providers (Twilio is NOT used — Firebase handles OTP,
    // WhatsApp Cloud API handles referral invites).
    this.providers.set(NotificationChannel.PUSH, fcmProvider);
    this.providers.set(NotificationChannel.WHATSAPP, whatsappProvider);
    this.providers.set(NotificationChannel.EMAIL, sendGridProvider);
    this.logger.log('Notification providers initialized');
  }

  /**
   * Multi-channel notification dispatch
   * Main entry point for sending notifications across multiple channels
   */
  async dispatch(request: NotificationRequestDto): Promise<NotificationResult[]> {
    const { channels, targets, priority, subject, body, data } = request;

    this.logger.log(
      `Dispatching notification to ${channels.join(', ')} with priority ${priority}`,
    );

    // Resolve targets (uids, phones, emails, FCM tokens)
    const resolvedTargets = await this.resolveTargetsForDispatch(targets);

    // Enforce user notification preferences: users who turned off the App
    // (push) or Email master switch — or the specific category in
    // data.category (e.g. 'bookingUpdates') — are excluded from those
    // channels. Users with no stored prefs default to opted-in.
    const category = (data as any)?.category as string | undefined;
    const filteredTargets = await this.applyNotificationPreferences(
      resolvedTargets,
      channels,
      category,
    );

    const results: NotificationResult[] = [];

    // Dispatch to each external channel (PUSH, SMS, EMAIL)
    for (const channel of channels) {
      if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.WEBSOCKET) {
        continue; // Handle these separately below
      }

      const provider = this.providers.get(channel);
      if (!provider) {
        this.logger.warn(`Provider not configured for channel: ${channel}`);
        continue;
      }

      // Route to appropriate target list
      const channelTargets = this.getChannelTargets(channel, filteredTargets);

      if (channelTargets.length === 0) {
        this.logger.debug(`No targets for channel: ${channel}`);
        continue;
      }

      try {
        // Send to each target (providers handle single or bulk)
        let sent = 0;
        let failed = 0;

        for (const target of channelTargets) {
          const response = await provider.send({
            to: target,
            subject: subject || 'Hawk Aerosystem',
            body: body || '',
            data,
            priority,
          });

          if (response.success) {
            sent++;
            this.logger.debug(`${channel} sent to ${target}: ${response.messageId}`);
          } else {
            failed++;
            this.logger.error(`${channel} failed for ${target}: ${response.error}`);
          }
        }

        results.push({ channel, sent, failed });
      } catch (error: any) {
        this.logger.error(`${channel} dispatch error: ${error.message}`, error.stack);
        results.push({ channel, sent: 0, failed: channelTargets.length, error: error.message });
      }
    }

    // Handle IN_APP + WebSocket (existing logic)
    if (
      channels.includes(NotificationChannel.IN_APP) ||
      channels.includes(NotificationChannel.WEBSOCKET)
    ) {
      const uids = filteredTargets.uids;
      if (uids.length > 0) {
        await this.saveInApp(uids, { title: subject || 'Notification', message: body || '' });
        this.broadcastWebSocket(uids, { title: subject || 'Notification', message: body || '' });
        results.push({
          channel: NotificationChannel.IN_APP,
          sent: uids.length,
          failed: 0,
        });
      }
    }

    return results;
  }

  /**
   * Resolve targets for dispatch (fetch user data for phone/email/tokens)
   */
  /**
   * Master-switch preference keys per channel. Both the new
   * (`pushNotifications` / `emailNotifications`) and legacy
   * (`push` / `email` / `sms`) keys are honoured; unset means opted-in.
   */
  private isChannelAllowed(
    prefs: Record<string, any>,
    channel: NotificationChannel,
  ): boolean {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        if (prefs[k] === false) return false;
      }
      return true;
    };
    switch (channel) {
      case NotificationChannel.PUSH:
      case NotificationChannel.IN_APP:
      case NotificationChannel.WEBSOCKET:
        return pick('pushNotifications', 'push');
      case NotificationChannel.EMAIL:
        return pick('emailNotifications', 'email');
      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        // WhatsApp/SMS kept for later configuration; SMS prefs still honoured.
        return pick('smsNotifications', 'sms', 'whatsappNotifications', 'whatsapp');
      default:
        return true;
    }
  }

  /**
   * Load merged notification preferences for a user from every location
   * they may be stored (users doc, profileData, customers doc).
   * Missing keys default to opted-in.
   */
  private async getUserNotificationPrefs(uid: string): Promise<Record<string, any>> {
    try {
      const userDoc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(uid)
        .get();
      const userData = userDoc.exists ? (userDoc.data() as any) : {};
      const merged: Record<string, any> = {
        ...((userData?.notificationSettings as any) || {}),
        ...((userData?.profileData?.notificationSettings as any) || {}),
      };
      try {
        const customerDoc = await this.firebaseAdminService
          .firestore()
          .collection('customers')
          .doc(uid)
          .get();
        if (customerDoc.exists) {
          Object.assign(merged, (customerDoc.data() as any)?.notificationSettings || {});
        }
      } catch {
        // customers collection may not exist for non-customer roles
      }
      return merged;
    } catch (error: any) {
      this.logger.debug(`Could not load notification prefs for ${uid}: ${error.message}`);
      return {};
    }
  }

  /**
   * Filter resolved targets by each user's stored notification preferences.
   * Direct phones/emails/tokens passed without userIds cannot be mapped to
   * a user, so they are always sent (explicit targeting).
   */
  private async applyNotificationPreferences(
    resolved: { uids: string[]; phones: string[]; emails: string[]; fcmTokens: string[] },
    channels: NotificationChannel[],
    category?: string,
  ): Promise<{ uids: string[]; phones: string[]; emails: string[]; fcmTokens: string[] }> {
    if (!resolved.uids || resolved.uids.length === 0) return resolved;

    const allowedUids: string[] = [];
    const allowedPhones: string[] = [];
    const allowedEmails: string[] = [];
    const allowedTokens: string[] = [];

    for (const uid of resolved.uids) {
      const prefs = await this.getUserNotificationPrefs(uid);

      // Category-level opt-out (e.g. bookingUpdates, promotionalMessages,
      // marketplaceUpdates, missionUpdates, priceAlerts).
      if (category && prefs[category] === false) {
        this.logger.debug(`Skipping ${uid}: opted out of ${category}`);
        continue;
      }

      const wantsApp = [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET].some(
        (c) => channels.includes(c),
      )
        ? this.isChannelAllowed(prefs, NotificationChannel.PUSH)
        : false;
      const wantsEmail =
        channels.includes(NotificationChannel.EMAIL) &&
        this.isChannelAllowed(prefs, NotificationChannel.EMAIL);

      if (!wantsApp && !wantsEmail) {
        this.logger.debug(`Skipping ${uid}: all requested channels disabled in prefs`);
        continue;
      }

      allowedUids.push(uid);

      // Re-resolve this user's contacts so per-user filtering is exact.
      try {
        const userDoc = await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.users)
          .doc(uid)
          .get();
        const userData = userDoc.exists ? (userDoc.data() as any) : {};
        if (wantsApp && Array.isArray(userData?.fcmTokens)) {
          for (const t of userData.fcmTokens) {
            if (t?.token) allowedTokens.push(t.token);
          }
        }
        if (wantsEmail && userData?.email) allowedEmails.push(userData.email);
        if (
          channels.includes(NotificationChannel.SMS) ||
          channels.includes(NotificationChannel.WHATSAPP)
        ) {
          if (userData?.phone && this.isChannelAllowed(prefs, NotificationChannel.SMS)) {
            allowedPhones.push(userData.phone);
          }
        }
      } catch {
        // If contact re-resolution fails, keep the uid for IN_APP at least.
      }
    }

    // Preserve explicitly-passed direct targets (no uid mapping possible).
    const direct = (resolved as any).__direct || { phones: [], emails: [], fcmTokens: [] };

    return {
      uids: allowedUids,
      phones: [...allowedPhones, ...(direct.phones || [])],
      emails: [...allowedEmails, ...(direct.emails || [])],
      fcmTokens: [...allowedTokens, ...(direct.fcmTokens || [])],
    };
  }

  private async resolveTargetsForDispatch(
    targets: NotificationTargetDto,
  ): Promise<{
    uids: string[];
    phones: string[];
    emails: string[];
    fcmTokens: string[];
  }> {
    const resolved: any = {
      uids: [...(targets.userIds || [])],
      phones: [...(targets.phones || [])],
      emails: [...(targets.emails || [])],
      fcmTokens: [...(targets.fcmTokens || [])],
      // Snapshot of explicitly-passed direct targets so preference
      // filtering can preserve them (they can't be mapped to a user).
      __direct: {
        phones: [...(targets.phones || [])],
        emails: [...(targets.emails || [])],
        fcmTokens: [...(targets.fcmTokens || [])],
      },
    };

    // If role is specified, fetch users by role
    if (targets.role) {
      const snapshot = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .where('role', '==', targets.role)
        .get();

      for (const doc of snapshot.docs) {
        const userData = doc.data();
        resolved.uids.push(doc.id);
        if (userData.phone) resolved.phones.push(userData.phone);
        if (userData.email) resolved.emails.push(userData.email);
        // Fetch all FCM tokens for the user (multi-device support)
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          userData.fcmTokens.forEach((tokenData: any) => {
            if (tokenData.token) resolved.fcmTokens.push(tokenData.token);
          });
        }
      }
    }
    // If userIds are specified but no phones/emails/tokens, fetch them
    else if (targets.userIds && targets.userIds.length > 0) {
      for (const uid of targets.userIds) {
        const userDoc = await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.users)
          .doc(uid)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.phone) resolved.phones.push(userData.phone);
          if (userData?.email) resolved.emails.push(userData.email);
          // Fetch all FCM tokens for the user (multi-device support)
          if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
            userData.fcmTokens.forEach((tokenData: any) => {
              if (tokenData.token) resolved.fcmTokens.push(tokenData.token);
            });
          }
        }
      }
    }

    return resolved;
  }

  /**
   * Get targets for specific channel
   */
  private getChannelTargets(
    channel: NotificationChannel,
    resolved: { uids: string[]; phones: string[]; emails: string[]; fcmTokens: string[] },
  ): string[] {
    switch (channel) {
      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        return resolved.phones;
      case NotificationChannel.EMAIL:
        return resolved.emails;
      case NotificationChannel.PUSH:
        return resolved.fcmTokens;
      default:
        return [];
    }
  }

  /**
   * Save in-app notification to Firestore
   */
  private async saveInApp(
    uids: string[],
    content: { title: string; message: string },
  ): Promise<void> {
    const now = new Date().toISOString();
    const writes = uids.map((uid) => {
      const ref = this.userNotifications(uid).doc();
      const notification: FirestoreNotificationDocument = {
        id: ref.id,
        uid,
        messages: [{ message: `${content.title}: ${content.message}`, timestamp: now, read: false }],
        createdAt: now,
        updatedAt: now,
      };
      return ref.set(notification);
    });
    await Promise.all(writes);
  }

  /**
   * Broadcast via WebSocket
   */
  private broadcastWebSocket(
    uids: string[],
    content: { title: string; message: string },
  ): void {
    const now = new Date().toISOString();
    for (const uid of uids) {
      this.eventEmitter.emit(WS_EVENTS.NOTIFICATION_NEW, {
        uid,
        title: content.title,
        message: content.message,
        timestamp: now,
      });
    }
  }

  async list(user: CurrentUser) {
    const snapshot = await this.userNotifications(user.uid).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async markRead(id: string, user: CurrentUser) {
    const ref = this.userNotifications(user.uid).doc(id);
    const snapshot = await ref.get();
    const notification = snapshot.data();
    if (!snapshot.exists || !notification)
      throw new NotFoundException(`Notification ${id} not found.`);
    const updated = {
      ...notification,
      messages: notification.messages.map((message) => ({ ...message, read: true })),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(updated, { merge: true });
    return updated;
  }

  async remove(id: string, user: CurrentUser) {
    await this.userNotifications(user.uid).doc(id).delete();
    return { deleted: true };
  }

  /**
   * Register FCM token for a user
   * Called when user opens mobile app
   */
  async registerFcmToken(
    userId: string,
    fcmToken: string,
    platform?: string,
    deviceId?: string,
  ): Promise<void> {
    this.logger.log(`Registering FCM token for user ${userId} (${platform || 'unknown'})`);

    try {
      const userRef = this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.users).doc(userId);

      // Get existing tokens
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      const existingTokens = userData?.fcmTokens || [];

      // Check if token already registered
      if (existingTokens.some((t: any) => t.token === fcmToken)) {
        this.logger.debug(`FCM token already registered for user ${userId}`);
        return;
      }

      // Add new token with metadata
      const newToken = {
        token: fcmToken,
        platform: platform || 'unknown',
        deviceId: deviceId || null,
        registeredAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      await userRef.set(
        {
          fcmTokens: [...existingTokens, newToken],
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.log(`FCM token registered successfully for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to register FCM token for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Unregister FCM token (when user logs out or uninstalls app)
   */
  async unregisterFcmToken(userId: string, fcmToken: string): Promise<void> {
    this.logger.log(`Unregistering FCM token for user ${userId}`);

    try {
      const userRef = this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.users).doc(userId);

      const userDoc = await userRef.get();
      const userData = userDoc.data();
      const existingTokens = userData?.fcmTokens || [];

      // Remove the token
      const updatedTokens = existingTokens.filter((t: any) => t.token !== fcmToken);

      await userRef.set(
        {
          fcmTokens: updatedTokens,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.log(`FCM token unregistered successfully for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to unregister FCM token for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all FCM tokens for a user (for multi-device support)
   */
  async getUserFcmTokens(userId: string): Promise<string[]> {
    try {
      const userDoc = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .doc(userId)
        .get();

      const userData = userDoc.data();
      const tokens = userData?.fcmTokens || [];

      return tokens.map((t: any) => t.token);
    } catch (error: any) {
      this.logger.error(`Failed to get FCM tokens for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Legacy broadcast method (backwards compatible)
   * Routes to new dispatch() method
   */
  async broadcast(dto: SendNotificationDto) {
    let userIds = dto.userIds;

    // "All Users" target: no role and no userIds → resolve every user
    if (!dto.role && (!userIds || userIds.length === 0)) {
      try {
        const snapshot = await this.firebaseAdminService
          .firestore()
          .collection(ROOT_COLLECTIONS.users)
          .get();
        userIds = snapshot.docs.map((doc) => doc.id);
      } catch (error: any) {
        this.logger.error(`Failed to resolve all users for broadcast: ${error.message}`);
        return [];
      }
    }

    const results = await this.dispatch({
      // Manual (admin broadcast) notifications also mirror to EMAIL
      // for every user that has an email in their profile.
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
        NotificationChannel.EMAIL,
      ],
      targets: {
        userIds,
        role: dto.role,
      },
      priority: NotificationPriority.NORMAL,
      subject: dto.title,
      body: dto.message,
    });

    const hasSent = results.some((r) => r.sent > 0);
    if (hasSent) {
      this.eventEmitter.emit(WS_EVENTS.NOTIFICATION_BROADCAST, {
        title: dto.title,
        message: dto.message,
        role: dto.role,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  }

  private userNotifications(uid: string): CollectionReference<FirestoreNotificationDocument> {
    const collection: CollectionReference<FirestoreNotificationDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(uid)
      .collection(USER_SUBCOLLECTIONS.notifications);
    return collection;
  }
}
