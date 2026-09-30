import { Platform, Alert as RNAlert } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert utility that works on both mobile and web
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean }
  ) => {
    if (Platform.OS === 'web') {
      // Web implementation using browser confirm/alert
      const fullMessage = message ? `${title}\n\n${message}` : title;

      if (!buttons || buttons.length === 0) {
        // Simple alert with OK button
        window.alert(fullMessage);
        return;
      }

      if (buttons.length === 1) {
        // Single button - just show alert
        window.alert(fullMessage);
        if (buttons[0].onPress) {
          buttons[0].onPress();
        }
        return;
      }

      // Multiple buttons - use confirm dialog
      const confirmed = window.confirm(fullMessage);
      
      if (confirmed) {
        // Find the non-cancel button (usually the second/confirm button)
        const confirmButton = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      } else {
        // Find the cancel button
        const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      }
    } else {
      // Mobile - use native Alert
      RNAlert.alert(title, message, buttons, options);
    }
  },
};
