import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';

import AuthHeader from '../components/AuthHeader';
import ScreenContainer from '../components/ScreenContainer';
import PhoneNumberSection from '../components/PhoneNumberSection';
import TermsCheckbox from '../components/TermsCheckbox';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import {
  confirmOtp,
  verifyPhoneNumber,
  classifyAuthError,
  getCurrentFirebaseUser,
  getFirebaseIdToken,
  onFirebaseAuthStateChanged,
  normalizePhone,
} from '../../utils/firebase';
import { startOtpWatcher } from '../../utils/otpAutofill';
import { authApi } from '../../utils/api';
import { completePhoneLogin } from '../../utils/authComplete';
import { useLanguage } from '../../i18n';

const RESEND_COOLDOWN_SECONDS = 30;

const OtpVerificationScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [otpAutoDetecting, setOtpAutoDetecting] = useState(false);
  const [autoDetectError, setAutoDetectError] = useState('');
  // Manual entry is the default. Auto-fill uses the OS one-time-code keyboard
  // suggestion (no SMS permission exists in the app - Play Protect revokes it
  // for side-loaded apps and Google's SMS broker APIs crash alongside Firebase).
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [verificationContext, setVerificationContext] = useState(routeParams?.verificationContext);
  const inputRef = useRef(null);
  const contextRef = useRef(verificationContext);
  const processingRef = useRef(false);
  const otpWatcherCleanupRef = useRef(null);
  const lastAutoFilledRef = useRef('');
  const loginCompletedRef = useRef(false);
  // Capture the Firebase user BEFORE this screen so we only auto-complete login
  // on a FRESH auto-verification (a lingering session must still type the OTP).
  // The value is passed from MobileNumberScreen via verificationContext.preUid.
  const preUidRef = useRef(
    (routeParams?.verificationContext && routeParams.verificationContext.preUid) ||
    getCurrentFirebaseUser()?.uid ||
    null,
  );
  const { mobileNumber } = routeParams || {};

  useEffect(() => {
    contextRef.current = verificationContext;
  }, [verificationContext]);

  // Auto-submit as soon as 6 digits are entered (either typed or auto-filled
  // from the SMS).
  useEffect(() => {
    if (otp.length === 6 && contextRef.current) {
      submitOtpToken(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // Countdown timer for the resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-read the OTP from the incoming SMS.
  // - Android: Google SMS Retriever (hash-based, no permission, no UI).
  // - Web: WebOTP API (browser permission prompt).
  // - iOS: keyboard one-time-code autofill (no code needed here).
const restartOtpWatcher = () => {
    if (otpWatcherCleanupRef.current) {
      otpWatcherCleanupRef.current.stop();
      otpWatcherCleanupRef.current = null;
    }
    setAutoDetectError('');
    let watcher = { supported: false, stop: () => {} };
    try {
      watcher = startOtpWatcher({
        onOtp: autoFillOtp,
        onError: (code, message) => {
          const reason = message || code || 'Unknown';
          console.warn('OTP watcher error: ' + reason);
          setAutoDetectError(reason);
        },
        timeoutMs: 90000,
      });
    } catch (error) {
      console.error('Failed to start OTP watcher:', error);
      setAutoDetectError(String((error && error.message) || error));
    }
    setOtpAutoDetecting(!!watcher.supported);
    otpWatcherCleanupRef.current = watcher;
  };

  useEffect(() => {
    if (!autoFillEnabled) {
      if (otpWatcherCleanupRef.current) {
        otpWatcherCleanupRef.current.stop();
        otpWatcherCleanupRef.current = null;
      }
      setOtpAutoDetecting(false);
      return;
    }
    restartOtpWatcher();
    return () => {
      if (otpWatcherCleanupRef.current) {
        otpWatcherCleanupRef.current.stop();
        otpWatcherCleanupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFillEnabled]);

  // Firebase's signInWithPhoneNumber runs Google's SMS Retriever silently. When
  // the OTP SMS arrives the phone is auto-verified and a Firebase user is signed
  // in WITHOUT any input. We listen for that and complete the backend login
  // automatically (zero typing, zero SMS permission, zero crash).
  const completeVerifiedFirebaseLogin = async (firebaseUser) => {
    if (!firebaseUser || loginCompletedRef.current || processingRef.current) return false;
    const ctx = contextRef.current;
    if (!ctx || ctx._devOtp) return false;
    // Only a FRESH auto-verification counts; a lingering prior session must
    // still go through the OTP manually.
    if (firebaseUser.uid === preUidRef.current) return false;
    if (normalizePhone(firebaseUser.phoneNumber) !== normalizePhone(ctx.phoneNumber)) return false;

    loginCompletedRef.current = true;
    setVerifying(true);
    setOtpAutoDetecting(false);
    try {
      const firebaseIdToken = await getFirebaseIdToken(firebaseUser);
      if (!firebaseIdToken) {
        loginCompletedRef.current = false;
        setVerifying(false);
        return false;
      }
      const authResponse = await authApi.verifyOtp({
        phone: ctx.phoneNumber,
        firebaseIdToken,
      });
      await completePhoneLogin({
        user: authResponse?.user,
        onNavigate,
        onSwitchRole,
        phoneNumber: ctx.phoneNumber,
      });
      return true;
    } catch (error) {
      console.error('Auto-verification login failed, falling back to manual entry:', error);
      loginCompletedRef.current = false;
      setVerifying(false);
      return false;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' || !contextRef.current || contextRef.current._devOtp) return;
    const unsubscribe = onFirebaseAuthStateChanged((firebaseUser) => {
      completeVerifiedFirebaseLogin(firebaseUser);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = async (code) => {
    try {
      // Only the web path reads a code (WebOTP) - copy it there too. On native
      // the OS one-time-code autofill fills the code directly, nothing to copy.
      if (Platform.OS === 'web' && window?.navigator?.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(code);
      }
    } catch (error) {
      // Clipboard is best-effort - never crash.
    }
  };

  const autoFillOtp = (code) => {
    if (!code || verifying || processingRef.current) return;
    // The SMS may be delivered through two paths (SMS_RECEIVED and the SMS
    // Retriever) - process the code only once.
    if (lastAutoFilledRef.current === code) return;
    lastAutoFilledRef.current = code;
    copyToClipboard(code);
    setOtpAutoDetecting(false);
    setOtp(code);
  };

  const notify = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert(title, message);
    }
  };

  const submitOtpToken = async (code) => {
    if (!code || code.length < 6) return;
    if (processingRef.current || verifying) return;
    const ctx = contextRef.current;
    if (!ctx) return;

    processingRef.current = true;
    setVerifying(true);
    Keyboard.dismiss();

    try {
      const authResponse = await confirmOtp(ctx, code);
      processingRef.current = false;
      setVerifying(false);
      setOtpAutoDetecting(false);
      loginCompletedRef.current = true;
      await completePhoneLogin({
        user: authResponse?.user,
        onNavigate,
        onSwitchRole,
        phoneNumber: ctx?.phoneNumber,
      });
    } catch (error) {
      const info = classifyAuthError(error);
      const errorMessage =
        info?.message || error?.message || t('The OTP code submitted is incorrect or has expired.');
      console.error('OTP Validation Exception: ', error);

      processingRef.current = false;
      setVerifying(false);
      setOtp('');
      lastAutoFilledRef.current = '';
      // Let the user resend immediately if they choose to - the code is never
      // resent automatically for a wrong/incorrect entry.
      setResendCooldown(0);

      const errorCode = info?.code;
      if (errorCode === 'auth/invalid-verification-code' || errorCode === 'auth/verification-code-not-found') {
        // Wrong code: simply inform the user and let them retry. A new OTP is
        // NEVER auto-sent for an incorrect entry.
        notify(
          t('Invalid Code'),
          t('The code you entered is incorrect. Please enter the correct OTP.'),
        );
        return;
      }
      if (errorCode === 'auth/code-expired' || errorCode === 'auth/session-expired') {
        notify(
          t('Invalid Code'),
          t('The code has expired. Please resend the OTP and try again.'),
        );
        return;
      }
      notify(t('Invalid Code'), errorMessage);
    }
  };

  const handleResendOtp = async () => {
    const phoneNumber = contextRef.current?.phoneNumber;
    if (!phoneNumber || resending) return;
    if (verifying) return;
    if (resendCooldown > 0) return;

    setResending(true);
    setOtp('');
    lastAutoFilledRef.current = '';
    Keyboard.dismiss();
    if (autoFillEnabled) restartOtpWatcher();
    try {
      // forceResending=true makes Firebase send a brand-new SMS on native.
      const newContext = await verifyPhoneNumber(phoneNumber, true);
      contextRef.current = newContext;
      setVerificationContext(newContext);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      notify(t('OTP Resent'), t('A new OTP has been sent to your mobile number.'));
    } catch (error) {
      const info = classifyAuthError(error);
      const errorMessage =
        info?.message || error?.message || t('Could not resend the OTP.');
      console.error('Resend OTP Error: ', error);
      notify(t('Resend Failed'), errorMessage);
    } finally {
      setResending(false);
    }
  };

  const handleCellPress = () => {
    if (!verifying) inputRef.current?.focus();
  };

  // Auto-fill never reads the SMS itself - it keeps the OTP box focused so the
  // SYSTEM keyboard can show its "Use OTP 123456" suggestion when the SMS
  // arrives. No SMS permission is used or requested here (installing with SMS
  // permissions makes Play Protect revoke them for side-loaded apps).
  const handleEnableAutoFill = () => {
    if (verifying) return;
    setAutoDetectError('');
    setAutoFillEnabled(true);
    inputRef.current?.focus();
  };

  const handleDisableAutoFill = () => {
    if (verifying) return;
    setAutoFillEnabled(false);
    setAutoDetectError('');
    inputRef.current?.focus();
  };

  // On web, use viewport-aware OTP cell sizing so 6 cells + gaps never overflow
  // a 320px compact phone screen. Native keeps the fixed 48px design.
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const cellWidth = isWeb
    ? Math.max(34, Math.min(48, Math.floor((windowWidth - 88) / 6)))
    : 48;
  const cellFontSize = isWeb ? Math.max(26, Math.min(40, cellWidth - 8)) : 40;

  // Same web-only fix as MobileNumberScreen: the whole-screen
  // <TouchableWithoutFeedback onPress={Keyboard.dismiss}> steals the click from
  // the hidden OTP TextInput on web and blurs it immediately. We only render it
  // on native.
  const content = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <AuthHeader />
          <Text style={styles.heading}>
            {t("Let's Login to Continue")}
          </Text>
        </View>

        <View style={styles.formSection}>
          <PhoneNumberSection
            mobileNumber={mobileNumber}
            readOnly={true}
          />
          <TermsCheckbox checked={true} />
        </View>

        <View style={styles.otpSection}>
          <Text style={[styles.heading, { fontSize: 14, marginBottom: 12 }]}>
            {verifying ? t("Verifying Credentials...") : t("Enter 6-Digit OTP Received")}
          </Text>
          <View style={styles.modeSelector}>
            <Pressable
              onPress={handleEnableAutoFill}
              style={[styles.modeChip, autoFillEnabled && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, autoFillEnabled && styles.modeChipTextActive]}>
                {t('Auto-fill OTP')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDisableAutoFill}
              style={[styles.modeChip, !autoFillEnabled && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, !autoFillEnabled && styles.modeChipTextActive]}>
                {t('Enter manually')}
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.otpTouchArea}
            onPress={handleCellPress}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
          >
            <View style={styles.otpInputContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFocused = otp.length === index;
                const hasValue = otp.length > index;

                return (
                  <View
                    key={index}
                    style={[
                      styles.cell,
                      { width: cellWidth, height: isWeb ? cellWidth + 16 : 64 },
                      isFocused && styles.cellFocused,
                      hasValue && styles.cellFilled
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={[styles.cellText, { fontSize: cellFontSize }]}>{otp[index] || ''}</Text>
                  </View>
                );
              })}
            </View>

            {/* Hidden full-area input: tapping anywhere in the OTP row opens the
                keyboard (no precise clicks needed). On iOS/web this input also
                drives native one-time-code autofill. */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
              maxLength={6}
              keyboardType="number-pad"
              inputMode="numeric"
              autoFocus={true}
              editable={!verifying}
              caretHidden={true}
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            />
          </Pressable>
          {!verifying && otp.length === 0 && (
            <View style={styles.autoDetectWrap}>
              {!autoFillEnabled ? (
                <Text style={styles.autoDetectHint}>
                  {t("Tap 'Auto-fill OTP' to use the system keyboard's code suggestion.")}
                </Text>
              ) : otpAutoDetecting ? (
                <Text style={styles.autoDetectHint}>
                  {t('Auto-detecting OTP from SMS...')}
                </Text>
              ) : (
                <Text style={styles.autoDetectHint}>
                  {t('When the OTP arrives, tap the suggested code above the keyboard, or type it below.')}
                </Text>
              )}
              {autoDetectError && (
                <Text style={styles.autoDetectError}>
                  {t('Auto-fill disabled: {{reason}}', { reason: autoDetectError })}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.resendSection}>
          <Text style={styles.resendHint}>{t("Didn't receive the code?")}</Text>
          <Pressable
            onPress={handleResendOtp}
            disabled={resendCooldown > 0 || resending || verifying}
            style={[
              styles.resendButton,
              (resendCooldown > 0 || resending || verifying) && styles.resendButtonDisabled,
            ]}
          >
            {resending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.resendButtonText}>{t('Resend OTP')}</Text>
            )}
          </Pressable>
          {resendCooldown > 0 && (
            <Text style={styles.resendCountdown}>
              {t('Resend OTP in {{seconds}}s', { seconds: resendCooldown })}
            </Text>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <ScreenContainer backgroundColor={COLORS.primary}>
      {isWeb ? (
        content
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {content}
        </TouchableWithoutFeedback>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 40 },
  topSection: { alignItems: 'center', gap: 24 },
  heading: { ...TYPOGRAPHY.titleLargeEmphasized, color: COLORS.white },
  formSection: { width: '100%', gap: 16 },

  otpSection: {
    paddingVertical: 48,
    alignItems: 'center',
    width: '100%',
  },
  // Large invisible touch target that wraps the visible cells. The hidden input
  // lives inside it and covers the whole area, so a tap anywhere (not just on a
  // single cell) opens the keyboard.
  otpTouchArea: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  otpInputContainer: {
    flexDirection: 'row',
    gap: 8, // Exact Figma gap
    justifyContent: 'center',
    width: '100%',
  },
  cell: {
    width: 48,
    height: 64, // Slightly taller to fit large text and border
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)', // Dimmed underline when inactive
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocused: {
    borderBottomColor: '#FFFFFF', // Bright white when focused
  },
  cellFilled: {
    borderBottomColor: '#FFFFFF',
  },
  cellText: {
    fontSize: 40, // Increased to match the large text in the image
    fontFamily: 'Roboto-Medium',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Full coverage (with a small negative margin) so the whole OTP row is a
  // single clickable keyboard trigger. Fully invisible (opacity 0) so typed
  // digits never appear twice next to the cells - the visible boxes render the
  // same value from state.
  hiddenInput: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    opacity: 0,
    zIndex: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  modeChipText: {
    ...TYPOGRAPHY.bodyMedium,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  modeChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  autoDetectHint: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    textAlign: 'center',
  },
  autoDetectWrap: {
    alignItems: 'center',
  },
  autoDetectError: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 6,
    textAlign: 'center',
  },

  resendSection: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  resendHint: {
    ...TYPOGRAPHY.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  resendCountdown: {
    ...TYPOGRAPHY.bodyMediumEmphasized,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  resendButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  resendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  resendButtonText: {
    ...TYPOGRAPHY.bodyMediumEmphasized,
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default OtpVerificationScreen;