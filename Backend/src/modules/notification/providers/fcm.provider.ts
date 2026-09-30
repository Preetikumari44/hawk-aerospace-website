import { Injectable, Logger } from '@nestjs/common';
import type { Message } from 'firebase-admin/messaging';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderResponse,
} from '../interfaces/notification-provider.interface';

/**
 * Firebase Cloud Messaging (FCM) Provider
 * Sends PUSH notifications to mobile devices
 */
@Injectable()
export class FcmProvider implements INotificationProvider {
  readonly channel = NotificationChannel.PUSH;
  private readonly logger = new Logger(FcmProvider.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    try {
      const messaging = this.firebaseAdmin.messaging();

      // FCM requires single token per message (or use multicast for multiple)
      const token = Array.isArray(payload.to) ? payload.to[0] : payload.to;

      const message: Message = {
        notification: {
          title: payload.subject || 'Hawk Aerosystem',
          body: payload.body,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        token,
        android: {
          priority: payload.priority === 'CRITICAL' ? 'high' : 'normal',
        },
        apns: {
          headers: {
            'apns-priority': payload.priority === 'CRITICAL' ? '10' : '5',
          },
        },
      };

      const messageId = await messaging.send(message);

      this.logger.log(`FCM notification sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`FCM send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * FCM data payload must be string key-value pairs
   */
  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringData;
  }
}
