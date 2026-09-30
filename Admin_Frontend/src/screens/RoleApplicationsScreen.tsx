import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { roleApplicationApi, RoleApplicationSummary } from '../api/roleApplication.api';
import { useDebounce } from '../hooks/useDebounce';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { showAlert, showConfirm } from '../utils/dialog';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#92400E', bg: '#FEF3C7' },
  approved: { label: 'Approved', color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEE2E2' },
};

const ROLE_LABELS: Record<string, string> = {
  pilot: 'Drone Pilot',
  aggregator: 'Sales Aggregator',
  fleet_manager: 'Fleet Manager',
  vendor: 'Fleet Manager',
  technician: 'Technician',
};

export default function RoleApplicationsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'LIST' | 'DETAILS'>('LIST');

  const [applications, setApplications] = useState<RoleApplicationSummary[]>([]);
  const [selected, setSelected] = useState<RoleApplicationSummary | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 400);

  const fetchApplications = async (status = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await roleApplicationApi.list({
        status,
        search: debouncedSearch || undefined,
        limit: 100,
      });
      setApplications(res.applications || []);
    } catch (err: any) {
      console.error('Error fetching role applications:', err);
      setError(err?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(activeTab);
  }, [activeTab, debouncedSearch]);

  // Real-time: refresh whenever a user submits or an admin reviews an application.
  useSocketEvent('role-application:submitted', () => fetchApplications(activeTab));
  useSocketEvent('role-application:updated', () => fetchApplications(activeTab));

  const openDetail = async (app: RoleApplicationSummary) => {
    setSelected(app);
    setCurrentView('DETAILS');
    setLoading(true);
    try {
      setDetail(await roleApplicationApi.getById(app.applicationId));
    } catch (err: any) {
      console.error('Error loading application detail:', err);
      showAlert(`Error: ${err?.message || 'Failed to load application'}`);
    } finally {
      setLoading(false);
    }
  };

  const backToList = () => {
    setCurrentView('LIST');
    setSelected(null);
    setDetail(null);
  };

  const handleApprove = async () => {
    if (!detail || detail.status !== 'pending') return;
    if (!(await showConfirm(`Approve ${detail.name || detail.uid || 'this applicant'} for the ${roleLabel(detail.role)} role?`))) return;

    setLoading(true);
    try {
      await roleApplicationApi.review(detail.applicationId, { approved: true });
      showAlert('Success: Application approved. The user can now switch to this role instantly.');
      backToList();
      await fetchApplications(activeTab);
    } catch (err: any) {
      console.error('Error approving application:', err);
      showAlert(`Error: ${err?.message || 'Failed to approve application'}`);
    } finally {
      setLoading(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!detail || detail.status !== 'pending') return;
    if (!rejectionReason.trim()) {
      showAlert('Rejection reason is required.');
      return;
    }
    setLoading(true);
    setShowRejectModal(false);
    try {
      await roleApplicationApi.review(detail.applicationId, {
        approved: false,
        rejectionReason: rejectionReason.trim(),
      });
      showAlert('Success: Application rejected. The applicant will see the rejection instantly.');
      backToList();
      await fetchApplications(activeTab);
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      showAlert(`Error: ${err?.message || 'Failed to reject application'}`);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = (role: string) => ROLE_LABELS[String(role || '').toLowerCase()] || detail?.roleLabel || role || '—';

  const formattedDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const formEntries = useMemo(() => {
    if (!detail?.formData) return [];
    return Object.entries(detail.formData)
      .filter(([k, v]) => k !== '_docNumberSource' && v !== undefined && v !== null && String(v) !== '' && typeof v !== 'object')
      .map(([k, v]) => ({ key: k, label: startCase(k), value: String(v) }));
  }, [detail]);

  const docNumberSource: Record<string, string> = useMemo(() => {
    const s = (detail?.formData as any)?._docNumberSource;
    return s && typeof s === 'object' ? s : {};
  }, [detail]);

  const documents = useMemo(() => {
    if (!Array.isArray(detail?.documents)) return [];
    return detail.documents;
  }, [detail]);

  // ──────────────────────────── RENDER: LIST ────────────────────────────
  const renderList = () => (
    <>
      <View style={[styles.filterBarRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[styles.tabButtonGroup, isMobile && { marginBottom: 12 }]}>
          {(['pending', 'approved', 'rejected'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {STATUS_META[tab].label} Applications
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.searchInput, isMobile && { alignSelf: 'stretch' }]}
          placeholder="Search by name, phone or email"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tableCardContainer}>
        <View style={styles.tableSummaryHeader}>
          <Text style={styles.tableSummaryCountText}>
            Total: <Text style={styles.boldText}>{applications.length}</Text>
          </Text>
          <Text style={styles.statusBreakdownText}>Awaiting admin review</Text>
        </View>

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.headerCell, { flex: 2 }]}>Applicant</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Applied For</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Current Role</Text>
          <Text style={[styles.headerCell, { flex: 1.6 }]}>Submitted</Text>
          <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
        </View>

        {loading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.emptyStateText}>Loading applications...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateText, { color: '#EF4444' }]}>{error}</Text>
          </View>
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <TouchableOpacity key={app.applicationId} style={styles.tableBodyRow} onPress={() => openDetail(app)}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.bodyCell, styles.boldBodyCell, styles.interactiveTextLink]} numberOfLines={1}>
                  {app.name || 'Unnamed'}
                </Text>
                <Text style={[styles.bodyCell, { color: '#6B7280' }]} numberOfLines={1}>
                  {app.phone || app.email || app.uid}
                </Text>
                {(app as any).referralCode ? (
                  <Text style={[styles.bodyCell, { color: '#4F46E5', fontWeight: '700' }]} numberOfLines={1}>
                    🎁 {(app as any).referralCode}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.bodyCell, { flex: 1.5, color: '#374151' }]} numberOfLines={1}>
                {app.roleLabel || roleLabel(app.role)}
              </Text>
              <Text style={[styles.bodyCell, { flex: 1.5 }]} numberOfLines={1}>
                {app.currentRole ? roleLabel(app.currentRole) : '—'}
              </Text>
              <Text style={[styles.bodyCell, { flex: 1.6, color: '#6B7280' }]}>{formattedDate(app.submittedAt)}</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <StatusBadge status={app.status} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? `No applications match "${searchQuery}"` : `No ${STATUS_META[activeTab].label.toLowerCase()} applications`}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // ──────────────────────────── RENDER: DETAILS ────────────────────────────
  const renderDetails = () => {
    if (!detail) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No application selected</Text>
        </View>
      );
    }

    const meta = STATUS_META[detail.status] || STATUS_META.pending;

    return (
      <>
        <TouchableOpacity style={styles.backButtonTouchBox} onPress={backToList}>
          <Text style={styles.backButtonChevronSymbol}>←</Text>
          <Text style={styles.backButtonDescriptionText}>Back to Applications</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={[styles.heroRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={[styles.avatarCircle, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.avatarInitialsText}>
                {((detail.name || detail.uid || 'NA').substring(0, 2).toUpperCase())}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 0 : 16 }}>
              <Text style={styles.heroNameText}>{detail.name || 'Unnamed'}</Text>
              <Text style={styles.heroTitleRoleDescriptor}>{roleLabel(detail.role)} Application{detail.currentRole ? `  ·  currently ${roleLabel(detail.currentRole)}` : ''}</Text>
              <View style={styles.heroPillRow}>
                <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.pillSecondary}>Submitted {formattedDate(detail.submittedAt)}</Text>
              </View>
            </View>
          </View>

          {detail.status === 'pending' && (
            <View style={[styles.heroActionsRow, isMobile && { alignSelf: 'stretch' }]}>
              <TouchableOpacity style={[styles.acceptBtn, isMobile && { flex: 1, alignItems: 'center' }]} onPress={handleApprove} disabled={loading}>
                <Text style={styles.acceptBtnText}>{loading ? 'Processing...' : 'Approve'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.rejectBtn, isMobile && { flex: 1, alignItems: 'center' }]} onPress={openRejectModal} disabled={loading}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {detail.status === 'rejected' && detail.rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionBannerTitle}>Rejection Reason</Text>
            <Text style={styles.rejectionBannerText}>{detail.rejectionReason || detail.remarks || '—'}</Text>
          </View>
        ) : null}

        <View style={styles.gridRow}>
          <View style={[styles.infoPanel, isMobile && { marginHorizontal: 0, marginBottom: 16 }]}>
            <Text style={styles.panelHeading}>Applicant Contact</Text>
            <InfoRow label="Name" value={detail.name || '—'} />
            <InfoRow label="Phone" value={detail.phone || '—'} />
            <InfoRow label="Email" value={detail.email || '—'} />
            <InfoRow label="User ID" value={detail.uid || '—'} />
          </View>

          <View style={[styles.infoPanel, isMobile && { marginHorizontal: 0 }]}>
            <Text style={styles.panelHeading}>Application ID</Text>
            <InfoRow label="Application ID" value={detail.applicationId} mono />
            <InfoRow label="Target Role" value={roleLabel(detail.role)} />
            <InfoRow label="Referral Code" value={(detail as any).referralCode || '—'} mono />
            <InfoRow label="Referred By (UID)" value={(detail as any).referredByUid || '—'} mono />
            <InfoRow label="Status" value={meta.label} />
            <InfoRow label="Reviewed At" value={detail.reviewedAt ? formattedDate(detail.reviewedAt) : '—'} />
          </View>
        </View>

        {formEntries.length > 0 && (
          <View style={styles.panelBlock}>
            <Text style={styles.panelHeading}>Submitted Details</Text>
            {formEntries.map((entry) => (
              <InfoRow key={entry.key} label={entry.label} value={entry.value} />
            ))}
          </View>
        )}

        {documents.length > 0 && (
          <View style={styles.panelBlock}>
            <Text style={styles.panelHeading}>Uploaded Documents ({documents.length})</Text>
            <View style={styles.documentsGrid}>
              {documents.map((doc: any, idx: number) => {
                const url = doc.downloadUrl || doc.url;
                const isPdf = url && (url.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf');
                return (
                  <View key={`${doc.type}-${idx}`} style={styles.docCard}>
                    {url && !isPdf ? (
                      <TouchableOpacity
                        style={styles.docImageTouch}
                        onPress={() => {
                          setPreviewImageUrl(url);
                          setPreviewImageTitle(doc.name || doc.type);
                        }}
                      >
                        <Image source={{ uri: url }} style={styles.docPreviewImage} resizeMode="cover" />
                        <View style={styles.imageOverlayBadge}>
                          <Text style={styles.imageOverlayText}>🔍 Click to enlarge</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.docPdfPlaceholder}>
                        <Text style={styles.pdfIconText}>📄</Text>
                        <Text style={styles.pdfLabelText}>{isPdf ? 'PDF Document' : 'File'}</Text>
                      </View>
                    )}
                    <View style={styles.docCardFooter}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.name || doc.type}
                      </Text>
                      {doc.number ? (
                        <Text style={styles.docNumberText}>
                          No: {doc.number}
                          {docNumberSource[doc.type] === 'auto' ? '  •  Auto-read' : ''}
                        </Text>
                      ) : (
                        <Text style={styles.docMissing}>No number provided</Text>
                      )}
                      {url ? (
                        <View style={styles.docActionsRow}>
                          <TouchableOpacity
                            style={styles.viewDocBtn}
                            onPress={() => {
                              if (url && !isPdf) {
                                setPreviewImageUrl(url);
                                setPreviewImageTitle(doc.name || doc.type);
                              } else if (Platform.OS === 'web') {
                                (window as any).open(url, '_blank');
                              } else {
                                showAlert(url);
                              }
                            }}
                          >
                            <Text style={styles.viewDocBtnText}>View</Text>
                          </TouchableOpacity>
                          {Platform.OS === 'web' && (
                            <TouchableOpacity
                              style={styles.openExternalBtn}
                              onPress={() => (window as any).open(url, '_blank')}
                            >
                              <Text style={styles.openExternalBtnText}>↗</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.docMissing}>No file attached</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {currentView === 'LIST' ? renderList() : renderDetails()}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        transparent
        visible={!!previewImageUrl}
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle} numberOfLines={1}>
                {previewImageTitle || 'Document Preview'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {Platform.OS === 'web' && previewImageUrl && (
                  <TouchableOpacity
                    style={styles.modalExternalBtn}
                    onPress={() => (window as any).open(previewImageUrl, '_blank')}
                  >
                    <Text style={styles.modalExternalBtnText}>Open Original ↗</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeImageModalBtn}
                  onPress={() => setPreviewImageUrl(null)}
                >
                  <Text style={styles.closeImageModalText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            {previewImageUrl && (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showRejectModal} animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Application</Text>
            <Text style={styles.modalSubtitle}>
              Reasons you provide here will be shown to the applicant instantly.
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="e.g. Missing licence / documents invalid"
              placeholderTextColor="#9CA3AF"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmReject} disabled={loading}>
                <Text style={styles.modalConfirmText}>{loading ? 'Rejecting...' : 'Reject Application'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────── Small components ────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

const InfoRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, mono && { fontVariant: ['tabular-nums'] }]} numberOfLines={3}>{value}</Text>
  </View>
);

const startCase = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ──────────────────────────── Styles ────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingBottom: 60 },

  filterBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  tabButtonGroup: { flexDirection: 'row', alignItems: 'center' },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  tabButtonActive: { backgroundColor: '#EEF0FF', borderColor: '#C7CDFF' },
  tabButtonText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabButtonTextActive: { color: '#4F46E5' },

  searchInput: {
    minWidth: 240,
    height: 42,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  tableCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  tableSummaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  tableSummaryCountText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  boldText: { fontWeight: '700' },
  statusBreakdownText: { fontSize: 13, color: '#6B7280' },

  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8, paddingHorizontal: 8 },
  headerCell: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bodyCell: { fontSize: 13, color: '#111827' },
  boldBodyCell: { fontWeight: '600' },
  interactiveTextLink: { color: '#4F46E5' },

  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyStateText: { fontSize: 13, color: '#9CA3AF' },

  backButtonTouchBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButtonChevronSymbol: { fontSize: 20, color: '#4F46E5', marginRight: 8 },
  backButtonDescriptionText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitialsText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  heroNameText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  heroTitleRoleDescriptor: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  heroPillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  pillSecondary: { fontSize: 12, color: '#6B7280' },
  heroActionsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  acceptBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  acceptBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rejectBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: '#FCA5A5' },
  rejectBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },

  rejectionBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 16, marginBottom: 16 },
  rejectionBannerTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 4 },
  rejectionBannerText: { fontSize: 13, color: '#7F1D1D', lineHeight: 20 },

  gridRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoPanel: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  panelHeading: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  panelBlock: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280', maxWidth: '45%' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },

  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  docCard: {
    width: 220,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  docImageTouch: {
    width: '100%',
    height: 140,
    backgroundColor: '#EEF2FF',
    position: 'relative',
  },
  docPreviewImage: {
    width: '100%',
    height: 140,
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  docPdfPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pdfIconText: {
    fontSize: 36,
  },
  pdfLabelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  docCardFooter: {
    padding: 10,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  docNumberText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
    marginBottom: 6,
  },
  docActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDocBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDocBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  openExternalBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  openExternalBtnText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  imageModalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  modalExternalBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeImageModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeImageModalText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  fullPreviewImage: {
    width: '100%',
    height: 500,
    backgroundColor: '#0F172A',
  },

  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  docMissing: { fontSize: 12, color: '#9CA3AF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  modalCancelText: { fontSize: 14, color: '#111827' },
  modalConfirmBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#DC2626' },
  modalConfirmText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});