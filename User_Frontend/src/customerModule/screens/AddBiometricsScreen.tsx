import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenContainer from '../components/ScreenContainer';
import { useLanguage } from '../../i18n';
import {
  checkBiometricSupport,
  loadBiometricSettings,
  saveBiometricSettings,
  promptBiometric,
  recordBiometricAuth,
  EMPTY_BIOMETRIC_SETTINGS,
  type BiometricSettings,
} from '../../utils/biometrics';

// --- CUSTOM SVG ICONS ---
const ArrowBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2F3542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const FingerprintIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5060D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <Path d="M14 13.12c0 2.38-.28 4.23-.48 5.38" />
    <Path d="M16 10.5c0 3.82-.45 6.83-.75 8.5" />
    <Path d="M18 10a6 6 0 0 0-12 0c0 4.17-.67 8.35-1 10" />
    <Path d="M20 10a8 8 0 0 0-16 0c0 4.79-.83 9.58-1 11" />
    <Path d="M12 6a4 4 0 0 0-4 4c0 2.76-.28 6.27-.5 8" />
  </Svg>
);

// Custom Toggle Component matching Figma Pill Toggle
const SwitchToggle = ({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) => (
  <Pressable
    onPress={onToggle}
    disabled={disabled}
    style={[styles.toggleTrack, value ? styles.toggleTrackActive : styles.toggleTrackInactive, disabled && styles.toggleDisabled]}
  >
    <View style={[styles.toggleThumb, value ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
  </Pressable>
);

interface BiometricsScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  onSwitchRole?: (role: string) => void;
  routeParams?: any;
}

const AddBiometricsScreen: React.FC<BiometricsScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 600;

  const [settings, setSettings] = useState<BiometricSettings>(EMPTY_BIOMETRIC_SETTINGS);
  const [support, setSupport] = useState<'loading' | 'web' | 'available' | 'unavailable'>('loading');
  const [verifying, setVerifying] = useState<'fingerprint' | 'face' | 'transactions' | null>(null);
  const [saving, setSaving] = useState(false);

  // Load saved settings on mount and verify the device actually has a supported biometric sensor.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [savedSettings, biometricSupport] = await Promise.all([
          loadBiometricSettings(),
          checkBiometricSupport(),
        ]);

        if (!mounted) return;
        setSupport(biometricSupport.status === 'available'
          ? 'available'
          : biometricSupport.status === 'web'
            ? 'web'
            : 'unavailable');
        setSettings(savedSettings);
      } catch {
        if (mounted) setSupport('unavailable');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const requireBiometricPrompt = useCallback(async (kind: 'fingerprint' | 'face' | 'transactions'): Promise<boolean> => {
    const promptMessage =
      kind === 'transactions' ? t('Confirm payments using biometrics') :
      kind === 'face' ? t('Unlock app with Face ID') :
      t('Unlock app with your fingerprint');

    return promptBiometric(promptMessage);
  }, [t]);

  const handleToggleFingerprint = async () => {
    if (settings.fingerprintEnabled) {
      setSettings((prev) => ({ ...prev, fingerprintEnabled: false }));
      return;
    }

    setVerifying('fingerprint');
    const ok = await requireBiometricPrompt('fingerprint');
    setVerifying(null);

    if (ok) {
      await recordBiometricAuth();
      setSettings((prev) => ({ ...prev, fingerprintEnabled: true }));
    } else {
      Alert.alert(t('Authentication Failed'), t('Your fingerprint could not be verified. Please try again.'));
    }
  };

  const handleToggleFace = async () => {
    if (settings.faceIdEnabled) {
      setSettings((prev) => ({ ...prev, faceIdEnabled: false }));
      return;
    }

    setVerifying('face');
    const ok = await requireBiometricPrompt('face');
    setVerifying(null);

    if (ok) {
      await recordBiometricAuth();
      setSettings((prev) => ({ ...prev, faceIdEnabled: true }));
    } else {
      Alert.alert(t('Authentication Failed'), t('Your face could not be verified. Please try again.'));
    }
  };

  const handleToggleTransactions = async () => {
    if (settings.transactionsEnabled) {
      setSettings((prev) => ({ ...prev, transactionsEnabled: false }));
      return;
    }

    setVerifying('transactions');
    const ok = await requireBiometricPrompt('transactions');
    setVerifying(null);

    if (ok) {
      await recordBiometricAuth();
      setSettings((prev) => ({ ...prev, transactionsEnabled: true }));
    } else {
      Alert.alert(t('Authentication Failed'), t('Your biometrics could not be verified. Please try again.'));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    if (settings.fingerprintEnabled || settings.faceIdEnabled || settings.transactionsEnabled) {
      await recordBiometricAuth();
    }
    await saveBiometricSettings(settings);
    setSaving(false);

    if (typeof onNavigate === 'function') {
      onNavigate('Account');
    }
  };

  const handleBackPress = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('Account');
    }
  };

  if (support === 'unavailable' || support === 'web') {
    return (
      <ScreenContainer backgroundColor={isWebDesktop ? "transparent" : "#FAFAFA"}>
        <View style={[styles.outerWrapper, isWebDesktop && styles.desktopFlat]}>
          <View style={[styles.header, isWebDesktop && styles.desktopHeader]}>
            <Pressable onPress={handleBackPress} hitSlop={12} style={styles.backBtn}>
              <ArrowBack />
            </Pressable>
            <Text style={styles.heading}>{t('Biometrics')}</Text>
          </View>
          <View style={styles.unavailableBox}>
            <View style={styles.iconCircle}>
              <FingerprintIcon />
            </View>
            <Text style={styles.unavailableTitle}>{t("Can't Enable Biometrics")}</Text>
            <Text style={styles.unavailableText}>
              {support === 'web'
                ? t('Biometrics is only available in the app. Please download the Hawk Aero app to use this feature.')
                : t('Biometrics is not available on your phone.')}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (support === 'loading') {
    return (
      <ScreenContainer backgroundColor={isWebDesktop ? "transparent" : "#FAFAFA"}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#5060D3" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={isWebDesktop ? "transparent" : "#FAFAFA"}>
      <View style={[styles.outerWrapper, isWebDesktop && styles.desktopFlat]}>

        {/* Header Section */}
        <View style={[styles.header, isWebDesktop && styles.desktopHeader]}>
          <Pressable onPress={handleBackPress} hitSlop={12} style={styles.backBtn}>
            <ArrowBack />
          </Pressable>
          <Text style={styles.heading}>{t('Biometrics')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isWebDesktop && styles.desktopContent]}>

          {/* Main Card Icon Header */}
          <View style={styles.titleSection}>
            <View style={styles.iconCircle}>
              <FingerprintIcon />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.mainTitle}>{t('Biometric Security')}</Text>
              <Text style={styles.mainSub}>
                {t('Secure your account using your device’s biometric sensors.')}
              </Text>
            </View>
          </View>

          {/* Setting Row 1: Fingerprint Login (Android only) */}
          {Platform.OS === 'android' && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.textCol}>
                  <Text style={styles.rowTitle}>{t('Fingerprint Login')}</Text>
                  <Text style={styles.rowSub}>{t('Unlock app with your fingerprint')}</Text>
                </View>
                {verifying === 'fingerprint' ? (
                  <ActivityIndicator size="small" color="#5060D3" />
                ) : (
                  <SwitchToggle
                    value={settings.fingerprintEnabled}
                    onToggle={handleToggleFingerprint}
                  />
                )}
              </View>
              <View style={styles.divider} />

              {/* Setting Row 2: Face Unlock Login (Android) */}
              <View style={styles.settingRow}>
                <View style={styles.textCol}>
                  <Text style={styles.rowTitle}>{t('Face ID Login')}</Text>
                  <Text style={styles.rowSub}>{t('Use facial recognition to log in')}</Text>
                </View>
                {verifying === 'face' ? (
                  <ActivityIndicator size="small" color="#5060D3" />
                ) : (
                  <SwitchToggle
                    value={settings.faceIdEnabled}
                    onToggle={handleToggleFace}
                  />
                )}
              </View>
            </>
          )}

          {/* Setting Row 2: Face ID Login (iOS only - biometrics on iOS uses Face ID) */}
          {Platform.OS === 'ios' && (
            <View style={styles.settingRow}>
              <View style={styles.textCol}>
                <Text style={styles.rowTitle}>{t('Face ID Login')}</Text>
                <Text style={styles.rowSub}>{t('Use facial recognition to log in')}</Text>
              </View>
              {verifying === 'face' ? (
                <ActivityIndicator size="small" color="#5060D3" />
              ) : (
                <SwitchToggle
                  value={settings.faceIdEnabled}
                  onToggle={handleToggleFace}
                />
              )}
            </View>
          )}
          <View style={styles.divider} />

          {/* Setting Row 3: Biometric for Transactions */}
          <View style={styles.settingRow}>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>{t('Biometric for Transactions')}</Text>
              <Text style={styles.rowSub}>{t('Confirm payments using biometrics')}</Text>
            </View>
            {verifying === 'transactions' ? (
              <ActivityIndicator size="small" color="#5060D3" />
            ) : (
              <SwitchToggle
                value={settings.transactionsEnabled}
                onToggle={handleToggleTransactions}
              />
            )}
          </View>

          {/* Primary Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSaveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('Save Settings')}</Text>
            )}
          </Pressable>

        </ScrollView>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  desktopFlat: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  desktopHeader: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 28,
  },
  backBtn: {
    marginRight: 14,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxWidth: 480,
  },
  desktopContent: {
    paddingHorizontal: 0,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  titleTextCol: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 4,
  },
  mainSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textCol: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F3542',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },

  // Custom Switch Styles
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackInactive: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  toggleTrackActive: {
    backgroundColor: '#5060D3',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbInactive: {
    backgroundColor: '#6B7280',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },

  // Save Settings Button
  saveButton: {
    backgroundColor: '#5060D3',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading / Unavailable states
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  unavailableBox: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    textAlign: 'center',
  },
});

export default AddBiometricsScreen;