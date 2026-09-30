import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { referralApi, ReferralRecord } from '../api/referral.api';
import { showAlert, showConfirm } from '../utils/dialog';

const STATUS_FILTERS = ['', 'invited', 'signed_up', 'applied', 'approved', 'rewarded', 'voided'];

/** Admin → Referrals funnel: invites → signups → approvals → rewards, with void. */
export default function ReferralsScreen() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReferralRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await referralApi.list(status || undefined, 100);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const voidReferral = async (id: string) => {
    const ok = await showConfirm(
      'This reverses the wallet credit and deactivates the coupon.',
      'Void referral?',
    );
    if (!ok) return;
    try {
      await referralApi.void(id, 'Voided by admin');
      showAlert('Referral voided and reward reversed.', 'Voided');
      await load();
    } catch (e: any) {
      showAlert(e?.message || 'Could not void referral.', 'Failed');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Refer & Earn — Referrals</Text>
      <View style={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.pill, status === s && styles.pillActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.pillText, status === s && styles.pillTextActive]}>
              {s || 'all'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.muted}>No referrals yet.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.code}>{r.code}</Text>
            <Text style={styles.meta}>
              {r.inviterRole} → {r.targetRole} • {r.status} • {r.channel}
            </Text>
            <Text style={styles.meta}>
              Inviter {r.inviterUid.slice(0, 8)}… • Invitee {r.inviteeUid ? r.inviteeUid.slice(0, 8) + '…' : r.inviteePhone ?? '—'}
            </Text>
            {!!r.rewardAmount && (
              <Text style={styles.meta}>
                Reward ₹{r.rewardAmount}
                {r.rewardCouponCode ? ` • Coupon ${r.rewardCouponCode}` : ''}
              </Text>
            )}
            <Text style={styles.meta}>{new Date(r.createdAt).toLocaleString()}</Text>
            {r.status !== 'voided' && (
              <TouchableOpacity style={styles.voidBtn} onPress={() => voidReferral(r.id)}>
                <Text style={styles.voidText}>Void + reverse reward</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 10, paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  pillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  pillText: { color: '#334155', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  error: { color: '#DC2626' },
  muted: { color: '#64748B' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  code: { fontWeight: '800', color: '#0F172A' },
  meta: { fontSize: 12, color: '#475569' },
  voidBtn: { marginTop: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#DC2626', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  voidText: { color: '#DC2626', fontWeight: '700' },
});
