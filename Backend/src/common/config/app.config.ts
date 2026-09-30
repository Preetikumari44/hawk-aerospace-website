import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type EnvironmentRecord = Record<string, unknown>;

export interface AppEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PREFIX: string;
  MONGODB_ENABLED: boolean;
  MONGODB_URI?: string;
  MONGODB_DB_NAME?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  AUTH_DEV_OTP_ENABLED: boolean;
  AUTH_DEV_OTP_CODE: string;
  AUTH_DEV_OTP_PHONES: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_DATABASE_ID?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  FIRESTORE_SYNC_ENABLED: boolean;
  BOOKING_EXPIRY_ENABLED: boolean;
  DATABASE_SOURCE: 'mongodb' | 'firestore';
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
  WS_MAX_CONNECTIONS_PER_USER: number;
  WS_PING_TIMEOUT: number;
  WS_PING_INTERVAL: number;
  WS_MAX_BUFFER_SIZE: number;
  CORS_ORIGIN: string;
  // Upstash Redis Configuration
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  // Notification Configuration (Twilio is NOT used — Firebase OTP + WhatsApp Cloud)
  SMS_PROVIDER?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_PHONE?: string;
  TWILIO_API_KEY_SECRET?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANG?: string;
  REFERRAL_LINK_BASE?: string;
  REFERRAL_CODE_TTL_DAYS?: number;
  REFERRAL_MIN_WITHDRAWAL?: number;
  REFERRAL_WITHDRAW_HOLD_DAYS?: number;
  REFERRAL_MAX_INVITES_PER_DAY?: number;
  PUBLIC_API_BASE?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  SENDGRID_FROM_NAME?: string;
  MSG91_AUTH_KEY?: string;
  MSG91_SENDER_ID?: string;
  MSG91_FLOW_ID?: string;
  NOTIFICATION_RETRY_ENABLED?: boolean;
  NOTIFICATION_RATE_LIMITING_ENABLED?: boolean;
  NOTIFICATION_BATCH_ENABLED?: boolean;
  NOTIFICATION_BATCH_INTERVAL_MS?: number;
  // Google Maps Configuration
  GOOGLE_MAPS_API_KEY?: string;
  // Razorpay payment gateway
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_ACCOUNT_NUMBER?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}

/**
 * Validates that JWT secrets meet minimum security requirements.
 * Prevents use of weak, well-known, or default secrets.
 * 
 * @param secret The JWT secret to validate
 * @param secretName The name of the secret (for error messages)
 * @throws Error if the secret is invalid
 */
function validateJwtSecret(secret: string, secretName: string): void {
  const minLength = 32;
  const wellKnownSecrets = [
    'dev-jwt-secret-change-me',
    'dev-refresh-secret-change-me',
    'secret',
    'jwt-secret',
    'jwt_secret',
    'change-me',
    'changeme',
    'your-secret-here',
    'your_secret_here',
  ];

  // Check minimum length
  if (secret.length < minLength) {
    throw new Error(
      `${secretName} must be at least ${minLength} characters long. ` +
      `Current length: ${secret.length}. ` +
      `Generate a secure secret with: openssl rand -base64 64`
    );
  }

  // Check for well-known/default secrets
  const lowerSecret = secret.toLowerCase();
  if (wellKnownSecrets.some(weak => lowerSecret.includes(weak))) {
    throw new Error(
      `${secretName} contains a well-known or default value. ` +
      `This is a critical security risk. ` +
      `Generate a secure secret with: openssl rand -base64 64`
    );
  }

  // Check for repeated characters (e.g., "aaaaaaaaaa...")
  const hasRepeatedChars = /(.)\1{9,}/.test(secret);
  if (hasRepeatedChars) {
    throw new Error(
      `${secretName} contains too many repeated characters. ` +
      `Use a cryptographically random secret. ` +
      `Generate with: openssl rand -base64 64`
    );
  }
}

