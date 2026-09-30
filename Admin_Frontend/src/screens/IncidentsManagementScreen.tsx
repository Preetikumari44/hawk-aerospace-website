import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/AppNavigator';
import { incidentApi, Incident, IncidentSummary } from '../api/incident.api';
import Pagination from '../components/Pagination';
import { showAlert, showConfirm } from '../utils/dialog';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import SearchIcon from '../assets/icons/SearchIcon.svg';
import DroneIcon from '../assets/icons/DroneIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import LocationIcon from '../assets/icons/LocationIcon.svg';
import CalendarIcon from '../assets/icons/CalendarIcon.svg';
import BookingsIcon from '../assets/icons/bookings-icon.svg';
import ArrowUpIcon from '../assets/icons/ArrowIcon.svg';
import IncidentIcon from '../assets/icons/incident-icon.svg';
import CheckIcon from '../assets/icons/CheckIcon.svg';
import ArrowDownIcon from '../assets/icons/ArrowDownCircleIcon.svg';

type NavigationProp = DrawerNavigationProp<DrawerParamList, 'Incidents'>;

export default function IncidentsManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadIncidents();
    loadSummary();
  }, [page, selectedSeverity, selectedStatus]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentApi.getAll({
        page,
        limit: 10,
        severity: selectedSeverity || undefined,
        status: selectedStatus || undefined,
      });
      setIncidents(response.data.items);
      setTotalCount(response.data.meta.total);
      setTotalPages(Math.ceil(response.data.meta.total / response.data.meta.limit));
    } catch (error) {
      console.error('Failed to load incidents:', error);
      showAlert('Failed to load incidents', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await incidentApi.getSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleEscalate = async (incidentId: string) => {
    if (!(await showConfirm('Are you sure you want to escalate this incident?', 'Escalate Incident'))) {
      return;
    }
    try {
      await incidentApi.escalate(incidentId, 'DISTRICT_ADMIN', 'Escalated by admin');
      loadIncidents();
      showAlert('Incident escalated successfully', 'Success');
    } catch (error) {
      showAlert('Failed to escalate incident', 'Error');
    }
  };

  const handleResolve = async (incidentId: string) => {
    if (!(await showConfirm('Mark this incident as resolved?', 'Resolve Incident'))) {
      return;
    }
    try {
      await incidentApi.updateStatus(incidentId, 'resolved', 'Resolved by admin');
      loadIncidents();
      showAlert('Incident resolved successfully', 'Success');
    } catch (error) {
      showAlert('Failed to resolve incident', 'Error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#F59E0B';
      case 'LOW': return '#10B981';
      case 'SAFETY': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return '#10B981';
      case 'ESCALATED': return '#F59E0B';
      case 'UNDER_INVESTIGATION': return '#3B82F6';
      case 'PENDING': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.incidentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && incidents.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading incidents...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Breadcrumb & Header */}
      <View style={styles.headerBreadcrumb}>
        <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
        <Text style={styles.breadcrumbSeparator}>&gt;</Text>
        <Text style={styles.breadcrumbActive}>Incidents</Text>
      </View>

      <Text style={styles.pageTitle}>Incident Management</Text>
      <Text style={styles.pageSubtitle}>Monitor and manage all incidents across the platform</Text>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
            <Text style={styles.summaryLabel}>Total Incidents</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#DC2626' }]}>
            <Text style={styles.summaryLabel}>Critical</Text>
            <Text style={styles.summaryValue}>{summary.bySeverity.CRITICAL || 0}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.summaryLabel}>Escalated</Text>
            <Text style={styles.summaryValue}>{summary.byStatus.ESCALATED || 0}</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.summaryLabel}>Resolved</Text>
            <Text style={styles.summaryValue}>{summary.byStatus.RESOLVED || 0}</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersCard}>
        <Text style={styles.cardHeader}>Filters</Text>
        <View style={styles.divider} />
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID or title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Severity:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFETY'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.filterChip,
                    selectedSeverity === severity && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedSeverity(severity)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedSeverity === severity && styles.filterChipTextActive
                  ]}>
                    {severity || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              {['', 'PENDING', 'UNDER_INVESTIGATION', 'ESCALATED', 'RESOLVED'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    selectedStatus === status && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedStatus === status && styles.filterChipTextActive
                  ]}>
                    {status || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Incidents List */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>Incidents ({filteredIncidents.length})</Text>
          <TouchableOpacity style={styles.exportButton}>
            <ArrowDownIcon width={16} height={16} fill="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {filteredIncidents.length === 0 ? (
          <View style={styles.emptyState}>
            <IncidentIcon width={48} height={48} fill="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateText}>No incidents found</Text>
          </View>
        ) : (
          filteredIncidents.map((incident) => (
            <View key={incident.incidentId} style={styles.incidentCard}>
              {/* Header Row */}
              <View style={styles.incidentHeader}>
                <View style={styles.incidentTitleRow}>
                  <Text style={styles.incidentId}>{incident.incidentId}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(incident.severity) + '20' }]}>
                    <Text style={[styles.severityText, { color: getSeverityColor(incident.severity) }]}>
                      {incident.severity}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status.toUpperCase()) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(incident.status.toUpperCase()) }]}>
                      {incident.status.toUpperCase().replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.incidentCategory}>{incident.category}</Text>
              </View>

              {/* Title & Description */}
              <Text style={styles.incidentTitle}>{incident.title}</Text>
              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>

              {/* Metadata Grid */}
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <View style={styles.metadataIconWrapper}>
                    <LocationIcon width={14} height={14} fill="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.metadataLabel}>Location</Text>
                    <Text style={styles.metadataValue}>
                      {incident.location.city}, {incident.location.district}
                    </Text>
                  </View>
                </View>

                <View style={styles.metadataItem}>
                  <View style={styles.metadataIconWrapper}>
                    <PersonIcon width={14} height={14} fill="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.metadataLabel}>Reported By</Text>
                    <Text style={styles.metadataValue}>{incident.reportedBy}</Text>
                  </View>
                </View>

                {incident.bookingId && (
                  <View style={styles.metadataItem}>
                    <View style={styles.metadataIconWrapper}>
                      <BookingsIcon width={14} height={14} fill="#6B7280" />
                    </View>
                    <View>
                      <Text style={styles.metadataLabel}>Booking</Text>
                      <Text style={styles.metadataValue}>{incident.bookingId}</Text>
                    </View>
                  </View>
                )}

                {incident.droneId && (
                  <View style={styles.metadataItem}>
                    <View style={styles.metadataIconWrapper}>
                      <DroneIcon width={14} height={14} fill="#6B7280" />
                    </View>
                    <View>
                      <Text style={styles.metadataLabel}>Drone</Text>
                      <Text style={styles.metadataValue}>{incident.droneId}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.metadataItem}>
                  <View style={styles.metadataIconWrapper}>
                    <ArrowUpIcon width={14} height={14} fill="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.metadataLabel}>Escalation Level</Text>
                    <Text style={styles.metadataValue}>
                      {incident.currentEscalation.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.metadataItem}>
                  <View style={styles.metadataIconWrapper}>
                    <CalendarIcon width={14} height={14} fill="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.metadataLabel}>Reported At</Text>
                    <Text style={styles.metadataValue}>
                      {new Date(incident.reportedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Escalation History */}
              {incident.escalationHistory && incident.escalationHistory.length > 0 && (
                <View style={styles.escalationSection}>
                  <Text style={styles.escalationHeader}>Escalation History</Text>
                  {incident.escalationHistory.map((history, index) => (
                    <View key={index} style={styles.escalationItem}>
                      <View style={styles.escalationDot} />
                      <View style={styles.escalationContent}>
                        <Text style={styles.escalationLevel}>{history.level}</Text>
                        <Text style={styles.escalationNotes}>{history.notes || history.resolution}</Text>
                        <Text style={styles.escalationDate}>
                          {new Date(history.escalatedAt || history.resolvedAt || '').toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => navigation.navigate('Incident Detail', { incidentId: incident.incidentId })}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
                
                {!['RESOLVED', 'CLOSED', 'ESCALATED'].includes(incident.status.toUpperCase()) && (
                  <TouchableOpacity
                    style={styles.escalateButton}
                    onPress={() => handleEscalate(incident.incidentId)}
                  >
                    <ArrowUpIcon width={14} height={14} fill="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.escalateButtonText}>Escalate</Text>
                  </TouchableOpacity>
                )}

                {!['RESOLVED', 'CLOSED'].includes(incident.status.toUpperCase()) && (
                  <TouchableOpacity 
                    style={styles.resolveButton}
                    onPress={() => handleResolve(incident.incidentId)}
                  >
                    <CheckIcon width={14} height={14} fill="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.resolveButtonText}>Resolve</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={10}
        onPageChange={setPage}
        itemLabel="incidents"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 12,
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 24,
  },
  iconPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    padding: 16,
    width: '24%',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  filtersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  filterRow: {
    gap: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  incidentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  incidentHeader: {
    marginBottom: 12,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  incidentId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  incidentCategory: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  incidentDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '48%',
  },
  metadataIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metadataIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  metadataLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  metadataValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
  },
  escalationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  escalationHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  escalationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  escalationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 8,
  },
  escalationContent: {
    flex: 1,
  },
  escalationLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  escalationNotes: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  escalationDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  escalateButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
  },
  escalateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resolveButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  resolveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  titleIconPadding: {
    marginRight: 8,
  },
});
