import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { pilotApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#188A4E',
  processing: '#2B5FC7',
  completed: '#188A4E',
  failed: '#C53030',
  rejected: '#EF4444',
};

const WithdrawalHistoryScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pilotApi.getWithdrawalHistory()
      .then((res: any) => {
        const data = res?.data || res;
        setWithdrawals(Array.isArray(data) ? data : []);
      })
      .catch((error: any) => console.error('Failed to load withdrawal history', error))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Back')}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('Withdrawal History')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3A2C" style={styles.loader} />
      ) : withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('No withdrawals yet')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {withdrawals.map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardAmount}>{formatCurrency(w.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[w.status] || '#94A3B8' }]}>
                  <Text style={styles.statusText}>{w.status}</Text>
                </View>
              </View>
              <Text style={styles.cardDate}>{formatDate(w.requestedAt)}</Text>
              {w.utrNumber && <Text style={styles.cardUtr}>UTR: {w.utrNumber}</Text>}
              {w.failureReason && <Text style={styles.cardFailure}>{w.failureReason}</Text>}
              <Text style={styles.cardId}>ID: {w.id.slice(-8)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#F8FAFC' },
  backBtn: { marginRight: 16 },
  backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
  pageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#334155' },
  loader: { marginTop: 60 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94A3B8' },
  scrollContent: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAmount: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardDate: { fontSize: 13, color: '#64748B', marginTop: 6 },
  cardUtr: { fontSize: 13, color: '#188A4E', marginTop: 4 },
  cardFailure: { fontSize: 13, color: '#C53030', marginTop: 4 },
  cardId: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
});

export default WithdrawalHistoryScreen;
