import { Platform, PermissionsAndroid } from 'react-native';
import { Storage } from './storage';
import { setupPushNotifications } from './notificationService';
import { getCurrentPosition } from './geolocation';
import { customerApi, updateStoredUser, mapsApi } from './api';

export const PERMISSIONS_REQUESTED_KEY = '@app_permissions_requested';

export const hasRequestedPermissions = async () => {
  try {
    return (await Storage.getItem(PERMISSIONS_REQUESTED_KEY)) === 'true';
  } catch {
    return false;
  }
};

export const markPermissionsRequested = async () => {
  try {
    await Storage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');
  } catch {
    // best-effort persistence
  }
};

/**
 * Requests the location permission and, when granted, returns the captured
 * current position so callers can save it without a second geolocation call.
 */
async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      return { granted: false, position: null };
    }

    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });
      return { granted: true, position };
    } catch {
      return { granted: true, position: null };
    }
  }

  // iOS / web: calling geolocation triggers the OS/browser permission prompt.
  // A successful position fetch means the permission was granted.
  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10000,
    });
    return { granted: true, position };
  } catch {
    return { granted: false, position: null };
  }
}

async function requestFilePermission() {
  if (Platform.OS !== 'android') {
    return true; // Not applicable on iOS/web
  }

  try {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestCallPermission() {
  if (Platform.OS !== 'android') {
    return true; // Not applicable on iOS/web
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestCameraPermission() {
  if (Platform.OS !== 'android') {
    return true; // Not applicable on iOS/web (camera access uses the OS picker)
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Requests the browser's Notification permission (web only). FCM web push
 * needs this to be granted before the browser will deliver notifications.
 */
async function requestWebNotificationPermission() {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return false;
  }

  try {
    if (window.Notification.permission === 'granted') {
      return true;
    }
    if (window.Notification.permission === 'denied') {
      return false;
    }
    const result = await window.Notification.requestPermission();
    return result === 'granted';
  } catch (error) {
    console.warn('[Permissions] Web notification request failed', error?.message || error);
    return false;
  }
}

/**
 * Requests the browser's camera permission (web only). Calling getUserMedia
 * triggers the browser's camera prompt; the stream is discarded immediately.
 */
async function requestWebCameraPermission() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function'
  ) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.warn('[Permissions] Web camera request failed', error?.message || error);
    return false;
  }
}

async function updateUserLocation(position) {
  try {
    const coords = position?.coords;
    if (!coords?.latitude || !coords?.longitude) return;

    const lat = coords.latitude;
    const lng = coords.longitude;

    // Resolve a human-readable address so the Home screen header doesn't show
    // "Location unavailable" right after granting permission.
    // NOTE: apiRequest unwraps `{ data }`, so the payload lives directly on
    // the result (NOT under `result.data`, and the field is `formattedAddress`).
    let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const result = await mapsApi.reverseGeocode(lat, lng);
      const formatted = result?.data?.formattedAddress || result?.formattedAddress;
      if (formatted) {
        address = formatted;
      }
    } catch (geocodeError) {
      console.warn('[Permissions] Reverse geocode failed', geocodeError?.message || geocodeError);
    }

    const payload = {
      location: { lat, lng },
      address,
    };
    const user = await customerApi.updateCurrentUser(payload);
    await updateStoredUser(user);
    console.log('[Permissions] User location updated from permission grant');
  } catch (error) {
    console.warn('[Permissions] Failed to update user location', error?.message || error);
  }
}

/**
 * Requests all app permissions (notifications, location, files, calls).
 * If the location permission is granted, the user's current position is
 * captured and saved to the backend.
 */
export async function requestAppPermissions() {
  const results = {
    notifications: false,
    location: false,
    files: false,
    calls: false,
    camera: false,
  };

  // Web: only browser permissions apply (location + notifications + camera).
  // The native FCM / files / calls / camera flow below is Android/iOS only.
  if (Platform.OS === 'web') {
    results.notifications = await requestWebNotificationPermission();

    // getCurrentPosition triggers the browser's geolocation prompt.
    const locationResult = await requestLocationPermission().catch(() => ({
      granted: false,
      position: null,
    }));
    results.location = locationResult.granted;

    // getUserMedia triggers the browser's camera prompt.
    results.camera = await requestWebCameraPermission().catch(() => false);

    // Update the user's location in the database when approved
    if (locationResult.granted && locationResult.position) {
      await updateUserLocation(locationResult.position);
    }

    return results;
  }

  // Notifications (also registers the FCM token with the backend)
  results.notifications = await setupPushNotifications()
    .then(() => true)
    .catch(() => false);

  // Files
  results.files = await requestFilePermission().catch(() => false);

  // Calls
  results.calls = await requestCallPermission().catch(() => false);

  // Camera
  results.camera = await requestCameraPermission().catch(() => false);

  // Location (last, so the OS doesn't queue system prompts incorrectly)
  const locationResult = await requestLocationPermission().catch(() => ({
    granted: false,
    position: null,
  }));
  results.location = locationResult.granted;

  // Update the user's location in the database when approved
  if (locationResult.granted && locationResult.position) {
    await updateUserLocation(locationResult.position);
  }

  return results;
}
