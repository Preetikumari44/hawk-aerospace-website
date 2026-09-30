import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderResponse,
} from '../interfaces/notification-provider.interface';

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * SendGrid Email Provider
 * NOTE: Install sendgrid package: npm install @sendgrid/mail
 */
@Injectable()
export class SendGridProvider implements INotificationProvider {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(SendGridProvider.name);
  private client: any; // SendGrid mail client

  constructor(@Inject('EMAIL_CONFIG') private readonly config: SendGridConfig) {
    try {
      // Dynamic import
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(config.apiKey);
      this.client = sgMail;
      this.logger.log('SendGrid email provider initialized');
    } catch (error: any) {
      this.logger.warn(`SendGrid not initialized: ${error.message}. Install: npm install @sendgrid/mail`);
    }
  }

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'SendGrid client not initialized. Install @sendgrid/mail package.',
      };
    }

    try {
      const emails = Array.isArray(payload.to) ? payload.to : [payload.to];

      const msg = {
        to: emails,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: payload.subject || 'Hawk Aerosystem',
        text: payload.body,
        html: payload.data?.html || `<p>${payload.body}</p>`,
      };

      const [response] = await this.client.send(msg);
      const messageId = response.headers['x-message-id'];

      this.logger.log(`SendGrid email sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`SendGrid send failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
