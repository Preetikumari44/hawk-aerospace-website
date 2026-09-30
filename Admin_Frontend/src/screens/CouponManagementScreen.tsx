import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { couponApi, Coupon, CreateCouponPayload } from '../api/coupon.api';
import { showAlert } from '../utils/dialog';
import HomeIcon from '../assets/icons/home-vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Users (Universal)' },
  { value: 'customer', label: 'Customer' },
  { value: 'aggregator', label: 'Sales Aggregator' },
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'technician', label: 'Technician' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

interface CouponForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  applicableRole: string;
  validUntil: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  description: string;
}

const emptyForm: CouponForm = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  applicableRole: '',
  validUntil: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  description: '',
};

export default function CouponManagementScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await couponApi.list();
      setCoupons(Array.isArray(res?.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const setField = (key: keyof CouponForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildPayload = (): CreateCouponPayload | null => {
    if (!form.code.trim()) {
      showAlert('Validation Error', 'Coupon code is required.');
      return null;
    }
    const discountValue = Number(form.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      showAlert('Validation Error', 'Discount value must be greater than 0.');
      return null;
    }
    if (!form.validUntil.trim()) {
      showAlert('Validation Error', 'Valid until date is required.');
      return null;
    }
    const validUntil = new Date(form.validUntil.trim());
    if (isNaN(validUntil.getTime())) {
      showAlert('Validation Error', 'Valid until must be a valid date (YYYY-MM-DD).');
      return null;
    }

    const payload: CreateCouponPayload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue,
      validUntil: validUntil.toISOString(),
      applicableRoles: form.applicableRole ? [form.applicableRole] : [],
      description: form.description.trim() || undefined,
    };
    if (form.minOrderAmount.trim()) payload.minOrderAmount = Number(form.minOrderAmount);
    if (form.maxDiscountAmount.trim()) payload.maxDiscountAmount = Number(form.maxDiscountAmount);
    if (form.usageLimit.trim()) payload.usageLimit = Number(form.usageLimit);
    return payload;
  };

  const handleCreate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      await couponApi.create(payload);
      showAlert('Success', `Coupon ${payload.code} created successfully.`);
      setModalVisible(false);
      setForm(emptyForm);
      loadCoupons();
    } catch (e: any) {
      showAlert('Create Failed', e?.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      if (coupon.status === 'active') {
        await couponApi.deactivate(coupon.id);
      } else {
        await couponApi.update(coupon.id, {});
      }
      loadCoupons();
    } catch (e: any) {
      showAlert('Update Failed', e?.message || 'Failed to update coupon');
    }
  };

  const roleLabel = (coupon: Coupon) => {
    const roles = coupon.applicableRoles ?? [];
    if (!roles.length || roles.includes('*')) return 'All Users';
    return roles.map((r) => ROLE_LABELS[r] || r).join(', ');
  };

  const discountLabel = (coupon: Coupon) =>
    coupon.discountType === 'percentage'
      ? `${coupon.discountValue}%`
      : `₹${coupon.discountValue}`;

  const expired = (coupon: Coupon) =>
    coupon.status === 'expired' || new Date(coupon.validUntil).getTime() < Date.now();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Coupons</Text>
          </View>
          <Text style={styles.pageTitle}>Coupon Management</Text>
          <Text style={styles.pageSubtitle}>Create role-wise and universal discount coupons</Text>
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbarRow}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadCoupons}>
          <RefreshIcon width={18} height={18} />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            setForm(emptyForm);
            setModalVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Create Coupon</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading coupons...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCoupons}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : coupons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No coupons created yet.</Text>
          <Text style={styles.emptyStateSub}>Create your first coupon using the button above.</Text>
        </View>
      ) : (
        <View style={styles.tableWrap}>
          {coupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <View style={styles.couponCardHeader}>
                <View>
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                  <Text style={styles.couponMeta}>{roleLabel(coupon)}</Text>
                </View>
                <View style={styles.couponRight}>
                  <Text style={styles.couponDiscount}>{discountLabel(coupon)} OFF</Text>
                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      coupon.status === 'active' && !expired(coupon)
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                    onPress={() => handleToggleStatus(coupon)}
                  >
                    <Text style={styles.statusBadgeText}>
                      {coupon.status === 'active' && !expired(coupon) ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.couponCardFooter}>
                <Text style={styles.couponFooterText}>
                  Valid till: {new Date(coupon.validUntil).toLocaleDateString('en-IN')}
                </Text>
                <Text style={styles.couponFooterText}>
                  Usage: {coupon.usedCount ?? 0}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                </Text>
                {coupon.description ? (
                  <Text style={styles.couponDesc}>{coupon.description}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Create Coupon Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && { width: '100%' }]}>
            <Text style={styles.modalTitle}>Create Coupon</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.label}>Coupon Code</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={(v) => setField('code', v)}
                placeholder="e.g. FARM10"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Discount Type</Text>
              <View style={styles.typeToggle}>
                {(['percentage', 'fixed'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeToggleItem,
                      form.discountType === type && styles.typeToggleItemActive,
                    ]}
                    onPress={() => setField('discountType', type)}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        form.discountType === type && styles.typeToggleTextActive,
                      ]}
                    >
                      {type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Discount Value</Text>
              <TextInput
                style={styles.input}
                value={form.discountValue}
                onChangeText={(v) => setField('discountValue', v)}
                placeholder={form.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 200'}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Applicable Role</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setRoleDropdownOpen((v) => !v)}
              >
                <Text style={styles.dropdownTriggerText}>
                  {form.applicableRole ? ROLE_LABELS[form.applicableRole] : 'All Users (Universal)'}
                </Text>
                <Text style={styles.dropdownCaret}>▾</Text>
              </TouchableOpacity>
              {roleDropdownOpen && (
                <View style={styles.dropdownPanel}>
                  {ROLE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField('applicableRole', opt.value);
                        setRoleDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          form.applicableRole === opt.value && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {opt.label}
                        {form.applicableRole === opt.value ? ' ✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>Valid Until (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.validUntil}
                onChangeText={(v) => setField('validUntil', v)}
                placeholder="e.g. 2026-12-31"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Max Discount Amount (₹, optional)</Text>
              <TextInput
                style={styles.input}
                value={form.maxDiscountAmount}
                onChangeText={(v) => setField('maxDiscountAmount', v)}
                placeholder="Only for percentage coupons"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Min Order Amount (₹, optional)</Text>
              <TextInput
                style={styles.input}
                value={form.minOrderAmount}
                onChangeText={(v) => setField('minOrderAmount', v)}
                placeholder="e.g. 500"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Usage Limit (optional)</Text>
              <TextInput
                style={styles.input}
                value={form.usageLimit}
                onChangeText={(v) => setField('usageLimit', v)}
                placeholder="e.g. 100"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => setField('description', v)}
                placeholder="Short admin note shown to users"
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => !submitting && setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Create Coupon</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 24 },
  headerRow: { marginBottom: 20 },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  titleIconPadding: { marginRight: 8 },
  breadcrumbSeparator: { color: '#9CA3AF', marginHorizontal: 4, fontSize: 16 },
  breadcrumbActive: { color: '#111827', fontSize: 15, fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  refreshButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 18,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  centerContent: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  errorText: { color: '#DC2626', fontSize: 14 },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyStateSub: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  tableWrap: { gap: 12 },
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  couponCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  couponCode: { fontSize: 18, fontWeight: '800', color: '#111827' },
  couponMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  couponRight: { alignItems: 'flex-end', gap: 8 },
  couponDiscount: { fontSize: 16, fontWeight: '700', color: '#059669' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  couponCardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  couponFooterText: { fontSize: 13, color: '#6B7280' },
  couponDesc: { fontSize: 13, color: '#374151', width: '100%', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 560,
    maxHeight: '90%',
    padding: 20,
    width: '100%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalContent: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    color: '#111827',
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  typeToggle: { flexDirection: 'row', gap: 10 },
  typeToggleItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeToggleItemActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeToggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeToggleTextActive: { color: '#4F46E5' },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  dropdownTriggerText: { fontSize: 15, color: '#111827' },
  dropdownCaret: { fontSize: 14, color: '#6B7280' },
  dropdownPanel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    paddingVertical: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemTextSelected: { color: '#4F46E5', fontWeight: '700' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#F3F4F6' },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  saveButton: { backgroundColor: '#4F46E5' },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
