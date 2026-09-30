import { Platform, PermissionsAndroid } from 'react-native';
import { apiRequest } from './api';

const getMessaging = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('@react-native-firebase/messaging').default;
  } catch {
    return null;
  }
};

/**
 * Request notification permission and register FCM token with backend.
 * Call this once after the user logs in.
 */
export async function setupPushNotifications() {
  const messagingLib = getMessaging();
  if (!messagingLib) return;

  try {
    let granted = false;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      granted = result === PermissionsAndroid.RESULTS.GRANTED;
    } else if (Platform.OS === 'ios') {
      const authStatus = await messagingLib().requestPermission();
      granted =
        authStatus === messagingLib.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingLib.AuthorizationStatus.PROVISIONAL;
    } else {
      granted = true;
    }

    if (!granted) {
      console.log('[Push] Notification permission denied');
      return;
    }

    const fcmToken = await messagingLib().getToken();
    if (!fcmToken) return;

    await apiRequest('/notifications/fcm/register', {
      method: 'POST',
      body: JSON.stringify({ fcmToken, platform: Platform.OS, deviceId: null }),
    });

    console.log('[Push] FCM token registered');

    messagingLib().onTokenRefresh(async (newToken) => {
      await apiRequest('/notifications/fcm/register', {
        method: 'POST',
        body: JSON.stringify({ fcmToken: newToken, platform: Platform.OS }),
      });
    });
  } catch (e) {
    console.warn('[Push] Setup failed:', e.message);
  }
}

/**
 * Unregister FCM token on logout.
 */
export async function teardownPushNotifications() {
  const messagingLib = getMessaging();
  if (!messagingLib) return;

  try {
    const fcmToken = await messagingLib().getToken();
    if (!fcmToken) return;
    await apiRequest('/notifications/fcm/unregister', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    });
  } catch (e) {
    console.warn('[Push] Teardown failed:', e.message);
  }
}
