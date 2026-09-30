import { Inject, Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderResponse,
} from '../interfaces/notification-provider.interface';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

/**
 * Twilio SMS Provider
 * NOTE: Install twilio package: npm install twilio
 */
@Injectable()
export class TwilioProvider implements INotificationProvider {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(TwilioProvider.name);
  private client: ReturnType<typeof Twilio> | null = null;

  constructor(@Inject('SMS_CONFIG') private readonly config: TwilioConfig) {
    try {
      // Log config for debugging (mask sensitive data)
      this.logger.log('Twilio configuration:', {
        accountSid: config.accountSid ? `${config.accountSid.substring(0, 10)}...` : 'MISSING',
        authToken: config.authToken ? 'SET' : 'MISSING',
        fromPhone: config.fromPhone || 'MISSING',
      });

      if (!config.accountSid || !config.authToken || !config.fromPhone) {
        this.logger.error('Twilio configuration incomplete. Check TWILIO_* environment variables.');
        return;
      }

      // Initialize Twilio client
      this.logger.debug('Creating Twilio client...');
      this.client = Twilio(config.accountSid, config.authToken);
      this.logger.log('✅ Twilio SMS provider initialized successfully');
    } catch (error: any) {
      this.logger.error(`❌ Twilio initialization failed: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Install twilio package.',
      };
    }

    try {
      const phone = Array.isArray(payload.to) ? payload.to[0] : payload.to;

      const message = await this.client.messages.create({
        body: payload.body,
        from: this.config.fromPhone,
        to: phone,
      });

      this.logger.log(`Twilio SMS sent successfully: ${message.sid} to ${phone}`);
      return { success: true, messageId: message.sid };
    } catch (error: any) {
      this.logger.error(`Twilio send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
