import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert.
 * Uses the browser `window.alert` on web and React Native's `Alert.alert`
 * on native (iOS/Android), where `window.alert` does not exist.
 */
export const showAlert = (message: string, title = '') => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(title ? `${title}\n\n${message}` : message);
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Cross-platform confirmation dialog.
 *
 * Returns a Promise<boolean> so it works the same on both platforms:
 *  - Web: resolves synchronously with the result of `window.confirm`.
 *  - Native: shows an `Alert.alert` with Cancel / OK buttons and resolves
 *    to `true` (OK) or `false` (Cancel / dismiss).
 *
 * Usage: `if (await showConfirm('Are you sure?')) { ... }`
 */
export const showConfirm = (
  message: string,
  title = 'Confirm',
): Promise<boolean> => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
};
