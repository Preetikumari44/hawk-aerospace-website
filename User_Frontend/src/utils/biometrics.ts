import { Platform } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { Storage } from './storage';

export type BiometricSupport =
  | { status: 'web' } // running in browser - biometrics only available in the app
  | { status: 'available'; biometryType?: string } // device has a supported biometric sensor
  | { status: 'unavailable' }; // native device missing the required hardware/sensor

export type BiometricSettings = {
  fingerprintEnabled: boolean;
  faceIdEnabled: boolean;
  transactionsEnabled: boolean;
};

export const BIOMETRICS_SETTINGS_KEY = '@hawk_biometrics_settings';
export const LAST_BIOMETRIC_AUTH_KEY = '@hawk_last_biometric_auth';
export const BIOMETRIC_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

export const EMPTY_BIOMETRIC_SETTINGS: BiometricSettings = {
  fingerprintEnabled: false,
  faceIdEnabled: false,
  transactionsEnabled: false,
};

/**
 * Gets the timestamp (in ms) of the last successful biometric authentication.
 */
export async function getLastBiometricAuthTime(): Promise<number> {
  try {
    const raw = await Storage.getItem(LAST_BIOMETRIC_AUTH_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Records the current timestamp as the last successful biometric authentication.
 */
export async function recordBiometricAuth(): Promise<void> {
  try {
    await Storage.setItem(LAST_BIOMETRIC_AUTH_KEY, String(Date.now()));
  } catch (error) {
    console.error('Failed to record biometric auth time', error);
  }
}

/**
 * Checks whether biometric authentication occurred within the grace period (default 10 minutes).
 */
export async function isBiometricAuthRecent(gracePeriodMs = BIOMETRIC_GRACE_PERIOD_MS): Promise<boolean> {
  const lastTime = await getLastBiometricAuthTime();
  if (!lastTime) return false;
  return Date.now() - lastTime < gracePeriodMs;
}

/**
 * Loads the persisted biometrics preferences (safe defaults if unset/corrupt).
 */
export async function loadBiometricSettings(): Promise<BiometricSettings> {
  try {
    const raw = await Storage.getItem(BIOMETRICS_SETTINGS_KEY);
    if (!raw) {
      return EMPTY_BIOMETRIC_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      fingerprintEnabled: !!parsed.fingerprintEnabled,
      faceIdEnabled: !!parsed.faceIdEnabled,
      transactionsEnabled: !!parsed.transactionsEnabled,
    };
  } catch (error) {
    console.error('Failed to load biometric settings', error);
    return EMPTY_BIOMETRIC_SETTINGS;
  }
}

/**
 * Persists the biometrics preferences.
 */
export async function saveBiometricSettings(settings: BiometricSettings): Promise<void> {
  try {
    await Storage.setItem(BIOMETRICS_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save biometric settings', error);
  }
}

/**
 * Returns true when the persisted login preference means the app should ask
 * for a biometric unlock (fingerprint / Face ID) on launch.
 */
export function isAppUnlockEnabled(settings: BiometricSettings): boolean {
  return !!settings.fingerprintEnabled || !!settings.faceIdEnabled;
}

/**
 * Prompts the user with the native biometric dialog (fingerprint / Face ID)
 * and resolves true only when the user successfully authenticates.
 * Allows fallback to device PIN / pattern / password via
 * `allowDeviceCredentials` (Android) / device passcode (iOS).
 * Never prompts on web.
 */
export async function promptBiometric(message: string, allowDeviceCredentials = true): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  try {
    // Dynamic require keeps the native module out of the web bundle path at runtime.
    const module = require('react-native-biometrics');
    const ReactNativeBiometricsLib = module.default || module;
    const rnBiometrics = new ReactNativeBiometricsLib();

    try {
      const result = await rnBiometrics.simplePrompt({
        promptMessage: message,
        cancelButtonText: 'Cancel',
        // Android: shows "Use PIN/pattern/password" fallback button.
        // iOS: allows device passcode fallback when biometry fails/locks out.
        allowDeviceCredentials,
      });
      return !!result?.success;
    } catch (inner: any) {
      // Older builds of the lib may reject the extra flag — retry without it.
      if (allowDeviceCredentials && /allowDeviceCredentials|unknown option|invalid/i.test(String(inner?.message || inner))) {
        const retry = await rnBiometrics.simplePrompt({
          promptMessage: message,
          cancelButtonText: 'Cancel',
        });
        return !!retry?.success;
      }
      throw inner;
    }
  } catch (error) {
    console.error('Biometric prompt failed', error);
    return false;
  }
}

/**
 * Determines whether biometrics can be used on this device.
 *
 * - Web: biometrics are only available inside the Android/iOS app.
 * - Android: fingerprint (hardware or in-display) or face unlock.
 * - iOS: only Face ID (face lock).
 */
export async function checkBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') {
    return { status: 'web' };
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { status: 'unavailable' };
  }

  try {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      return { status: 'unavailable' };
    }

    if (Platform.OS === 'ios') {
      // Only Face ID is supported on iOS.
      return biometryType === 'FaceID'
        ? { status: 'available', biometryType }
        : { status: 'unavailable' };
    }

    // Android reports 'Biometrics' for any available sensor
    // (hardware fingerprint, in-display fingerprint or face unlock).
    return biometryType === 'Biometrics'
      ? { status: 'available', biometryType }
      : { status: 'unavailable' };
  } catch (error) {
    console.error('Biometric support check failed', error);
    return { status: 'unavailable' };
  }
}