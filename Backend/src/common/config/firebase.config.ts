import type { ConfigService } from '@nestjs/config';

export interface FirebaseAdminRuntimeConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket?: string;
}

/**
 * Resolve the GCS bucket name for `storage().bucket()`.
 *
 * IMPORTANT (Oct 2024+ Firebase projects): newly provisioned buckets are
 * named `<project-id>.firebasestorage.app` — NOT `<project-id>.appspot.com`.
 * The old code rewrote `.firebasestorage.app` -> `.appspot.com`, which points
 * at a bucket that does not exist (404 "specified bucket does not exist").
 *
 * So: use FIREBASE_STORAGE_BUCKET VERBATIM (only stripping gs:// and
 * whitespace). If unset, default to the new-style `<project>.firebasestorage.app`.
 */
function normalizeStorageBucket(bucket: string | undefined, projectId: string): string {
  const cleaned = (bucket ?? '').trim().replace(/^gs:\/\//, '').replace(/\/+$/, '');
  if (cleaned) {
    return cleaned;
  }
  return `${projectId}.firebasestorage.app`;
}

export function getFirebaseAdminRuntimeConfig(
  configService: ConfigService,
): FirebaseAdminRuntimeConfig | null {
  const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
  const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
  const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    storageBucket: normalizeStorageBucket(
      configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      projectId,
    ),
  };
}
