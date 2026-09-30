import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';

@Injectable()
export class UpdateService {
  private cachedVersion: Record<string, unknown> | null = null;
  private lastRead = 0;

  getLatestVersion() {
    const now = Date.now();
    if (!this.cachedVersion || now - this.lastRead > 10000) {
      const filePath = join(__dirname, '..', '..', '..', '..', 'public', 'apk', 'version.json');
      try {
        const raw = readFileSync(filePath, 'utf-8');
        this.cachedVersion = JSON.parse(raw);
        this.lastRead = now;
      } catch {
        return {
          versionCode: 1,
          versionName: '1.0.0',
          downloadUrl: '',
          releaseNotes: '',
          forceUpdate: false,
        };
      }
    }
    return { ...this.cachedVersion };
  }
}
