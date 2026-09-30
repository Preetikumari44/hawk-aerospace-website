import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const STATUS_STEPS = ['pending', 'approved', 'processing', 'completed'];
const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#188A4E',
  processing: '#2B5FC7',
  completed: '#188A4E',
  rejected: '#EF4444',
  failed: '#C53030',
};

const FmRefundStatusScreen: React.FC<{ onNavigate?: any; routeParams?: any }> = ({ onNavigate, routeParams }) => {
  const { t } = useLanguage();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fleetApi.getMyRefunds()
      .then((res: any) => {
        const data = res?.data || res;
        setRefunds(Array.isArray(data) ? data : []);
      })
      .catch((error: any) => console.error('Failed to load refunds', error))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const getStepIndex = (status: string) => {
    const idx = STATUS_STEPS.indexOf(status);
    return idx >= 0 ? idx : -1;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Back')}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{t('Refund Status')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3A2C" style={styles.loader} />
      ) : refunds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('No refund requests found')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {refunds.map((refund) => (
            <View key={refund.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardBooking}>Booking #{refund.bookingId.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[refund.status] || '#94A3B8' }]}>
                  <Text style={styles.statusText}>{refund.status}</Text>
                </View>
              </View>

              <Text style={styles.cardAmount}>
                {t('Refund: ')}
                <Text style={styles.cardAmountValue}>{formatCurrency(refund.refundAmount)}</Text>
                <Text style={styles.cardPercent}> ({refund.refundPercentage}%)</Text>
              </Text>

              <Text style={styles.cardInfo}>
                {t('Original: ')}{formatCurrency(refund.originalAmount)}
              </Text>

              <Text style={styles.cardInfo}>
                {t('Reason: ')}{refund.refundReason}
              </Text>

              <Text style={styles.cardInfo}>
                {t('Requested: ')}{formatDate(refund.requestedAt)}
              </Text>

              {refund.status === 'rejected' && refund.adminNotes && (
                <Text style={[styles.cardInfo, { color: '#C53030' }]}>
                  {t('Rejected: ')}{refund.adminNotes}
                </Text>
              )}

              {refund.status === 'completed' && (
                <Text style={[styles.cardInfo, { color: '#188A4E' }]}>
                  {t('Refund sent to your original payment method')}
                </Text>
              )}

              {refund.status !== 'rejected' && refund.status !== 'failed' && (
                <View style={styles.timeline}>
                  {STATUS_STEPS.map((step, index) => {
                    const currentIdx = getStepIndex(refund.status);
                    const isDone = index <= currentIdx;
                    const isCurrent = index === currentIdx;
                    return (
                      <View key={step} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]}>
                          {isDone && <Text style={styles.timelineCheck}>✓</Text>}
                        </View>
                        <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>
                          {t(step.charAt(0).toUpperCase() + step.slice(1))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94A3B8' },
  scrollContent: { padding: 16, paddingBottom: 84 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardBooking: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardAmount: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 6 },
  cardAmountValue: { color: '#F59E0B' },
  cardPercent: { fontSize: 13, color: '#64748B', fontWeight: '400' },
  cardInfo: { fontSize: 13, color: '#64748B', marginBottom: 4, lineHeight: 18 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  timelineItem: { alignItems: 'center', flex: 1, marginHorizontal: 4 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  timelineDotDone: { backgroundColor: '#188A4E', borderColor: '#188A4E' },
  timelineDotCurrent: { backgroundColor: '#2B5FC7', borderColor: '#2B5FC7' },
  timelineCheck: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  timelineLabel: { fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  timelineLabelDone: { color: '#334155', fontWeight: '600' },
});

export default FmRefundStatusScreen;
