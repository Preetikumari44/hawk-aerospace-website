import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { referralApi, ReferralRule } from '../api/referral.api';
import { showAlert } from '../utils/dialog';

/**
 * Admin → Refer & Earn Rules.
 * Every reward value is editable here (wallet ₹ + coupon ₹, trigger,
 * monthly cap, code expiry). No code deploy needed.
 */
export default function ReferralRulesScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<ReferralRule[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<ReferralRule>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await referralApi.rules();
      setRules(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load referral rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setEdit = (id: string, patch: Partial<ReferralRule>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const save = async (rule: ReferralRule) => {
    const patch = edits[rule.id] ?? {};
    setSaving(rule.id);
    try {
      await referralApi.upsertRule({
        inviterRole: rule.inviterRole,
        inviteeRole: rule.inviteeRole,
        trigger: (patch.trigger ?? rule.trigger) as ReferralRule['trigger'],
        walletAmount: Number(patch.walletAmount ?? rule.walletAmount),
        couponAmount: Number(patch.couponAmount ?? rule.couponAmount),
        maxPerUserPerMonth: Number(patch.maxPerUserPerMonth ?? rule.maxPerUserPerMonth),
        codeExpiryDays: Number(patch.codeExpiryDays ?? rule.codeExpiryDays),
        isActive: patch.isActive ?? rule.isActive,
      });
      showAlert(`${rule.inviterRole} → ${rule.inviteeRole} updated.`, 'Saved');
      setEdits((prev) => {
        const next = { ...prev };
        delete next[rule.id];
        return next;
      });
      await load();
    } catch (e: any) {
      showAlert(e?.message || 'Could not save rule.', 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Refer & Earn — Reward Rules</Text>
      <Text style={styles.sub}>
        Trigger role_approved = Case 1 (admin approval). first_paid_booking = Case 2
        (gateway paid OR cash confirmed by pilot). Wallet credits Hawk Credits (withdraw ≥
        ₹100 via RazorpayX); coupon auto-mints a single-use marketplace code.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {rules.map((rule) => {
        const patch = edits[rule.id] ?? {};
        const dirty = Object.keys(patch).length > 0;
        return (
          <View key={rule.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {rule.inviterRole} → {rule.inviteeRole}
              <Text style={styles.trigger}>  •  {patch.trigger ?? rule.trigger}</Text>
            </Text>
            <View style={styles.grid}>
              <Field label="Wallet ₹" value={String(patch.walletAmount ?? rule.walletAmount)}
                onChange={(v) => setEdit(rule.id, { walletAmount: Number(v) || 0 })} keyboard="numeric" />
              <Field label="Coupon ₹" value={String(patch.couponAmount ?? rule.couponAmount)}
                onChange={(v) => setEdit(rule.id, { couponAmount: Number(v) || 0 })} keyboard="numeric" />
              <Field label="Max / user / mo" value={String(patch.maxPerUserPerMonth ?? rule.maxPerUserPerMonth)}
                onChange={(v) => setEdit(rule.id, { maxPerUserPerMonth: Number(v) || 1 })} keyboard="numeric" />
              <Field label="Code expiry (days)" value={String(patch.codeExpiryDays ?? rule.codeExpiryDays)}
                onChange={(v) => setEdit(rule.id, { codeExpiryDays: Number(v) || 30 })} keyboard="numeric" />
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.toggle, (patch.isActive ?? rule.isActive) && styles.toggleOn]}
                onPress={() => setEdit(rule.id, { isActive: !(patch.isActive ?? rule.isActive) })}
              >
                <Text style={styles.toggleText}>
                  {(patch.isActive ?? rule.isActive) ? 'Active' : 'Paused'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.save, !dirty && styles.saveDisabled]}
                onPress={() => save(rule)}
                disabled={!dirty || saving === rule.id}
              >
                <Text style={styles.saveText}>{saving === rule.id ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Field({
  label, value, onChange, keyboard,
}: {
  label: string; value: string; onChange: (v: string) => void; keyboard?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard === 'numeric' ? 'numeric' : 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 13, color: '#64748B' },
  error: { color: '#DC2626' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  trigger: { fontSize: 12, fontWeight: '400', color: '#64748B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { minWidth: 120, flex: 1 },
  fieldLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, height: 40, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  toggle: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  toggleOn: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  toggleText: { fontWeight: '700', color: '#0F172A' },
  save: { backgroundColor: '#4F46E5', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 9 },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#fff', fontWeight: '700' },
});
