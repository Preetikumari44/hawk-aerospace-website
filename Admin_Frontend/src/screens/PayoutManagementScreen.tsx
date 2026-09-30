import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { payoutApi, type Withdrawal } from '../api/payout.api';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  processing: '#3B82F6',
  completed: '#059669',
  failed: '#DC2626',
  rejected: '#EF4444',
};

const TABS = ['Pending', 'All', 'Completed', 'Failed'];

const PayoutManagementScreen: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const data = activeTab === 'All'
        ? await payoutApi.getAllWithdrawals()
        : activeTab === 'Pending'
        ? await payoutApi.getPendingWithdrawals()
        : await payoutApi.getAllWithdrawals(activeTab.toLowerCase());
      setWithdrawals(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (w: Withdrawal) => {
    setActionLoading(true);
    try {
      await payoutApi.approveWithdrawal(w.id, notes || 'Approved by admin');
      Alert.alert('Success', `Withdrawal of ₹${w.amount} approved. Payout will be processed.`);
      setSelected(null);
      setNotes('');
      fetchWithdrawals();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (w: Withdrawal) => {
    if (!notes.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    setActionLoading(true);
    try {
      await payoutApi.rejectWithdrawal(w.id, notes);
      Alert.alert('Success', 'Withdrawal rejected');
      setSelected(null);
      setNotes('');
      fetchWithdrawals();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelected(null); setNotes(''); }}>
            <Text style={styles.backBtn}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdrawal Detail</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Withdrawal ID</Text>
            <Text style={styles.detailValue}>{selected.id.slice(-12)}</Text>

            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue}>{selected.userId}</Text>

            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>{selected.userRole}</Text>

            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={[styles.detailValue, { color: '#5060D3', fontSize: 22 }]}>{formatCurrency(selected.amount)}</Text>

            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selected.status] || '#9CA3AF' }]}>
              <Text style={styles.statusText}>{selected.status.toUpperCase()}</Text>
            </View>

            <Text style={styles.detailLabel}>Payout Method ID</Text>
            <Text style={styles.detailValue}>{selected.payoutMethodId}</Text>

            {selected.razorpayPayoutId && (
              <>
                <Text style={styles.detailLabel}>Razorpay Payout ID</Text>
                <Text style={styles.detailValue}>{selected.razorpayPayoutId}</Text>
              </>
            )}

            {selected.utrNumber && (
              <>
                <Text style={styles.detailLabel}>UTR Number</Text>
                <Text style={styles.detailValue}>{selected.utrNumber}</Text>
              </>
            )}

            {selected.failureReason && (
              <>
                <Text style={styles.detailLabel}>Failure Reason</Text>
                <Text style={[styles.detailValue, { color: '#DC2626' }]}>{selected.failureReason}</Text>
              </>
            )}

            <Text style={styles.detailLabel}>Requested At</Text>
            <Text style={styles.detailValue}>{formatDate(selected.requestedAt)}</Text>

            {selected.adminNotes && (
              <>
                <Text style={styles.detailLabel}>Admin Notes</Text>
                <Text style={styles.detailValue}>{selected.adminNotes}</Text>
              </>
            )}
          </View>

          {selected.status === 'pending' && (
            <View style={styles.actionSection}>
              <Text style={styles.actionLabel}>Admin Notes</Text>
              <TextInput
                style={styles.textInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Enter notes or rejection reason..."
                multiline
                numberOfLines={3}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.approveBtn, actionLoading && styles.disabledBtn]}
                  onPress={() => handleApprove(selected)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.approveBtnText}>Approve & Pay</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectBtn, actionLoading && styles.disabledBtn]}
                  onPress={() => handleReject(selected)}
                  disabled={actionLoading}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payout Management</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#5060D3" style={styles.loader} />
      ) : withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No withdrawals found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {withdrawals.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={styles.withdrawalCard}
              onPress={() => setSelected(w)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardRole}>{w.userRole}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[w.status] || '#9CA3AF' }]}>
                  <Text style={styles.statusText}>{w.status}</Text>
                </View>
              </View>
              <Text style={styles.cardUserId}>{w.userId}</Text>
              <View style={styles.cardAmountRow}>
                <Text style={styles.cardAmount}>{formatCurrency(w.amount)}</Text>
                <Text style={styles.cardDate}>{formatDate(w.requestedAt)}</Text>
              </View>
              {w.utrNumber && <Text style={styles.cardUtr}>UTR: {w.utrNumber}</Text>}
              {w.failureReason && <Text style={styles.cardFailure}>{w.failureReason}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: '#111827' },
  backBtn: { fontSize: 16, color: '#5060D3', marginBottom: 8 },
  tabBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F3F4F6' },
  activeTab: { backgroundColor: '#5060D3' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  activeTabText: { color: '#FFF' },
  loader: { marginTop: 60 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
  listContent: { padding: 16 },
  withdrawalCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardRole: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  cardUserId: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  cardAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardAmount: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 12, color: '#9CA3AF' },
  cardUtr: { fontSize: 12, color: '#059669', marginTop: 4 },
  cardFailure: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  detailCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  actionSection: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  approveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  approveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  rejectBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
  disabledBtn: { opacity: 0.6 },
});

export default PayoutManagementScreen;
