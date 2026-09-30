import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, TextInput, ActivityIndicator, Alert } from 'react-native';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const OTPVerificationScreen: React.FC<{ onNavigate?: any; routeParams?: any }> = ({ onNavigate, routeParams }) => {
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const phone = routeParams?.phone || '';
    const { t, locale } = useLanguage();

    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('AddPilot'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) return;
        setVerifying(true);
        try {
            await fleetApi.completePilotCreation({ phone, otp });
            Alert.alert(t('Success'), t('Pilot has been added to your fleet successfully.'), [
                { text: t('OK'), onPress: () => onNavigate && onNavigate('AddResource') },
            ]);
        } catch (err: any) {
            Alert.alert(t('Verification Failed'), err?.message || t('Invalid or expired OTP. Please try again.'));
        } finally {
            setVerifying(false);
        }
    };

    const OTP_CHARS = otp.split('').slice(0, 6);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('AddPilot')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('OTP Verification')}</Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.title}>{t("Verify Pilot's Number with OTP")}</Text>
                <Text style={styles.subtitle}>{t('An OTP has been sent to this number. Go back to change the Mobile Number')}</Text>

                <Text style={styles.fieldLabel}>{t('Pilot Mobile Number ')}<Text style={styles.red}>*</Text></Text>
                <View style={[styles.mobileInput, { justifyContent: 'center', marginBottom: 32 }]}>
                    <Text style={styles.mobileText}>{phone || t('N/A')}</Text>
                </View>

                <View style={styles.otpRow}>
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <View key={idx} style={styles.otpSlot}>
                            <Text style={styles.otpChar}>{OTP_CHARS[idx] || ''}</Text>
                            <View style={styles.otpUnderline} />
                        </View>
                    ))}
                </View>
                <TextInput
                    style={styles.hiddenInput}
                    value={otp}
                    onChangeText={(value) => setOtp(value.slice(0, 6))}
                    maxLength={6}
                    keyboardType="numeric"
                />

                <TouchableOpacity
                    style={[styles.verifyBtn, (!otp || otp.length < 6 || verifying) && styles.verifyBtnDisabled]}
                    activeOpacity={otp && otp.length >= 6 && !verifying ? 0.85 : 1}
                    onPress={otp && otp.length >= 6 && !verifying ? handleVerifyOtp : undefined}
                    disabled={verifying}
                >
                    {verifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.verifyBtnText}>{t('Verify OTP')}</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, gap: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    body: { flex: 1, paddingHorizontal: 20 },
    title: { fontSize: 22, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
    fieldLabel: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 8 },
    red: { color: '#C53030' },
    mobileInput: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16 },
    mobileText: { fontSize: 15, color: '#1E293B' },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    otpSlot: { alignItems: 'center', width: 44 },
    otpChar: { fontSize: 28, fontWeight: '700', color: '#1E293B', minHeight: 36 },
    otpUnderline: { height: 3, width: 38, backgroundColor: '#1E293B', borderRadius: 2 },
    hiddenInput: { height: 0, opacity: 0 },
    verifyBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
    verifyBtnDisabled: { backgroundColor: '#CBD5E1' },
    verifyBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
});

export default OTPVerificationScreen;
