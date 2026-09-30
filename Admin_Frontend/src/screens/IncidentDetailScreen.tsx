import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/AppNavigator';
import { incidentApi, Incident } from '../api/incident.api';
import { api } from '../api/client';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import DroneIcon from '../assets/icons/DroneIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import CheckIcon from '../assets/icons/CheckIcon.svg';
import ArrowUpIcon from '../assets/icons/ArrowIcon.svg';
import LocationIcon from '../assets/icons/LocationIcon.svg';
import BriefcaseIcon from '../assets/icons/BriefcaseIcon.svg';

type NavigationProp = DrawerNavigationProp<DrawerParamList, 'Incident Detail'>;
type IncidentDetailRouteProp = RouteProp<DrawerParamList, 'Incident Detail'>;

export default function IncidentDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<IncidentDetailRouteProp>();

  // Responsive Width Layout Hooks (grafted from UI)
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUpNote, setFollowUpNote] = useState('');
  
  // Related entity data
  const [customerName, setCustomerName] = useState<string>('');
  const [pilotName, setPilotName] = useState<string>('');
  const [fleetManagerName, setFleetManagerName] = useState<string>('');
  const [droneName, setDroneName] = useState<string>('');
  
  // Get incident ID from route params
  const incidentId = route.params?.incidentId;

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  const loadIncident = async () => {
    try {
      setLoading(true);
      
      if (incidentId) {
        // Load specific incident
        const response = await incidentApi.getById(incidentId);
        const incidentData = response.data;
        setIncident(incidentData);
        
        // Fetch related entity names
        await loadRelatedData(incidentData);
      } else {
        Alert.alert('Error', 'No incident ID provided');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load incident:', error);
      Alert.alert('Error', 'Failed to load incident details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async (incident: Incident) => {
    // For now, just set IDs as names until backend endpoints are available
    // You can implement these endpoints later in the backend
    
    // Set customer name (fallback to ID)
    if (incident.customerId) {
      try {
        const customerResponse = await api.get<any>(`/customers/${incident.customerId}`);
        setCustomerName(customerResponse.data?.name || incident.customerId);
      } catch (err) {
        // Endpoint doesn't exist yet, use ID
        setCustomerName(incident.customerId);
      }
    }

    // Set pilot name (fallback to ID)
    if (incident.pilotId) {
      try {
        const pilotResponse = await api.get<any>(`/pilots/${incident.pilotId}`);
        setPilotName(pilotResponse.data?.name || incident.pilotId);
      } catch (err) {
        // Endpoint doesn't exist yet, use ID
        setPilotName(incident.pilotId);
      }
    }

    // Set fleet manager name (fallback to ID)
    if (incident.fleetManagerId) {
      try {
        const fmResponse = await api.get<any>(`/fleet-managers/${incident.fleetManagerId}`);
        setFleetManagerName(fmResponse.data?.name || incident.fleetManagerId);
      } catch (err) {
        // Endpoint doesn't exist yet, use ID
        setFleetManagerName(incident.fleetManagerId);
      }
    }

    // Set drone name (fallback to ID)
    if (incident.droneId) {
      try {
        const droneResponse = await api.get<any>(`/drones/${incident.droneId}`);
        setDroneName(droneResponse.data?.model || droneResponse.data?.name || incident.droneId);
      } catch (err) {
        // Endpoint doesn't exist yet, use ID
        setDroneName(incident.droneId);
      }
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

  const handleEscalate = async () => {
    if (!incident) return;
    
    Alert.alert('Escalate Incident', 'Escalate to State Admin?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Escalate', 
        onPress: async () => {
          try {
            await incidentApi.escalate(
              incident.incidentId, 
              'STATE_ADMIN', 
              'Escalated by admin due to severity'
            );
            Alert.alert('Success', 'Incident escalated to State Admin');
            loadIncident(); // Reload to show updated data
          } catch (error) {
            Alert.alert('Error', 'Failed to escalate incident');
          }
        }
      }
    ]);
  };

  const handleResolve = async () => {
    if (!incident) return;
    
    Alert.alert('Resolve Incident', 'Mark this incident as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Resolve', 
        onPress: async () => {
          try {
            await incidentApi.updateStatus(
              incident.incidentId,
              'resolved',
              'Incident resolved by admin'
            );
            Alert.alert('Success', 'Incident marked as resolved');
            loadIncident(); // Reload to show updated data
          } catch (error) {
            Alert.alert('Error', 'Failed to resolve incident');
          }
        }
      }
    ]);
  };

  const handleAddFollowUp = async () => {
    if (!incident || !followUpNote.trim()) return;
    
    try {
      await incidentApi.followUp(incident.incidentId, followUpNote);
      Alert.alert('Success', 'Follow-up note added');
      setFollowUpNote('');
      loadIncident(); // Reload to show updated notes
    } catch (error) {
      Alert.alert('Error', 'Failed to add follow-up note');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading incident details...</Text>
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Incident not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Incidents')}
        >
          <Text style={styles.backButtonText}>← Back to Incidents</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Backend stores statuses lowercase (resolved/escalated/closed); normalize for display + checks.
  const normalizedStatus = incident.status.toUpperCase();
  const isResolved = normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED';
  const isEscalated = normalizedStatus === 'ESCALATED';
  const isFinalized = isResolved || isEscalated;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Breadcrumb & Header Title */}
      <View style={styles.headerBreadcrumb}>
        <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
        <Text style={styles.breadcrumbSeparator}>&gt;</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Incidents')}>
          <Text style={styles.breadcrumbLink}>Incidents</Text>
        </TouchableOpacity>
        <Text style={styles.breadcrumbSeparator}>&gt;</Text>
        <Text style={styles.breadcrumbActive}>{incident.incidentId}</Text>
      </View>

      <View style={[styles.titleRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={styles.titleLeft}>
          <Text style={styles.pageTitle}>{incident.title}</Text>
          <Text style={styles.pageSubtitle}>Incident Details & Resolution Workflow</Text>
        </View>
        <View style={[styles.titleRight, isMobile && { marginLeft: 0, marginTop: 12 }]}>
          <View style={[styles.severityBadgeLarge, { backgroundColor: getSeverityColor(incident.severity) + '20' }]}>
            <Text style={[styles.severityTextLarge, { color: getSeverityColor(incident.severity) }]}>
              {incident.severity}
            </Text>
          </View>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(normalizedStatus) + '20' }]}>
            <Text style={[styles.statusTextLarge, { color: getStatusColor(normalizedStatus) }]}>
              {normalizedStatus.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions Row — hidden once the incident is resolved or escalated */}
      {isFinalized ? (
        <View
          style={[
            styles.resolutionBanner,
            { backgroundColor: getStatusColor(normalizedStatus) + '15', borderColor: getStatusColor(normalizedStatus) },
          ]}
        >
          <CheckIcon width={20} height={20} fill={getStatusColor(normalizedStatus)} />
          <Text style={[styles.resolutionBannerText, { color: getStatusColor(normalizedStatus) }]}>
            {isResolved
              ? 'This incident has been resolved. No further action required.'
              : `This incident has been escalated${incident.escalatedTo ? ` to ${incident.escalatedTo}` : ''}. No further action required.`}
          </Text>
        </View>
      ) : (
        <View style={[styles.quickActionsRow, isMobile && { flexDirection: 'column' }]}>
          <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleResolve}>
            <CheckIcon width={18} height={18} fill="#FFFFFF" />
            <Text style={styles.actionButtonText}>Resolve Incident</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonWarning} onPress={handleEscalate}>
            <ArrowUpIcon width={18} height={18} fill="#FFFFFF" />
            <Text style={styles.actionButtonText}>Escalate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary}>
            <BriefcaseIcon width={18} height={18} fill="#FFFFFF" />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SECTION 1: Incident Details */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Incident Details</Text>
        <View style={styles.divider} />
        
        <View style={[styles.grid, isMobile && { flexDirection: 'column' }]}>
          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Incident ID</Text>
              <Text style={styles.metaValue}>{incident.incidentId}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{incident.category}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Booking ID</Text>
              <Text style={[styles.metaValue, styles.linkText]}>{incident.bookingId}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Drone ID</Text>
              <Text style={[styles.metaValue, styles.linkText]}>{incident.droneId}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Reported Date</Text>
              <Text style={styles.metaValue}>{new Date(incident.reportedAt).toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Last Updated</Text>
              <Text style={styles.metaValue}>{new Date(incident.updatedAt).toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%' }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>
                {incident.location.city}, {incident.location.district}, {incident.location.state}
              </Text>
            </View>
          </View>

          <View style={[styles.gridItem, isMobile && { width: '100%', marginBottom: 0 }]}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Current Escalation</Text>
              <Text style={styles.metaValue}>{incident.currentEscalation.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{incident.description}</Text>
        </View>
      </View>

      {/* SECTION 2: Involved Parties */}
      <View style={styles.entityGridRow}>
        {/* Customer */}
        {incident.customerId && (
          <View style={styles.entityCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {customerName ? customerName.substring(0, 2).toUpperCase() : 'CU'}
              </Text>
            </View>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{customerName || 'Loading...'}</Text>
              <Text style={styles.entityRole}>Customer</Text>
              <View style={styles.entityMetaRow}>
                <Text style={styles.miniIcon}>🆔</Text>
                <Text style={styles.entityMetaText}>{incident.customerId}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pilot */}
        {incident.pilotId && (
          <View style={styles.entityCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.avatarText, { color: '#F59E0B' }]}>
                {pilotName ? pilotName.substring(0, 2).toUpperCase() : 'PI'}
              </Text>
            </View>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{pilotName || 'Loading...'}</Text>
              <Text style={styles.entityRole}>Pilot (Reporter)</Text>
              <View style={styles.entityMetaRow}>
                <Text style={styles.miniIcon}>🆔</Text>
                <Text style={styles.entityMetaText}>{incident.pilotId}</Text>
              </View>
              <View style={styles.entityMetaRow}>
                <PersonIcon width={12} height={12} fill="#6B7280" style={{ marginRight: 8 }} />
                <Text style={styles.entityMetaText}>Reported By: {incident.reportedBy}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.entityGridRow}>
        {/* Fleet Manager */}
        {incident.fleetManagerId && (
          <View style={styles.entityCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.avatarText, { color: '#10B981' }]}>
                {fleetManagerName ? fleetManagerName.substring(0, 2).toUpperCase() : 'FM'}
              </Text>
            </View>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{fleetManagerName || 'Loading...'}</Text>
              <Text style={styles.entityRole}>Fleet Manager</Text>
              <View style={styles.entityMetaRow}>
                <Text style={styles.miniIcon}>🆔</Text>
                <Text style={styles.entityMetaText}>{incident.fleetManagerId}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Drone */}
        {incident.droneId && (
          <View style={styles.entityCard}>
            <View style={[styles.avatarCircle, { backgroundColor: '#FEE2E2' }]}>
              <DroneIcon width={24} height={24} fill="#DC2626" />
            </View>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{droneName || 'Loading...'}</Text>
              <Text style={styles.entityRole}>Drone Involved</Text>
              <View style={styles.entityMetaRow}>
                <Text style={styles.miniIcon}>🆔</Text>
                <Text style={styles.entityMetaText}>{incident.droneId}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* SECTION 3: Related Booking Details */}
      {incident.bookingId && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Related Booking</Text>
          <View style={styles.divider} />
          
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.iconBox}><Text style={styles.iconText}>🆔</Text></View>
              <View style={styles.metaTextWrapper}>
                <Text style={styles.metaLabel}>Booking ID</Text>
                <Text style={[styles.metaValue, styles.linkText]}>{incident.bookingId}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* SECTION 4: Escalation Timeline */}
      {incident.escalationHistory && incident.escalationHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Escalation History</Text>
          <View style={styles.divider} />
          
          {incident.escalationHistory.map((history, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineLevel}>{history.level.replace(/_/g, ' ')}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(history.escalatedAt || history.resolvedAt || '').toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.timelineAdmin}>Admin: {history.adminId}</Text>
                {history.notes && (
                  <Text style={styles.timelineNotes}>{history.notes}</Text>
                )}
                {history.resolution && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CheckIcon width={12} height={12} fill="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.timelineResolution}>{history.resolution}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* SECTION 5: Follow-up Notes */}
      {incident.resolutionNotes && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Resolution & Follow-up Notes</Text>
          <View style={styles.divider} />
          <Text style={styles.notesText}>{incident.resolutionNotes}</Text>
        </View>
      )}

      {/* SECTION 6: Add Follow-up */}
      {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Add Follow-up Note</Text>
          <View style={styles.divider} />
          
          <TextInput
            style={styles.followUpInput}
            placeholder="Enter follow-up note..."
            value={followUpNote}
            onChangeText={setFollowUpNote}
            multiline
            numberOfLines={4}
          />
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleAddFollowUp}
            disabled={!followUpNote.trim()}
          >
            <Text style={styles.submitButtonText}>Add Note</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map Container */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Location</Text>
        <View style={styles.divider} />
        
        <View style={styles.mapContainer}>
          <Text style={styles.mapPlaceholderText}>
            Map: {incident.location.city}, {incident.location.district}, {incident.location.state}
          </Text>
          <View style={styles.markerLabelCard}>
            <LocationIcon width={16} height={16} fill="#2563EB" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.markerTitle}>{incident.location.city}</Text>
              <Text style={styles.markerSubtitle}>
                Lat: {incident.location.coordinates.lat}, Lng: {incident.location.coordinates.lng}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  contentContainer: {
    padding: 24,
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
  breadcrumbLink: {
    fontSize: 12,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleLeft: {
    flex: 1,
  },
  titleRight: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 16,
  },
  severityBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  severityTextLarge: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  resolutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  resolutionBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonWarning: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  descriptionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  timelineAdmin: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  timelineNotes: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  timelineResolution: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    whiteSpace: 'pre-wrap',
  },
  followUpInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breadcrumbInactive: {
    fontSize: 12,
    color: '#6B7280',
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
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginLeft: 8,
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingRight: 12,
  },
  iconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  iconPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
  },
  miniIcon: {
    fontSize: 12,
  },
  metaTextWrapper: {
    marginLeft: 12,
    flexShrink: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  metaValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 2,
  },
  linkText: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  entityGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  entityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    width: '49%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  entityInfo: {
    marginLeft: 16,
    flex: 1,
  },
  entityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  entityRole: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  entityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  entityMetaText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 8,
  },
  mapContainer: {
    height: 260,
    borderRadius: 16,
    marginTop: 12,
    position: 'relative',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  liveTrackingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveTrackingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  markerLabelCard: {
    position: 'absolute',
    bottom: 24,
    left: '30%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  markerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  markerSubtitle: {
    fontSize: 11,
    color: '#4B5563',
  },
  titleIconPadding: {
    marginRight: 8,
  },
});