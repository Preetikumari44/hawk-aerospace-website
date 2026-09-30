import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import { checkForUpdate, downloadApk, installApk } from '../utils/updateChecker';
import { useLanguage } from '../i18n';

// The in-app APK update overlay is an Android-only feature. The APK download /
// install flow relies on the native ApkInstaller module, so it must never show
// on web or iOS.
const IS_ANDROID = Platform.OS === 'android';

const UpdateOverlay = ({ children }) => {
  const { t, locale } = useLanguage();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [step, setStep] = useState('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const checkingRef = useRef(false);

  const checkUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      setStep('checking');
      const info = await checkForUpdate();

      if (info) {
        setUpdateInfo(info);
        setStep('available');
      } else {
        setStep('none');
      }
    } catch {
      setStep('none');
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!IS_ANDROID) {
      setStep('none');
      return;
    }
    checkUpdate();
  }, [checkUpdate]);

  useEffect(() => {
    if (updateInfo?.forceUpdate) {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => handler.remove();
    }
  }, [updateInfo]);

  const handleDownload = async () => {
    if (!updateInfo) return;

    try {
      setStep('downloading');
      setProgress(0);
      setError(null);

      const filePath = await downloadApk(updateInfo.downloadUrl, (p) => {
        setProgress(p);
      });

      setStep('installing');
      await installApk(filePath);

      setStep('done');
    } catch (err) {
      setError(err.message || t('Download failed'));
      setStep('available');
    }
  };

  const handleSkip = () => {
    setStep('none');
  };

  if (step === 'checking' || step === 'none') {
    return <>{children}</>;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {children}
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {step === 'checking' && (
              <>
                <ActivityIndicator size="large" color="#5060D3" />
                <Text style={styles.title}>{t('Checking for updates...')}</Text>
              </>
            )}

            {step === 'available' && (
              <>
                <Text style={styles.title}>{t('Update Available')}</Text>
                <Text style={styles.version}>
                  {t('v{{version}}', { version: updateInfo?.versionName })}
                </Text>
                <Text style={styles.notes}>
                  {updateInfo?.releaseNotes}
                </Text>
                <View style={styles.buttons}>
                  {!updateInfo?.forceUpdate && (
                    <TouchableOpacity
                      style={[styles.btn, styles.skipBtn]}
                      onPress={handleSkip}
                    >
                      <Text style={styles.skipText}>{t('Later')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.btn, styles.updateBtn]}
                    onPress={handleDownload}
                  >
                    <Text style={styles.updateText}>{t('Update')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 'downloading' && (
              <>
                <ActivityIndicator size="large" color="#5060D3" />
                <Text style={styles.title}>
                  {t('Downloading update...')}
                </Text>
                <Text style={styles.progressText}>
                  {t('{{progress}}%', { progress: Math.round(progress * 100) })}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${progress * 100}%` }]}
                  />
                </View>
              </>
            )}

            {step === 'installing' && (
              <>
                <ActivityIndicator size="large" color="#5060D3" />
                <Text style={styles.title}>{t('Installing update...')}</Text>
              </>
            )}

            {step === 'done' && (
              <>
                <Text style={styles.title}>{t('Update Downloaded')}</Text>
                <Text style={styles.message}>
                  {t('The installer should open automatically. Please install the new version.')}
                </Text>
                <TouchableOpacity
                  style={[styles.btn, styles.updateBtn]}
                  onPress={() => setStep('none')}
                >
                  <Text style={styles.updateText}>{t('OK')}</Text>
                </TouchableOpacity>
              </>
            )}

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 16,
    textAlign: 'center',
  },
  version: {
    fontSize: 16,
    color: '#5060D3',
    fontWeight: '600',
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: '#f0f0f0',
  },
  updateBtn: {
    backgroundColor: '#5060D3',
  },
  skipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  updateText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5060D3',
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5060D3',
    borderRadius: 3,
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default UpdateOverlay;
