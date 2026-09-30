import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const MIN_WITHDRAWAL = 100;

const FmWithdrawScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [earningsRes, methodsRes] = await Promise.all([
        fleetApi.getEarningsSummary().catch(() => null),
        fleetApi.getPayoutMethods().catch(() => null),
      ]);

      const earnings = earningsRes?.data || earningsRes || {};
      setBalance(Number(earnings.pendingEarnings || earnings.pending || 0));

      const methodList = methodsRes?.data || methodsRes || [];
      const verifiedMethods = Array.isArray(methodList)
        ? methodList.filter((m: any) => m.verificationStatus === 'verified' && m.isActive)
        : [];
      setMethods(verifiedMethods);
      setSelectedMethod(verifiedMethods.length > 0 ? verifiedMethods[0].id : null);
    } catch (err) {
      console.error('Failed to load withdrawal data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const numericAmount = Math.floor(Number(amount) || 0);

  const handleWithdraw = async () => {
    setError(null);

    if (!selectedMethod) {
      setError('Please select a payout method');
      return;
    }
    if (!numericAmount || numericAmount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
      return;
    }
    if (numericAmount > balance) {
      setError(`Insufficient balance. Available: ₹${balance}`);
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ₹${numericAmount} to your selected payout method?\n\nThis will be reviewed by admin and processed within 24-48 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Withdrawal',
          onPress: async () => {
            setSubmitting(true);
            try {
              await fleetApi.createWithdrawal({
                payoutMethodId: selectedMethod,
                amount: numericAmount,
              });
              Alert.alert('Success', 'Withdrawal request submitted successfully.');
              onNavigate && onNavigate('Back');
            } catch (error: any) {
              setError(error?.message || 'Failed to submit withdrawal');
              Alert.alert('Error', error?.message || 'Failed to submit withdrawal');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatBalance = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const getMethodLabel = (m: any) => {
    if (m.type === 'bank') {
      return `${m.accountHolderName || 'Bank'} ••••${String(m.accountNumber || '').slice(-4)}`;
    }
    return m.upiId || 'UPI';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Back')}>
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('Withdraw Earnings')}</Text>
        </View>
        <ActivityIndicator size="large" color="#0B3A2C" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Back')}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('Withdraw Earnings')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('Available Balance')}</Text>
          <Text style={styles.balanceValue}>{formatBalance(balance)}</Text>
          <Text style={styles.balanceHint}>{t('Minimum withdrawal: ₹100')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>{t('Withdrawal Amount (₹)')}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <View style={styles.quickAmounts}>
            {[500, 1000, 2000, 5000].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickAmountBtn}
                onPress={() => setAmount(String(val))}
              >
                <Text style={styles.quickAmountText}>₹{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('Payout Method')}</Text>
          {methods.length === 0 ? (
            <View style={styles.noMethodsBox}>
              <Text style={styles.noMethodsText}>
                {t('No verified payout method found. Please add and verify one first.')}
              </Text>
              <TouchableOpacity
                style={styles.addMethodBtn}
                onPress={() => onNavigate && onNavigate('AddPayoutMethod')}
              >
                <Text style={styles.addMethodBtnText}>{t('Add Payout Method')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            methods.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodCard, selectedMethod === m.id && styles.methodCardActive]}
                onPress={() => setSelectedMethod(m.id)}
              >
                <View style={styles.methodRadio}>
                  {selectedMethod === m.id && <View style={styles.methodRadioActive} />}
                </View>
                <Text style={styles.methodLabel}>{getMethodLabel(m)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.withdrawBtn, (submitting || methods.length === 0) && styles.disabledBtn]}
          onPress={handleWithdraw}
          disabled={submitting || methods.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.withdrawBtnText}>
              {numericAmount > 0 ? `Withdraw ₹${numericAmount}` : t('Withdraw')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {t('Withdrawal requests are reviewed by admin. Funds are typically transferred within 24-48 hours.')}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, backgroundColor: '#F8FAFC' },
  backBtn: { marginRight: 16 },
  backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
  pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  loader: { marginTop: 60 },
  scrollContent: { padding: 16, paddingBottom: 84 },
  balanceCard: { backgroundColor: '#0B3A2C', borderRadius: 16, padding: 20, marginBottom: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: '700', marginVertical: 4 },
  balanceHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  amountInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 20, color: '#0F172A', backgroundColor: '#FFF', marginBottom: 12 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickAmountBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F4F6F8', alignItems: 'center' },
  quickAmountText: { fontSize: 14, fontWeight: '600', color: '#0B3A2C' },
  noMethodsBox: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 16, marginBottom: 16 },
  noMethodsText: { color: '#92400E', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  addMethodBtn: { backgroundColor: '#0B3A2C', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  addMethodBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  methodCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 8 },
  methodCardActive: { borderColor: '#0B3A2C', backgroundColor: '#E7F4EC' },
  methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  methodRadioActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0B3A2C' },
  methodLabel: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  errorText: { color: '#C53030', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  withdrawBtn: { backgroundColor: '#0B3A2C', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  withdrawBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.6 },
  disclaimer: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 12, lineHeight: 16 },
});

export default FmWithdrawScreen;
