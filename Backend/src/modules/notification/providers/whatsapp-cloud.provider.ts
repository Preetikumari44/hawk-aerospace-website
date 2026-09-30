import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderResponse,
} from '../interfaces/notification-provider.interface';

interface WhatsAppCloudConfig {
  token?: string;
  phoneNumberId?: string;
  templateName?: string;
  templateLang?: string;
}

/**
 * WhatsApp Cloud API (Meta) provider — forever-free tier (1,000 service
 * conversations/month, then pay-per-message).
 *
 * Setup (detailed):
 *  1. Go to developers.facebook.com → Create App → add the "WhatsApp" product.
 *  2. In the WhatsApp → Getting started panel, copy the test Phone Number ID
 *     and generate a temporary access token.
 *  3. Add your business phone number (Verify via OTP) when ready for production.
 *  4. Create a message template, e.g. `hawk_referral_invite`:
 *       "{{1}} invited you to join Hawk Aerosystem as {{2}}. Apply here: {{3}}"
 *     Submit for approval (usually < 24h). Set WHATSAPP_TEMPLATE_NAME to it.
 *  5. For a permanent token: Business Settings → System Users → create user →
 *     assign whatsapp_business_messaging → Generate token. Set WHATSAPP_TOKEN.
 *  6. Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 *     WHATSAPP_TEMPLATE_NAME (default hawk_referral_invite), WHATSAPP_TEMPLATE_LANG (default en).
 *
 * Until the credentials are set, this provider degrades gracefully (logs and
 * returns success:false) so the primary invite path — the inviter's own
 * on-device Share sheet — keeps working with zero backend cost.
 */
@Injectable()
export class WhatsAppCloudProvider implements INotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppCloudProvider.name);

  constructor(
    @Optional() @Inject('WHATSAPP_CONFIG') private readonly config?: WhatsAppCloudConfig,
  ) {
    if (!config?.token || !config?.phoneNumberId) {
      this.logger.warn(
        'WhatsApp Cloud API not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID). ' +
          'Invites fall back to on-device Share + FCM. See provider file header for setup steps.',
      );
    } else {
      this.logger.log('WhatsApp Cloud API provider initialized');
    }
  }

  private toE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits;
  }

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    if (!this.config?.token || !this.config?.phoneNumberId) {
      return {
        success: false,
        error:
          'WhatsApp Cloud API not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.',
      };
    }
    const targets = Array.isArray(payload.to) ? payload.to : [payload.to];
    const template = payload.templateId ?? this.config.templateName ?? 'hawk_referral_invite';
    const lang = this.config.templateLang ?? 'en';
    const link = payload.data?.link ?? payload.body;
    const role = payload.data?.targetRole ?? 'member';
    const inviter = payload.data?.inviterName ?? 'A Hawk user';

    let lastId: string | undefined;
    for (const target of targets) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${this.config.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.config.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: this.toE164(target),
              type: 'template',
              template: {
                name: template,
                language: { code: lang },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: String(inviter).slice(0, 60) },
                      { type: 'text', text: String(role).slice(0, 40) },
                      { type: 'text', text: String(link).slice(0, 200) },
                    ],
                  },
                ],
              },
            }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as {
          messages?: Array<{ id: string }>;
          error?: { message: string };
        };
        if (!res.ok) {
          throw new Error(json.error?.message ?? `WhatsApp API HTTP ${res.status}`);
        }
        lastId = json.messages?.[0]?.id;
        this.logger.log(`WhatsApp template sent to ${target}: ${lastId}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'WhatsApp send failed';
        this.logger.error(`WhatsApp send failed for ${target}: ${message}`);
        return { success: false, error: message };
      }
    }
    return { success: true, messageId: lastId };
  }
}
