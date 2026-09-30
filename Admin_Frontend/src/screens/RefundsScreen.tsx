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
import { refundApi, type Refund } from '../api/refund.api';
import { api } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  processing: '#3B82F6',
  completed: '#059669',
  failed: '#DC2626',
};

const TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Processing', 'Completed'];

const RefundsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const data = activeTab === 'All'
        ? await refundApi.getAll()
        : await refundApi.getAll({ status: activeTab.toLowerCase() });
      setRefunds(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleApprove = async (refund: Refund) => {
    setActionLoading(true);
    try {
      await refundApi.approve(refund.id, actionNotes || 'Approved by admin');
      Alert.alert('Success', `Refund of ₹${refund.refundAmount} approved and processing`);
      setSelectedRefund(null);
      setActionNotes('');
      fetchRefunds();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (refund: Refund) => {
    if (!actionNotes.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection');
      return;
    }
    setActionLoading(true);
    try {
      await refundApi.reject(refund.id, actionNotes);
      Alert.alert('Success', 'Refund rejected');
      setSelectedRefund(null);
      setActionNotes('');
      fetchRefunds();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject refund');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (selectedRefund) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedRefund(null); setActionNotes(''); }}>
            <Text style={styles.backBtn}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Detail</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>{selectedRefund.bookingId}</Text>

            <Text style={styles.detailLabel}>Original Amount</Text>
            <Text style={styles.detailValue}>{formatCurrency(selectedRefund.originalAmount)}</Text>

            <Text style={styles.detailLabel}>Refund Amount</Text>
            <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
              {formatCurrency(selectedRefund.refundAmount)} ({selectedRefund.refundPercentage}%)
            </Text>

            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedRefund.status] || '#9CA3AF' }]}>
              <Text style={styles.statusText}>{selectedRefund.status.toUpperCase()}</Text>
            </View>

            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{selectedRefund.paymentMethod || 'N/A'}</Text>

            <Text style={styles.detailLabel}>Cancellation Reason</Text>
            <Text style={styles.detailValue}>{selectedRefund.cancellationReason}</Text>

            <Text style={styles.detailLabel}>Refund Reason</Text>
            <Text style={styles.detailValue}>{selectedRefund.refundReason}</Text>

            <Text style={styles.detailLabel}>Requested At</Text>
            <Text style={styles.detailValue}>{formatDate(selectedRefund.requestedAt)}</Text>

            {selectedRefund.approvedBy && (
              <>
                <Text style={styles.detailLabel}>Approved By</Text>
                <Text style={styles.detailValue}>{selectedRefund.approvedBy}</Text>
              </>
            )}

            {selectedRefund.razorpayRefundId && (
              <>
                <Text style={styles.detailLabel}>Razorpay Refund ID</Text>
                <Text style={styles.detailValue}>{selectedRefund.razorpayRefundId}</Text>
              </>
            )}

            {selectedRefund.adminNotes && (
              <>
                <Text style={styles.detailLabel}>Admin Notes</Text>
                <Text style={styles.detailValue}>{selectedRefund.adminNotes}</Text>
              </>
            )}
          </View>

          {selectedRefund.status === 'pending' && (
            <View style={styles.actionSection}>
              <Text style={styles.actionLabel}>Admin Notes (optional for approve, required for reject)</Text>
              <TextInput
                style={styles.textInput}
                value={actionNotes}
                onChangeText={setActionNotes}
                placeholder="Enter notes or rejection reason..."
                multiline
                numberOfLines={3}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.approveBtn, actionLoading && styles.disabledBtn]}
                  onPress={() => handleApprove(selectedRefund)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.approveBtnText}>Approve Refund</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectBtn, actionLoading && styles.disabledBtn]}
                  onPress={() => handleReject(selectedRefund)}
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
        <Text style={styles.headerTitle}>Refund Management</Text>
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
      ) : refunds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No refunds found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {refunds.map((refund) => (
            <TouchableOpacity
              key={refund.id}
              style={styles.refundCard}
              onPress={() => setSelectedRefund(refund)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.bookingId}>#{refund.bookingId.slice(-8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[refund.status] || '#9CA3AF' }]}>
                  <Text style={styles.statusText}>{refund.status}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardAmount}>{formatCurrency(refund.refundAmount)}</Text>
                <Text style={styles.cardPercentage}>{refund.refundPercentage}% of {formatCurrency(refund.originalAmount)}</Text>
              </View>
              <Text style={styles.cardReason} numberOfLines={1}>{refund.refundReason}</Text>
              <Text style={styles.cardDate}>{formatDate(refund.requestedAt)}</Text>
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
  refundCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingId: { fontSize: 14, fontWeight: '600', color: '#374151' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardBody: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  cardAmount: { fontSize: 20, fontWeight: '700', color: '#111827' },
  cardPercentage: { fontSize: 13, color: '#6B7280' },
  cardReason: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#9CA3AF' },
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

export default RefundsScreen;
