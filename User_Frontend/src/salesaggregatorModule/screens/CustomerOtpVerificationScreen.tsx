import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../../i18n';
import { aggregatorApi } from '../../utils/api';
import { useTabBarPadding } from '../../utils/responsive';

const CustomerOtpVerificationScreen: React.FC<{ onNavigate?: any, routeParams?: any }> = ({ onNavigate, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const customerMobile = routeParams?.customerMobile || '';
  const customerDetails = routeParams?.customerDetails || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const isOtpComplete = otp.every(digit => digit !== '');

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.replace(/\D/g, '');
    setOtp(newOtp);

    if (text.length !== 0 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtpAndProceed = async () => {
    if (!isOtpComplete || isVerifying) return;
    setIsVerifying(true);

    try {
      const result = await aggregatorApi.verifyCustomerOtp({
        phone: `+91${customerMobile}`,
        otp: otp.join(''),
      });

      const customerUid = result?.customerUid || result?.customer?.uid;

      if (!customerUid) {
        throw new Error('Customer verification succeeded but no customer id was returned.');
      }

      if (onNavigate) {
        const bookingParams = { ...routeParams };
        delete bookingParams.customerMobile;
        delete bookingParams.customerDetails;

        onNavigate('FarmLocationScreen', {
          ...bookingParams,
          customerUid,
          customerName: result?.customer?.name || customerDetails?.name || '',
          customerPhone: customerMobile,
          customerAddress: customerDetails?.address || '',
          customerEmail: customerDetails?.email || '',
        });
      }
    } catch (error: any) {
      Alert.alert(t('Verification Failed'), error?.message || t('Invalid or expired OTP. Please try again.'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending || isVerifying) return;
    setIsResending(true);
    try {
      await aggregatorApi.sendCustomerOtp({
        name: customerDetails?.name || 'Customer',
        phone: `+91${customerMobile}`,
        address: customerDetails?.address || '',
        email: customerDetails?.email || undefined,
      });
      Alert.alert(t('OTP Sent'), t('A new OTP has been sent to this number.'));
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('Could not resend OTP. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('Back')} style={styles.backBtn} disabled={isVerifying}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('OTP Verification')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>{t("Verify Customer's Number with OTP")}</Text>
        <Text style={styles.subHeading}>
          {t('An OTP has been sent to this number. Go back to change the Mobile Number')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('Customer Mobile Number ')}<Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.mobileRow}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryCodeText}>+91</Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color="#5A6478" />
            </View>
            <TextInput
              style={[styles.input, styles.mobileInput, styles.disabledInput]}
              value={customerMobile}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : styles.otpBoxEmpty]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              editable={!isVerifying}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleResend} disabled={isVerifying || isResending} activeOpacity={0.7} style={styles.resendRow}>
          {isResending ? (
            <ActivityIndicator size="small" color="#0B3A2C" />
          ) : (
            <Text style={styles.resendText}>{t('Resend OTP')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.verifyBtn, isOtpComplete ? styles.verifyBtnActive : styles.verifyBtnInactive]}
          disabled={!isOtpComplete || isVerifying}
          onPress={verifyOtpAndProceed}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.verifyBtnText, isOtpComplete ? styles.verifyBtnTextActive : styles.verifyBtnTextInactive]}>
              {t('Verify & Proceed')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#F8FAFC' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
  content: { paddingHorizontal: 20, flex: 1 },
  heading: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', marginBottom: 12, marginTop: 24, textAlign: 'center' },
  subHeading: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#5A6478', lineHeight: 22, marginBottom: 40, textAlign: 'center', paddingHorizontal: 10 },
  inputGroup: { marginBottom: 40 },
  label: { fontSize: 14, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478', marginBottom: 8 },
  asterisk: { color: '#C53030' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, fontFamily: 'Roboto-Medium', color: '#1E293B' },
  mobileRow: { flexDirection: 'row', gap: 12 },
  countryCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12, height: 56 },
  countryCodeText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#5A6478', marginRight: 4 },
  mobileInput: { flex: 1 },
  disabledInput: { backgroundColor: '#FFFFFF', color: '#1E293B' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: { flex: 1, height: 56, borderBottomWidth: 3, textAlign: 'center', fontSize: 24, fontFamily: 'Roboto-Medium', color: '#1E293B', paddingBottom: 10 },
  otpBoxEmpty: { borderBottomColor: '#5A6478' },
  otpBoxFilled: { borderBottomColor: '#0B3A2C' },
  resendRow: { alignItems: 'center', marginTop: 24 },
  resendText: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#0B3A2C', textDecorationLine: 'underline' },
  footer: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16, backgroundColor: '#F8FAFC' },
  verifyBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  verifyBtnInactive: { backgroundColor: '#CBD5E1' },
  verifyBtnActive: { backgroundColor: '#0B3A2C' },
  verifyBtnText: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500' },
  verifyBtnTextInactive: { color: '#FFFFFF' },
  verifyBtnTextActive: { color: '#FFFFFF' }
});

export default CustomerOtpVerificationScreen;
