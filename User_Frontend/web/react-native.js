export * from 'react-native-web';

// BackHandler is Android-only; react-native-web only ships a stub that logs a
// warning every time it is used. Override it with a silent no-op for the web
// build (the app's back-button handlers are Android-only).
export const BackHandler = {
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
  exitApp: () => {},
};

// PermissionsAndroid is Android-only and not exported by react-native-web.
// All usages in the app are guarded by Platform.OS === 'android', so a safe
// no-op stub is enough for the web build.
const PERMISSIONS = {
  ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
  READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  CALL_PHONE: 'android.permission.CALL_PHONE',
  CAMERA: 'android.permission.CAMERA',
  POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
};

const RESULTS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  NEVER_ASK_AGAIN: 'never_ask_again',
};

export const PermissionsAndroid = {
  PERMISSIONS,
  RESULTS,
  async request() {
    return RESULTS.GRANTED;
  },
  async check() {
    return RESULTS.GRANTED;
  },
  async requestMultiple(permissions) {
    return Object.keys(permissions || {}).reduce((acc, key) => {
      acc[key] = RESULTS.GRANTED;
      return acc;
    }, {});
  },
};
