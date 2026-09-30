import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NotificationController } from './notification.controller';
import { NotificationEventsListener } from './notification-events.listener';
import { NotificationService } from './notification.service';
import { FcmProvider } from './providers/fcm.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventsListener,
    FcmProvider,
    // WhatsApp Cloud API (Meta) — forever-free tier. Twilio is NOT used.
    {
      provide: 'WHATSAPP_CONFIG',
      useFactory: (config: ConfigService) => ({
        token: config.get('WHATSAPP_TOKEN'),
        phoneNumberId: config.get('WHATSAPP_PHONE_NUMBER_ID'),
        templateName: config.get('WHATSAPP_TEMPLATE_NAME') || 'hawk_referral_invite',
        templateLang: config.get('WHATSAPP_TEMPLATE_LANG') || 'en',
      }),
      inject: [ConfigService],
    },
    WhatsAppCloudProvider,
    // Email Provider Configuration
    {
      provide: 'EMAIL_CONFIG',
      useFactory: (config: ConfigService) => ({
        apiKey: config.get('SENDGRID_API_KEY'),
        fromEmail: config.get('SENDGRID_FROM_EMAIL') || 'noreply@hawkaero.com',
        fromName: config.get('SENDGRID_FROM_NAME') || 'Hawk Aerosystem',
      }),
      inject: [ConfigService],
    },
    SendGridProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
