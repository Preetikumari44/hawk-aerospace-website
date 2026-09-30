import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';

import AuthHeader from '../components/AuthHeader';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import CustomTextInput from '../components/CustomTextInput';
import { customerApi, referralApi, updateStoredUser } from '../../utils/api';
import { setupPushNotifications } from '../../utils/notificationService';
import { getPendingReferralCode } from '../../utils/referral';
import { useLanguage } from '../../i18n';

import CheckIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';

// Handles the screen displayed after successful OTP verification, allowing the user to enter their full name
const OtpVerifiedScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const [fullName, setFullName] = useState(routeParams?.user?.name || '');
  const [referralCode, setReferralCode] = useState('');
  const [referralError, setReferralError] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill a code captured from the invite link (deep link / landing page).
  React.useEffect(() => {
    getPendingReferralCode()
      .then((pending) => { if (pending) setReferralCode(pending); })
      .catch(() => {});
  }, []);

  const handleContinue = async () => {
    if (!fullName.trim() || saving) {
      return;
    }

    const cleanReferral = referralCode.toUpperCase().trim();
    if (cleanReferral && !/^(?=.*\d)[A-Z2-9]{6}$/.test(cleanReferral)) {
      setReferralError(t('Enter the 6-letter referral code (e.g. X7K2QM).'));
      return;
    }

    try {
      setSaving(true);
      setReferralError('');
      const user = await customerApi.updateCurrentUser({ name: fullName.trim() });
      await updateStoredUser(user);
      // New users only: attach the invite code (one reward per phone number —
      // re-entering or using another user's code afterwards is ignored).
      if (cleanReferral) {
        try {
          await referralApi.attach(cleanReferral);
        } catch (error) {
          console.error('Failed to attach referral code', error);
          setReferralError(error?.message || t('Could not attach referral code.'));
        }
      }
      setupPushNotifications().catch(() => {});
      onNavigate('Home', { user });
    } catch (error) {
      console.error('Failed to save full name', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={COLORS.primary}>
      <View style={styles.content}>
        
        <View style={styles.topSection}>
          <AuthHeader />
        </View>

        {/* Displays a success message indicating that the OTP has been verified */}
        <View style={styles.successSection}>
          <View style={styles.successIcon}>
            {/* <MaterialIcons name="check" size={24} color={COLORS.white} /> */}
            <CheckIcon width={24} height={24} />
          </View>
          <Text style={styles.successText}>
            {t('OTP Verified Successfully')}
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>
            {t('Enter Full Name')}<Text style={styles.required}> *</Text>
          </Text>

          <CustomTextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('Enter Full Name')}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>
            {t('Referral Code (optional)')}
          </Text>

          <CustomTextInput
            value={referralCode}
            onChangeText={(value) => {
              setReferralCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              if (referralError) setReferralError('');
            }}
            placeholder={t('6-letter code, e.g. X7K2QM')}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
          {!!referralError && (
            <Text style={styles.referralError}>{referralError}</Text>
          )}
        </View>

        <View style={styles.buttonSection}>
          <PrimaryButton
            title={saving ? t('Saving...') : t('Continue')}
            backgroundColor={fullName.trim().length > 0 ? COLORS.white : 'rgba(255,255,255,0.5)'}
            textColor={COLORS.primary}
            onPress={handleContinue}
          />
        </View>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 36, // Maintains consistent vertical rhythm matching previous screens
  },
  topSection: {
    alignItems: 'center',
  },
  successSection: {
    alignItems: 'center',
    gap: 16, // Space between check icon and text
  },
  successIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    color: COLORS.white,
  },
  formSection: {
    width: '100%',
    gap: 10, // Space between label and input field
  },
  label: {
    ...TYPOGRAPHY.bodyMediumEmphasized,
    color: COLORS.white,
  },
  required: {
    color: '#EF4444',
  },
  referralError: {
    ...TYPOGRAPHY.bodyMediumEmphasized,
    color: '#FCA5A5',
  },
  buttonSection: {
    width: '100%',
    paddingTop: 8,
  },
});

export default OtpVerifiedScreen;