function readString(
  config: EnvironmentRecord,
  key: keyof AppEnvironment,
  defaultValue?: string,
): string {
  const value = config[key];

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Missing required environment variable: ${key}`);
}

function readOptionalString(
  config: EnvironmentRecord,
  key: keyof AppEnvironment,
): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(
  config: EnvironmentRecord,
  key: keyof AppEnvironment,
  defaultValue: number,
): number {
  const value = config[key];
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return defaultValue;
}

function readBoolean(
  config: EnvironmentRecord,
  key: keyof AppEnvironment,
  defaultValue: boolean,
): boolean {
  const value = config[key];
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  return defaultValue;
}

export function validateEnv(config: EnvironmentRecord): AppEnvironment {
  const nodeEnv = readString(config, 'NODE_ENV', 'development') as AppEnvironment['NODE_ENV'];
  
  // Determine if we should allow development defaults
  // Only allow in 'development' and 'test' environments
  const allowDevDefaults = nodeEnv === 'development' || nodeEnv === 'test';

  // JWT secrets - NEVER use defaults in production
  let jwtSecret: string;
  let jwtRefreshSecret: string;

  if (allowDevDefaults) {
    // Development/Test: Generate random secrets if not provided
    // This prevents accidental use of well-known defaults
    const devJwtSecret = config['JWT_SECRET'] as string | undefined;
    const devRefreshSecret = config['JWT_REFRESH_SECRET'] as string | undefined;

    if (!devJwtSecret || devJwtSecret.trim().length === 0) {
      // Generate a random secret for development
      jwtSecret = `dev-${Math.random().toString(36).substring(2)}-${Date.now()}`;
      console.warn(
        '⚠️  JWT_SECRET not set. Using auto-generated development secret.\n' +
        '   For production, set a secure secret: openssl rand -base64 64'
      );
    } else {
      jwtSecret = devJwtSecret.trim();
    }

    if (!devRefreshSecret || devRefreshSecret.trim().length === 0) {
      jwtRefreshSecret = `dev-refresh-${Math.random().toString(36).substring(2)}-${Date.now()}`;
      console.warn(
        '⚠️  JWT_REFRESH_SECRET not set. Using auto-generated development secret.\n' +
        '   For production, set a secure secret: openssl rand -base64 64'
      );
    } else {
      jwtRefreshSecret = devRefreshSecret.trim();
    }

    // Validate even in development to catch obvious mistakes
    try {
      validateJwtSecret(jwtSecret, 'JWT_SECRET');
    } catch (error: any) {
      console.warn(`⚠️  Development JWT_SECRET validation warning: ${error.message}`);
    }

    try {
      validateJwtSecret(jwtRefreshSecret, 'JWT_REFRESH_SECRET');
    } catch (error: any) {
      console.warn(`⚠️  Development JWT_REFRESH_SECRET validation warning: ${error.message}`);
    }
  } else {
    // Production/Staging: REQUIRE proper secrets
    jwtSecret = readString(config, 'JWT_SECRET');
    jwtRefreshSecret = readString(config, 'JWT_REFRESH_SECRET');

    // Strict validation in production
    validateJwtSecret(jwtSecret, 'JWT_SECRET');
    validateJwtSecret(jwtRefreshSecret, 'JWT_REFRESH_SECRET');
  }

  const mongodbEnabled = readBoolean(config, 'MONGODB_ENABLED', true);

  return {
    NODE_ENV: nodeEnv,
    PORT: readNumber(config, 'PORT', 3001),
    API_PREFIX: readString(config, 'API_PREFIX', 'api'),
    MONGODB_ENABLED: mongodbEnabled,
    MONGODB_URI: mongodbEnabled 
      ? readString(
          config, 
          'MONGODB_URI', 
          nodeEnv === 'production' 
            ? undefined 
            : 'mongodb://127.0.0.1:27017/hawk-backend'
        )
      : undefined,
    MONGODB_DB_NAME: readOptionalString(config, 'MONGODB_DB_NAME'),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: readString(config, 'JWT_EXPIRES_IN', '15m'),
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRES_IN: readString(config, 'JWT_REFRESH_EXPIRES_IN', '7d'),
    AUTH_DEV_OTP_ENABLED: readBoolean(config, 'AUTH_DEV_OTP_ENABLED', false),
    AUTH_DEV_OTP_CODE: readString(config, 'AUTH_DEV_OTP_CODE', '123456'),
    AUTH_DEV_OTP_PHONES: readString(config, 'AUTH_DEV_OTP_PHONES', ''),
    FIREBASE_PROJECT_ID: readOptionalString(config, 'FIREBASE_PROJECT_ID'),
    FIREBASE_CLIENT_EMAIL: readOptionalString(config, 'FIREBASE_CLIENT_EMAIL'),
    FIREBASE_PRIVATE_KEY: readOptionalString(config, 'FIREBASE_PRIVATE_KEY'),
    FIREBASE_DATABASE_ID: readOptionalString(config, 'FIREBASE_DATABASE_ID'),
    FIREBASE_STORAGE_BUCKET: readOptionalString(config, 'FIREBASE_STORAGE_BUCKET'),
    FIRESTORE_SYNC_ENABLED: readBoolean(config, 'FIRESTORE_SYNC_ENABLED', false),
    BOOKING_EXPIRY_ENABLED: readBoolean(config, 'BOOKING_EXPIRY_ENABLED', true),
    DATABASE_SOURCE: readString(config, 'DATABASE_SOURCE', 'mongodb') as 'mongodb' | 'firestore',
    THROTTLE_TTL: readNumber(config, 'THROTTLE_TTL', 60000),
    THROTTLE_LIMIT: readNumber(config, 'THROTTLE_LIMIT', 100),
    WS_MAX_CONNECTIONS_PER_USER: readNumber(config, 'WS_MAX_CONNECTIONS_PER_USER', 5),
    WS_PING_TIMEOUT: readNumber(config, 'WS_PING_TIMEOUT', 60000),
    WS_PING_INTERVAL: readNumber(config, 'WS_PING_INTERVAL', 25000),
    WS_MAX_BUFFER_SIZE: readNumber(config, 'WS_MAX_BUFFER_SIZE', 1000000),
    CORS_ORIGIN: readString(
      config, 
      'CORS_ORIGIN', 
      nodeEnv === 'production' 
        ? undefined 
        : 'http://localhost:3000'
    ),
    // Upstash Redis Configuration
    UPSTASH_REDIS_REST_URL: readOptionalString(config, 'UPSTASH_REDIS_REST_URL'),
    UPSTASH_REDIS_REST_TOKEN: readOptionalString(config, 'UPSTASH_REDIS_REST_TOKEN'),
    // Notification Configuration
    SMS_PROVIDER: readOptionalString(config, 'SMS_PROVIDER'),
    TWILIO_ACCOUNT_SID: readOptionalString(config, 'TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: readOptionalString(config, 'TWILIO_AUTH_TOKEN'),
    TWILIO_FROM_PHONE: readOptionalString(config, 'TWILIO_FROM_PHONE'),
    TWILIO_API_KEY_SECRET: readOptionalString(config, 'TWILIO_API_KEY_SECRET'),
    SENDGRID_API_KEY: readOptionalString(config, 'SENDGRID_API_KEY'),
    SENDGRID_FROM_EMAIL: readOptionalString(config, 'SENDGRID_FROM_EMAIL'),
    SENDGRID_FROM_NAME: readOptionalString(config, 'SENDGRID_FROM_NAME'),
    MSG91_AUTH_KEY: readOptionalString(config, 'MSG91_AUTH_KEY'),
    MSG91_SENDER_ID: readOptionalString(config, 'MSG91_SENDER_ID'),
    MSG91_FLOW_ID: readOptionalString(config, 'MSG91_FLOW_ID'),
    WHATSAPP_TOKEN: readOptionalString(config, 'WHATSAPP_TOKEN'),
    WHATSAPP_PHONE_NUMBER_ID: readOptionalString(config, 'WHATSAPP_PHONE_NUMBER_ID'),
    WHATSAPP_TEMPLATE_NAME: readOptionalString(config, 'WHATSAPP_TEMPLATE_NAME'),
    WHATSAPP_TEMPLATE_LANG: readOptionalString(config, 'WHATSAPP_TEMPLATE_LANG'),
    REFERRAL_LINK_BASE: readOptionalString(config, 'REFERRAL_LINK_BASE'),
    PUBLIC_API_BASE: readOptionalString(config, 'PUBLIC_API_BASE'),
    NOTIFICATION_RETRY_ENABLED: readBoolean(config, 'NOTIFICATION_RETRY_ENABLED', true),
    NOTIFICATION_RATE_LIMITING_ENABLED: readBoolean(config, 'NOTIFICATION_RATE_LIMITING_ENABLED', false),
    NOTIFICATION_BATCH_ENABLED: readBoolean(config, 'NOTIFICATION_BATCH_ENABLED', false),
    NOTIFICATION_BATCH_INTERVAL_MS: readNumber(config, 'NOTIFICATION_BATCH_INTERVAL_MS', 300000),
    // Google Maps Configuration
    GOOGLE_MAPS_API_KEY: readOptionalString(config, 'GOOGLE_MAPS_API_KEY'),
    // Razorpay payment gateway
    RAZORPAY_KEY_ID: readOptionalString(config, 'RAZORPAY_KEY_ID'),
    RAZORPAY_KEY_SECRET: readOptionalString(config, 'RAZORPAY_KEY_SECRET'),
    RAZORPAY_ACCOUNT_NUMBER: readOptionalString(config, 'RAZORPAY_ACCOUNT_NUMBER'),
    RAZORPAY_WEBHOOK_SECRET: readOptionalString(config, 'RAZORPAY_WEBHOOK_SECRET'),
  };
}

export function getEnvFilePaths(
  currentWorkingDirectory = process.cwd(),
  moduleDirectory = __dirname,
): string[] {
  const candidateDirectories = [
    resolve(currentWorkingDirectory, 'Backend'),
    currentWorkingDirectory,
    resolve(moduleDirectory, '..', '..', '..'),
    resolve(moduleDirectory, '..', '..', '..', '..'),
  ];
  const envFileNames = ['.env.local', '.env'];
  const seen = new Set<string>();
  const envFilePaths: string[] = [];

  for (const directory of candidateDirectories) {
    for (const fileName of envFileNames) {
      const filePath = resolve(directory, fileName);
      const normalizedPath = filePath.toLowerCase();

      if (seen.has(normalizedPath)) {
        continue;
      }

      seen.add(normalizedPath);

      if (existsSync(filePath)) {
        envFilePaths.push(filePath);
      }
    }
  }

  return envFilePaths.length > 0 ? envFilePaths : envFileNames;
}
