/**
 * Notification Provider Interface
 * All channel providers (FCM, SMS, EMAIL) implement this interface
 */

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
  WEBSOCKET = 'WEBSOCKET',
}

export enum NotificationPriority {
  CRITICAL = 'CRITICAL', // immediate, retry 3x (OTP, security)
  HIGH = 'HIGH', // < 1 min, retry 2x (bookings, assignments)
  NORMAL = 'NORMAL', // batch 5 min, retry 1x (updates)
  LOW = 'LOW', // batch hourly/daily, no retry (digests)
}

export interface NotificationPayload {
  to: string | string[]; // phone/email/fcmToken
  subject?: string; // for EMAIL
  body: string; // message text
  data?: Record<string, any>; // extra metadata
  priority: NotificationPriority;
  templateId?: string; // optional template reference
}

export interface ProviderResponse {
  success: boolean;
  messageId?: string; // provider's tracking ID
  error?: string;
  metadata?: Record<string, any>;
}

export interface INotificationProvider {
  readonly channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<ProviderResponse>;
  verify?(token: string): Promise<boolean>; // for token verification
}
