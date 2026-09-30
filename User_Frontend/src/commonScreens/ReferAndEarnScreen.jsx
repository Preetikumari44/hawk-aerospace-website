import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  Share, Alert, ActivityIndicator, Platform, Clipboard,
} from 'react-native';
import ScreenContainer from '../customerModule/components/ScreenContainer';
import ArrowBackwardIcon from '../customerModule/assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import COLORS from '../customerModule/constants/colors';
import { referralApi, walletApi, fleetApi, getApiBaseUrl } from '../utils/api';
import { useLanguage } from '../i18n';
import { buildReferralMessage, extractReferralCode } from '../utils/referral';

const copyText = async (text) => {
  try {
    if (Platform.OS === 'web') {
      if (window?.navigator?.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    }
    Clipboard?.setString?.(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Refer & Earn hub — opened from the Refer card in every Promotions carousel.
 * - Inviter: pick target role → unique code/link → Share / Copy / phone invites.
 * - Invitee: paste a code to attach it (before first reward).
 * - Everyone: Hawk Credits wallet (balance, history, withdraw ≥ ₹100 via RazorpayX).
 */
const ReferAndEarnScreen = ({ onNavigate, routeParams }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [target, setTarget] = useState(routeParams?.targetRole ?? null);
  const [code, setCode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [phones, setPhones] = useState('');
  const [sending, setSending] = useState(false);
  const [attachCode, setAttachCode] = useState(routeParams?.prefillCode ?? '');
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState('');
  const [walletHistory, setWalletHistory] = useState([]);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError('');
      const res = await referralApi.my();
      const payload = res?.data ?? res;
      setData(payload);
      if (!target && payload?.allowedTargets?.length) setTarget(payload.allowedTargets[0]);
      const existing = (payload?.codes ?? []).find(
        (c) => !target || (c.targetRoles ?? []).includes(target),
      );
      if (existing) setCode(existing);
      try {
        const h = await walletApi.history(20);
        setWalletHistory(h?.data ?? h ?? []);
      } catch { /* history is best-effort */ }
      try {
        const pm = await fleetApi.getPayoutMethods();
        setPayoutMethods(pm?.data ?? pm ?? []);
      } catch { /* payout methods optional per role */ }
    } catch (e) {
      setError(e?.message || t('Could not load referral data.'));
    } finally {
      setLoading(false);
    }
  }, [target, t]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const match = (data?.codes ?? []).find((c) => (c.targetRoles ?? []).includes(target));
    setCode(match ?? null);
  }, [target, data]);

  const generate = async () => {
    if (!target || generating) return;
    setGenerating(true);
    setError('');
    try {
      const res = await referralApi.getOrCreateCode(target);
      const payload = res?.data ?? res;
      setCode(payload);
      await refresh();
    } catch (e) {
      setError(e?.message || t('Could not generate code.'));
    } finally {
      setGenerating(false);
    }
  };

  const share = async () => {
    if (!code) { await generate(); return; }
    let apkLink = null;
    try {
      const base = await getApiBaseUrl();
      apkLink = `${base}/update/d/${encodeURIComponent(code.code)}`;
    } catch { /* apk short link is best-effort */ }
    const message = buildReferralMessage({
      code: code.code, link: code.link, apkLink, roleLabel: target,
    });
    try {
      await Share.share({ message, url: code.link, title: t('Refer & Earn') });
    } catch (e) {
      Alert.alert(t('Share failed'), e?.message || '');
    }
  };

  const sendInvites = async () => {
    const list = phones.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
    if (!code || !list.length) {
      setError(t('Generate a code and add at least one 10-digit number.'));
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await referralApi.invites({
        code: code.code, phones: list, targetRole: target, channel: 'share',
      });
      const payload = res?.data ?? res;
      Alert.alert(t('Invites sent'), t(`Created ${payload?.created ?? 0} invite(s). Share your link on WhatsApp to notify them instantly.`));
      setPhones('');
      await refresh();
    } catch (e) {
      setError(e?.message || t('Could not send invites.'));
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    const clean = extractReferralCode(attachCode);
    if (!clean) { setError(t('Enter the 6-letter referral code (e.g. X7K2QM). Each phone number earns once.')); return; }
    setAttaching(true);
    setError('');
    try {
      await referralApi.attach(clean);
      Alert.alert(t('Code attached'), t('Referral linked. Complete the qualifying step to earn the reward.'));
      setAttachCode('');
      await refresh();
    } catch (e) {
      setError(e?.message || t('Could not attach code.'));
    } finally {
      setAttaching(false);
    }
  };

  const withdraw = async (methodId) => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 100) {
      setError(t('Minimum withdrawal is ₹100.'));
      return;
    }
    setWithdrawing(true);
    setError('');
    try {
      await walletApi.withdraw({ amount: Math.round(amount), payoutMethodId: methodId });
      Alert.alert(t('Withdrawal requested'), t('Payout is processed via RazorpayX to your verified account.'));
      setWithdrawAmount('');
      await refresh();
    } catch (e) {
      setError(e?.message || t('Withdrawal failed.'));
    } finally {
      setWithdrawing(false);
    }
  };

  const wallet = data?.wallet;
  const stats = data?.stats;

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Refer & Earn')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Your wallet')}</Text>
              <Text style={styles.balance}>₹{wallet?.pendingEarnings ?? 0}</Text>
              <Text style={styles.muted}>
                {t('Total earned ₹{{t}} • Withdrawn ₹{{w}}', {
                  t: wallet?.totalEarnings ?? 0, w: wallet?.withdrawnEarnings ?? 0,
                })}
              </Text>
              {!!wallet?.lockedUntil && (
                <Text style={styles.muted}>
                  {t('Cash-out unlocks after hold period. Coupons work immediately.')}
                </Text>
              )}
              {!!stats && (
                <Text style={styles.muted}>
                  {t('Invites {{n}} • Rewarded {{r}}', {
                    n: stats.total ?? 0, r: stats.byStatus?.rewarded ?? 0,
                  })}
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('1. Who do you want to invite?')}</Text>
              <View style={styles.chips}>
                {(data?.allowedTargets ?? []).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setTarget(r)}
                    style={[styles.chip, target === r && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, target === r && styles.chipTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
              {target && (
                <Text style={styles.muted}>
                  {target === 'customer'
                    ? t('They install the app, sign up and complete their first PAID service (cash counts once the pilot confirms receipt).')
                    : t('They apply from this app and get approved by the admin. You earn on approval.')}
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('2. Your unique link')}</Text>
              {code ? (
                <>
                  <Text style={styles.code}>{code.code}</Text>
                  <Text style={styles.muted}>{code.link}</Text>
                  <View style={styles.row}>
                    <Pressable style={styles.primary} onPress={share}>
                      <Text style={styles.primaryText}>{t('Share')}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondary}
                      onPress={async () => {
                        const ok = await copyText(`${code.code} ${code.link}`);
                        Alert.alert(t('Copied'), ok ? code.code : t('Copy failed'));
                      }}
                    >
                      <Text style={styles.secondaryText}>{t('Copy')}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable style={styles.primary} onPress={generate} disabled={generating}>
                  <Text style={styles.primaryText}>
                    {generating ? t('Generating...') : t('Generate my link')}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('3. Invite by phone number (pro roles)')}</Text>
              <TextInput
                value={phones}
                onChangeText={setPhones}
                placeholder={t('Comma-separated 10-digit numbers')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <Pressable style={styles.primary} onPress={sendInvites} disabled={sending}>
                <Text style={styles.primaryText}>{sending ? t('Sending...') : t('Create invites')}</Text>
              </Pressable>
              <Text style={styles.muted}>
                {t('Tip: after creating invites, forward your link on WhatsApp — delivery is free via your own Share sheet.')}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Have a referral code? Attach it')}</Text>
              <TextInput
                value={attachCode}
                onChangeText={setAttachCode}
                placeholder="6-letter code, e.g. X7K2QM"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                style={styles.input}
              />
              <Pressable style={styles.secondary} onPress={attach} disabled={attaching}>
                <Text style={styles.secondaryText}>{attaching ? t('Attaching...') : t('Attach code')}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Withdraw (min ₹100, RazorpayX auto)')}</Text>
              <TextInput
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder={t('Amount in ₹')}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                style={styles.input}
              />
              {(payoutMethods ?? []).filter((m) => m.isActive).map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.secondary}
                  onPress={() => withdraw(m.id)}
                  disabled={withdrawing}
                >
                  <Text style={styles.secondaryText}>
                    {t('Withdraw to {{label}}', {
                      label: m.type === 'upi' ? m.upiId : m.accountNumber,
                    })}
                  </Text>
                </Pressable>
              ))}
              {!payoutMethods?.length && (
                <Text style={styles.muted}>
                  {t('Add + verify a UPI/bank payout method first (Payout screen).')}
                </Text>
              )}
            </View>

            {!!walletHistory?.length && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('Recent activity')}</Text>
                {walletHistory.slice(0, 10).map((tx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <Text style={styles.txType}>{tx.type}</Text>
                    <Text style={styles.txAmt}>₹{tx.amount}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingTop: 20, paddingBottom: 90, gap: 14 },
  loader: { marginTop: 40 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '600', color: '#2F3542' },
  error: { marginHorizontal: 20, color: '#DC2626', fontSize: 14 },
  card: {
    marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  balance: { fontSize: 30, fontWeight: '800', color: COLORS.primary },
  muted: { fontSize: 13, color: '#6B7280' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 1.5, color: '#1B2A6B' },
  row: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, height: 50, backgroundColor: COLORS.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { flex: 1, height: 50, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  input: {
    height: 52, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: '#111827',
  },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txType: { fontSize: 13, color: '#374151' },
  txAmt: { fontSize: 13, fontWeight: '700', color: '#111827' },
});

export default ReferAndEarnScreen;
