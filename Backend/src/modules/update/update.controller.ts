import { Response } from 'express';
import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { isReferralCode } from '../referral/referral.constants';
import { UpdateService } from './update.service';
import { join } from 'path';
import { existsSync } from 'fs';
import { Readable } from 'stream';

@Controller('update')
export class UpdateController {
  private readonly logger = new Logger(UpdateController.name);

  constructor(private readonly updateService: UpdateService) {}

  /**
   * Short APK link shared in referral messages: /api/update/d/ABC123
   * 302-redirects to the real download, preserving the referral code so a
   * fresh install can still be attributed (manual entry fallback).
   */
  @Public()
  @Get('d/:code')
  downloadShortcut(@Param('code') code: string, @Res() res: Response) {
    const clean = String(code ?? '').toUpperCase().trim();
    if (!isReferralCode(clean)) {
      res.status(404).json({ success: false, message: 'Invalid referral code.' });
      return;
    }
    res.redirect(`/api/update/download?ref=${encodeURIComponent(clean)}`);
  }

  @Public()
  @Get('latest')
  async getLatestVersion(@Res({ passthrough: true }) res?: Response) {
    const version = this.updateService.getLatestVersion() as Record<string, unknown>;
    // Referral passthrough (?ref=HAWK-...): logged client-side; echoed here so
    // the landing page can confirm the code survived the version check.
    return version;
  }

  /**
   * Android App Links proof for https://hawkaerosystem.com.
   * Serve at /.well-known/assetlinks.json via main.ts static mapping (this
   * copy under /api is a fallback for proxies that keep the prefix).
   * Fill in your release + debug SHA-256 fingerprints before going live.
   */
  @Public()
  @Get('/.well-known/assetlinks.json')
  assetlinksPrefixed() {
    return this.assetlinks();
  }

  @Public()
  @Get('assetlinks.json')
  assetlinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          // applicationId is com.pilotmodule (see User_Frontend/android/app/build.gradle).
          // Fill fingerprints with: keytool -list -v -keystore <keystore> -alias <alias>
          package_name: 'com.pilotmodule',
          sha256_cert_fingerprints: ['REPLACE_WITH_RELEASE_SHA256', 'REPLACE_WITH_DEBUG_SHA256'],
        },
      },
    ];
  }

  @Public()
  @Get('download')
  async downloadApk(@Res() res: Response) {
    // ── Strategy 1: Serve local APK file (fastest, no external dep) ──
    const localPath = join(__dirname, '..', '..', '..', '..', 'public', 'apk', 'app-release.apk');

    if (existsSync(localPath)) {
      const stats = require('fs').statSync(localPath);
      this.logger.log(`Serving local APK (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      res.download(localPath, 'app-release.apk', (err) => {
        if (err && !res.headersSent) {
          this.logger.error('sendFile failed:', err.message);
          res.status(500).json({ success: false, message: 'Failed to send APK' });
        }
      });
      return;
    }

    // ── Strategy 2: Fallback — proxy from version.json downloadUrl ──
    const version = this.updateService.getLatestVersion();
    const downloadUrl = version.downloadUrl;

    if (!downloadUrl) {
      res.status(404).json({
        success: false,
        message:
          'No local APK file and no downloadUrl configured. ' +
          'Place app-release.apk in Backend/public/apk/ or set downloadUrl in version.json',
      });
      return;
    }

    try {
      this.logger.log(`Proxying APK from: ${downloadUrl}`);
      const upstream = await fetch(downloadUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/octet-stream, */*',
        },
        redirect: 'follow',
      });

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        this.logger.error(`Upstream returned ${upstream.status}: ${text.slice(0, 200)}`);
        res.status(502).json({
          success: false,
          message: `Download URL returned HTTP ${upstream.status}`,
          detail: text.slice(0, 200),
        });
        return;
      }

      const contentLength = upstream.headers.get('content-length');
      const contentType = upstream.headers.get('content-type') || 'application/vnd.android.package-archive';

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', 'attachment; filename="app-release.apk"');

      const nodeStream = Readable.fromWeb(upstream.body as any);
      nodeStream.pipe(res);
    } catch (error: any) {
      this.logger.error(`Proxy failed: ${error.message}`);
      res.status(500).json({ success: false, message: `Proxy download failed: ${error.message}` });
    }
  }
}
