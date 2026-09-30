import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';

import AuthHeader from '../components/AuthHeader';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import PhoneNumberSection from '../components/PhoneNumberSection';
import TermsCheckbox from '../components/TermsCheckbox';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import {
  verifyPhoneNumber,
  classifyAuthError,
  getCurrentFirebaseUser,
  getFirebaseIdToken,
  normalizePhone,
} from '../../utils/firebase';
import { setApiBaseUrl, authApi } from '../../utils/api';
import { completePhoneLogin } from '../../utils/authComplete';
import { useLanguage } from '../../i18n';

// Handles mobile number input and verification flow
const MobileNumberScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerifyRequest = () => {
    const digitsOnly = mobileNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10 || !isChecked) return;

    const normalizedCountryCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const fullPhoneNumber = `${normalizedCountryCode}${digitsOnly}`;

    const confirmAndProceed = () => {
      doVerify(fullPhoneNumber);
    };

    // Show a confirmation popup so the user can double-check the number before
    // the OTP is sent. Confirming proceeds; dismissing keeps them on the screen
    // to edit the number.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        if (window.confirm(t('Send OTP to {{phone}}?', { phone: fullPhoneNumber }))) {
          confirmAndProceed();
        }
      } else {
        confirmAndProceed();
      }
      return;
    }

    Alert.alert(
      t('Confirm Mobile Number'),
      t('We will send an OTP to {{phone}}. Please confirm the number is correct.', {
        phone: fullPhoneNumber,
      }),
      [
        { text: t('Edit'), style: 'cancel' },
        { text: t('Confirm'), onPress: confirmAndProceed },
      ],
    );
  };

  const doVerify = async (fullPhoneNumber) => {
    setLoading(true);

    try {
      if (routeParams?.apiBaseUrl) {
        await setApiBaseUrl(routeParams.apiBaseUrl);
      }
      // Remember the pre-existing Firebase user (if any) so we only treat a
      // FRESH auto-verification as a completed login, never a lingering session.
      const preUid = getCurrentFirebaseUser()?.uid || null;
      const confirmationResult = await verifyPhoneNumber(fullPhoneNumber);

      // On native, Firebase's signInWithPhoneNumber runs Google's SMS Retriever.
      // If the phone was already auto-verified while the SMS was requested, the
      // Firebase user is signed in right now - complete the login directly.
      if (Platform.OS !== 'web' && !confirmationResult?._devOtp) {
        const firebaseUser = getCurrentFirebaseUser();
        const isFreshSignIn = !!firebaseUser && firebaseUser.uid !== preUid;
        const phoneMatches =
          !!firebaseUser &&
          normalizePhone(firebaseUser.phoneNumber) === normalizePhone(fullPhoneNumber);
        if (isFreshSignIn && phoneMatches) {
          const firebaseIdToken = await getFirebaseIdToken(firebaseUser);
          if (firebaseIdToken) {
            const authResponse = await authApi.verifyOtp({
              phone: fullPhoneNumber,
              firebaseIdToken,
            });
            setLoading(false);
            await completePhoneLogin({
              user: authResponse?.user,
              onNavigate,
              onSwitchRole,
              phoneNumber: fullPhoneNumber,
            });
            return;
          }
        }
      }

      setLoading(false);
      onNavigate('OtpVerificationScreen', {
        verificationContext: {
          ...confirmationResult,
          preUid: preUid || getCurrentFirebaseUser()?.uid || null,
        },
        mobileNumber,
      });
    } catch (error) {
      setLoading(false);
      console.error("Authentication Request Error: ", error);

      const info = classifyAuthError(error);
      const errorMessage =
        info?.message || error?.message || t("Could not dispatch verification SMS.");
      if (Platform.OS === 'web') {
        window.alert(t('Auth Failed: {{errorMessage}}', { errorMessage }));
      } else {
        Alert.alert(t('Auth Failed'), errorMessage);
      }
    }
  };

  // On web the whole-screen <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  // steals the click from the phone input and immediately blurs it (the caret
  // appears once and vanishes, and the keyboard never opens). We therefore only
  // render that tap-to-dismiss wrapper on native. The ScrollView below already
  // lets users dismiss by tapping outside via keyboardShouldPersistTaps.
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
        // Ensure the phone input keeps focus once clicked on web.
        overScrollMode="always"
      >
        {/* Top Section: Header & Title */}
        <View style={styles.topSection}>
          <AuthHeader />
          <Text style={styles.heading}>
            {t("Let's Login to Continue")}
          </Text>
        </View>

        {/* Middle Section: Form inputs */}
        <View style={styles.formSection}>
          <PhoneNumberSection
            mobileNumber={mobileNumber}
            onChangeText={setMobileNumber}
            countryCode={countryCode}
            onChangeCountryCode={setCountryCode}
            readOnly={loading}
          />
          <TermsCheckbox
            checked={isChecked}
            onPress={() => !loading && setIsChecked(!isChecked)}
          />
        </View>

        {/* Bottom Section: Action Button */}
        <View style={styles.buttonSection}>
          <PrimaryButton
            title={loading ? t("Sending...") : t("Verify")}
            // Disables button visually if conditions aren't met
            backgroundColor={mobileNumber.replace(/\D/g, '').length === 10 && isChecked && !loading ? COLORS.white : 'rgba(255,255,255,0.5)'}
            textColor={COLORS.primary}
            onPress={handleVerifyRequest}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <ScreenContainer backgroundColor={COLORS.primary}>
      {Platform.OS === 'web' ? (
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 40, // Main gap separating Top, Form, and Button sections
  },
  topSection: {
    alignItems: 'center',
    gap: 24, // Space between AuthHeader and "Let's Login to Continue"
  },
  heading: {
    ...TYPOGRAPHY.titleLargeEmphasized, 
    color: COLORS.white,
  },
  formSection: {
    width: '100%',
    gap: 16, // Space between phone input and checkbox
  },
  buttonSection: {
    width: '100%',
    paddingTop: 10,
  },
});

export default MobileNumberScreen;
