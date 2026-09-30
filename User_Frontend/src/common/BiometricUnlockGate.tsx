import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, AppState } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '../i18n';
import {
  loadBiometricSettings,
  isAppUnlockEnabled,
  promptBiometric,
  isBiometricAuthRecent,
  recordBiometricAuth,
} from '../utils/biometrics';

interface BiometricUnlockGateProps {
  children: React.ReactNode;
  enabled?: boolean;
}

const FingerprintIcon = () => (
  <Svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#5060D3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <Path d="M14 13.12c0 2.38-.28 4.23-.48 5.38" />
    <Path d="M16 10.5c0 3.82-.45 6.83-.75 8.5" />
    <Path d="M18 10a6 6 0 0 0-12 0c0 4.17-.67 8.35-1 10" />
    <Path d="M20 10a8 8 0 0 0-16 0c0 4.79-.83 9.58-1 11" />
    <Path d="M12 6a4 4 0 0 0-4 4c0 2.76-.28 6.27-.5 8" />
  </Svg>
);

/**
 * Wraps the app content. When running on Android/iOS and the user has enabled
 * biometric login, it asks for a fingerprint / Face ID prompt before revealing
 * the app if more than 10 minutes have elapsed since the last biometric auth.
 * On web this gate is a no-op (biometrics are only available inside the native app).
 */
const BiometricUnlockGate: React.FC<BiometricUnlockGateProps> = ({ children, enabled = true }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [prompting, setPrompting] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = async () => {
    setPrompting(true);
    setFailed(false);
    const ok = await promptBiometric(t('Unlock Hawk Aero'));
    setPrompting(false);
    if (ok) {
      await recordBiometricAuth();
      setStatus('unlocked');
    } else {
      setFailed(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Biometrics only work inside the Android/iOS app. On web we never lock.
      if (!enabled || (Platform.OS !== 'android' && Platform.OS !== 'ios')) {
        if (mounted) setStatus('unlocked');
        return;
      }

      const settings = await loadBiometricSettings();
      if (!mounted) return;

      if (!isAppUnlockEnabled(settings)) {
        setStatus('unlocked');
        return;
      }

      // Check if user authenticated within the 10-minute grace period
      const recent = await isBiometricAuthRecent();
      if (recent) {
        setStatus('unlocked');
        return;
      }

      setStatus('locked');
      setPrompting(true);
      const ok = await promptBiometric(t('Unlock Hawk Aero'));
      if (!mounted) return;
      setPrompting(false);

      if (ok) {
        await recordBiometricAuth();
        setStatus('unlocked');
      } else {
        setFailed(true);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the app comes back to foreground, re-check if the 10-minute window has expired
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      (async () => {
        const settings = await loadBiometricSettings();
        if (!isAppUnlockEnabled(settings)) return;

        // Skip prompt if user authenticated within the last 10 minutes
        const recent = await isBiometricAuthRecent();
        if (recent) {
          setStatus('unlocked');
          return;
        }

        setStatus('locked');
        setPrompting(true);
        setFailed(false);
        const ok = await promptBiometric(t('Unlock Hawk Aero'));
        setPrompting(false);
        if (ok) {
          await recordBiometricAuth();
          setStatus('unlocked');
        } else {
          setFailed(true);
        }
      })();
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <FingerprintIcon />
        </View>
        <Text style={styles.title}>{t('Biometric Login')}</Text>
        <Text style={styles.subtitle}>{t('Unlock with fingerprint / Face ID, or use your device PIN, pattern or password when prompted')}</Text>

        {failed && (
          <Text style={styles.errorText}>{t('Could not verify. Try again, or choose device PIN / pattern / password in the system dialog.')}</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, (pressed || prompting) && styles.buttonPressed]}
          onPress={tryUnlock}
          disabled={prompting}
        >
          {prompting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t('Unlock')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    paddingTop: 36,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Roboto-Medium',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#5060D3',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    minHeight: 46,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default BiometricUnlockGate;