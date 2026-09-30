import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { pilotApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const AddPayoutMethodScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'bank' | 'upi'>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<null | 'verified' | 'failed'>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (type === 'bank') {
      if (!accountNumber || !ifscCode || !accountHolderName) {
        return 'Please fill in all bank details';
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        return 'Invalid IFSC code format. Example: HDFC0000123';
      }
      if (!/^\d{9,18}$/.test(accountNumber)) {
        return 'Invalid account number';
      }
    } else {
      if (!upiId) {
        return 'Please enter your UPI ID';
      }
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(upiId)) {
        return 'Invalid UPI ID format. Example: name@okhdfcbank';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setSaveError(error);
      return;
    }
    setSaveError(null);
    setLoading(true);
    try {
      const payload = type === 'bank'
        ? { type, accountNumber, ifscCode, accountHolderName, isDefault }
        : { type, upiId, isDefault };

      const result = await pilotApi.addPayoutMethod(payload);
      const returnedMethod = result?.data || result;
      setMethodId(returnedMethod?.id || null);

      if (returnedMethod?.razorpayFundAccountId || returnedMethod?.verificationStatus === 'pending') {
        // Auto-trigger verification
        setVerifying(true);
        try {
          const verifyResult = await pilotApi.verifyPayoutMethod(returnedMethod.id);
          const verifyData = verifyResult?.data || verifyResult;
          setVerificationStatus(verifyData?.verificationStatus === 'verified' ? 'verified' : 'failed');
        } catch (verifyError: any) {
          setVerificationStatus('failed');
          Alert.alert('Verification Failed', verifyError?.message || 'Could not verify the payout method.');
        } finally {
          setVerifying(false);
        }
        Alert.alert('Success', 'Payout method added. Verification in progress.');
      } else {
        setVerificationStatus('verified');
        Alert.alert('Success', 'Payout method added successfully.');
      }

      setAccountNumber('');
      setIfscCode('');
      setAccountHolderName('');
      setUpiId('');
      setIsDefault(false);
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to add payout method');
      Alert.alert('Error', error?.message || 'Failed to add payout method');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!methodId) {
      Alert.alert('Note', 'Please save the payout method first, then verify.');
      return;
    }
    setVerifying(true);
    try {
      const result = await pilotApi.verifyPayoutMethod(methodId);
      const data = result?.data || result;
      setVerificationStatus(data?.verificationStatus === 'verified' ? 'verified' : 'failed');
      if (data?.verificationStatus === 'verified') {
        Alert.alert('Success', 'Payout method verified successfully. You can now withdraw funds.');
      } else {
        Alert.alert('Verification Failed', 'This payout method could not be verified. Please check your details.');
      }
    } catch (error: any) {
      setVerificationStatus('failed');
      Alert.alert('Verification Failed', error?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate && onNavigate('Back')}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('Add Payout Method')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'bank' && styles.typeBtnActive]}
            onPress={() => { setType('bank'); setMethodId(null); setVerificationStatus(null); }}
          >
            <Text style={[styles.typeBtnText, type === 'bank' && styles.typeBtnTextActive]}>
              {t('Bank Account')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'upi' && styles.typeBtnActive]}
            onPress={() => { setType('upi'); setMethodId(null); setVerificationStatus(null); }}
          >
            <Text style={[styles.typeBtnText, type === 'upi' && styles.typeBtnTextActive]}>
              {t('UPI')}
            </Text>
          </TouchableOpacity>
        </View>

        {type === 'bank' ? (
          <View style={styles.formCard}>
            <Text style={styles.label}>{t('Account Holder Name')}</Text>
            <TextInput
              style={styles.input}
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>{t('Account Number')}</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="e.g. 123456789012"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={18}
            />

            <Text style={styles.label}>{t('IFSC Code')}</Text>
            <TextInput
              style={styles.input}
              value={ifscCode}
              onChangeText={(val) => setIfscCode(val.toUpperCase())}
              placeholder="e.g. HDFC0000123"
              placeholderTextColor="#94A3B8"
              maxLength={11}
              autoCapitalize="characters"
            />
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>{t('UPI ID')}</Text>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="e.g. yourname@okhdfcbank"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              {t('We will verify this UPI ID belongs to you before you can withdraw funds.')}
            </Text>
          </View>
        )}

        {saveError && (
          <Text style={styles.errorText}>{saveError}</Text>
        )}

        {verificationStatus === 'verified' && (
          <View style={styles.verifiedBox}>
            <Text style={styles.verifiedText}>{t('✓ Payout method verified')}</Text>
          </View>
        )}

        {verificationStatus === 'failed' && (
          <View style={styles.failedBox}>
            <Text style={styles.failedText}>{t('✗ Verification failed. Please check your details or contact support.')}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{t('Save Payout Method')}</Text>
          )}
        </TouchableOpacity>

        {methodId && verificationStatus !== 'verified' && (
          <TouchableOpacity
            style={[styles.verifyBtn, (verifying || loading) && styles.disabledBtn]}
            onPress={handleVerify}
            disabled={verifying || loading}
          >
            {verifying ? (
              <ActivityIndicator color="#0B3A2C" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>{t('Verify Payout Method')}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onNavigate && onNavigate('Back')}
        >
          <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#F8FAFC' },
  backBtn: { marginRight: 16, justifyContent: 'center' },
  backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
  pageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#334155' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F4F6F8', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#0B3A2C' },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  typeBtnTextActive: { color: '#FFF' },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', marginBottom: 16, backgroundColor: '#FFF' },
  helperText: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  errorText: { color: '#C53030', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  verifiedBox: { backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center' },
  verifiedText: { color: '#188A4E', fontSize: 15, fontWeight: '600' },
  failedBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center' },
  failedText: { color: '#C53030', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  saveBtn: { backgroundColor: '#0B3A2C', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  verifyBtn: { backgroundColor: '#F4F6F8', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#0B3A2C' },
  verifyBtnText: { color: '#0B3A2C', fontSize: 16, fontWeight: '600' },
  cancelBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
  disabledBtn: { opacity: 0.6 },
});

export default AddPayoutMethodScreen;
