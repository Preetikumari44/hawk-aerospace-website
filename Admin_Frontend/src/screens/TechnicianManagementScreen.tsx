import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, useWindowDimensions, Image, Modal, Platform } from 'react-native';
import { technicianApi, type Technician, type TechnicianDetail, type MaintenanceTicket, type Drone } from '../api/technician.api';
import { showAlert, showConfirm } from '../utils/dialog';
import { useDebounce } from '../hooks/useDebounce';
import { sanitizeSearchQuery, detectInjectionAttempt, logSuspiciousActivity } from '../utils/inputSanitization';
import Pagination from '../components/Pagination';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import PersonIcon from '../assets/icons/person-icon.svg';
import SMIcon from '../assets/icons/sm.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import StarIcon from '../assets/icons/StarIcon.svg';
import DroneIcon from '../assets/icons/DroneIcon.svg';

export default function TechnicianManagementScreen() {
  // Application View Routing Engine & Active Subtab State Hooks
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<'current' | 'incoming'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileSubTab, setProfileSubTab] = useState<'Tickets' | 'Drones' | 'Support'>('Tickets');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query to prevent excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  // ADDED: Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Data state
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianDetail | null>(null);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([]);
  const [repairedDrones, setRepairedDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Image preview modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // Fetch technicians on mount
  useEffect(() => {
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab, debouncedSearch]);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      // Sanitize search input
      const sanitizedSearch = searchQuery ? sanitizeSearchQuery(searchQuery) : '';

      // Detect injection attempts
      if (sanitizedSearch && detectInjectionAttempt(sanitizedSearch)) {
        logSuspiciousActivity(searchQuery, undefined, 'TechnicianManagementScreen search');
        showAlert('Please enter a valid search query');
        setSearchQuery('');
        return;
      }

      const filter = {
        page: currentPage,
        limit: 10,
        status: (activeTab === 'current' ? 'active' : 'pending') as 'active' | 'pending',
        search: sanitizedSearch || undefined,
      };

      const response = await technicianApi.list(filter);
      console.log('Technicians API response:', response);
      console.log('Meta:', response.data.meta);
      setTechnicians(response.data.items);
      setTotalCount(response.data.meta.total);
      setTotalPages(Math.ceil(response.data.meta.total / response.data.meta.limit));
      console.log('After setState:', {
        totalCount: response.data.meta.total,
        totalPages: Math.ceil(response.data.meta.total / response.data.meta.limit),
        itemsLength: response.data.items.length
      });
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
      showAlert('Failed to load technicians');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchTechnicianDetails = async (technicianId: string) => {
    setDetailLoading(true);
    try {
      const [techDetail, tickets, drones] = await Promise.all([
        technicianApi.getById(technicianId),
        technicianApi.getMaintenanceTickets(technicianId),
        technicianApi.getRepairedDrones(technicianId),
      ]);

      setSelectedTechnician(techDetail.data);
      setMaintenanceTickets(tickets.data);
      setRepairedDrones(drones.data);
      setViewMode('detail');
    } catch (error) {
      console.error('Failed to fetch technician details:', error);
      showAlert('Failed to load technician details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTechnicianClick = (technician: Technician) => {
    fetchTechnicianDetails(technician.uid);
  };

  const handleRemoveTechnician = async () => {
    if (!selectedTechnician) return;

    if (await showConfirm(`Are you sure you want to remove ${selectedTechnician.fullName}? This action cannot be undone.`)) {
      try {
        setDetailLoading(true);
        await technicianApi.remove(selectedTechnician.uid);
        showAlert('Technician removed successfully');
        setViewMode('list');
        setSelectedTechnician(null);
        fetchTechnicians();
      } catch (err: any) {
        console.error('Error removing technician:', err);
        showAlert(err.message || 'Failed to remove technician');
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // --- SUB-RENDER COMPONENT SCREEN: DETAILED TECHNICIAN OVERVIEW ---
  const renderTechnicianDetailScreen = () => {
    if (detailLoading || !selectedTechnician) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading technician details...</Text>
        </View>
      );
    }

    const tech = selectedTechnician;

    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Top Header Row with Navigation Breadcrumbs Path */}
      {/* UPDATED: Stacks headers columnwise under 768px */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 12 }}>
          <View style={[styles.breadcrumbContainer, isMobile && { flexWrap: 'wrap' }]}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Technicians</Text>
            <Text style={styles.breadcrumbSeparator}> &gt; </Text>
            <Text style={[styles.breadcrumbActive, { color: '#6B7280' }]}>{tech.fullName}</Text>
          </View>
          <Text style={styles.pageTitle}>Technician Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Technicians</Text>
        </View>

        <TouchableOpacity style={[styles.backButton, isMobile && { alignSelf: 'flex-start' }]} onPress={() => setViewMode('list')}>
          <Text style={styles.backButtonText}>← Back to Technicians</Text>
        </TouchableOpacity>
      </View>

      {/* Identity Profile Badge Header Row Card Container */}
      {/* UPDATED: Aligns profiling segments and control buttons vertically on small forms */}
      <View style={[styles.profileHeaderCard, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={[styles.profileInfoLeft, isMobile && { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
          <View style={[styles.avatarCircle, isMobile && { marginBottom: 12 }]}>
            <Text style={styles.avatarText}>{tech.fullName.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={!isMobile && { marginLeft: 16 }}>
            <Text style={styles.profileNameText}>{tech.fullName}</Text>
            <Text style={styles.profileRoleText}>Technician</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' }}>
              <Text style={styles.tagOnline}>{tech.status === 'active' ? 'Online' : tech.status}</Text>
              <Text style={styles.tagLocation}>{tech.profileData?.state || 'N/A'}</Text>
              <Text style={styles.tagLocation}>{tech.profileData?.region || 'N/A'}</Text>
            </View>
          </View>
        </View>
        {tech.status === 'pending' || (tech as any).approvalStatus === 'PENDING' ? (
          <View style={[{ flexDirection: 'row', gap: 10 }, isMobile && { alignSelf: 'stretch' }]}>
            <TouchableOpacity
              style={[styles.approveBtn, isMobile && { flex: 1, alignItems: 'center' }]}
              onPress={async () => {
                const confirmed = await showConfirm('Approve this technician application?');
                if (confirmed) {
                  try {
                    await technicianApi.updateStatus(tech.uid, 'active');
                    showAlert('Technician application approved successfully!');
                    setViewMode('list');
                    fetchTechnicians();
                  } catch (err: any) {
                    showAlert(err?.message || 'Failed to approve');
                  }
                }
              }}
            >
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.removeBtn, isMobile && { flex: 1, alignItems: 'center' }]}
              onPress={async () => {
                const confirmed = await showConfirm('Reject this technician application?');
                if (confirmed) {
                  try {
                    await technicianApi.updateStatus(tech.uid, 'rejected');
                    showAlert('Technician application rejected');
                    setViewMode('list');
                    fetchTechnicians();
                  } catch (err: any) {
                    showAlert(err?.message || 'Failed to reject');
                  }
                }
              }}
            >
              <Text style={styles.removeBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.removeBtn, isMobile && { alignSelf: 'stretch', alignItems: 'center' }]} onPress={handleRemoveTechnician}>
            <Text style={styles.removeBtnText}>Remove Technician</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Two Column Grid Meta Specifications Frame Block */}
      {/* UPDATED: Shifts side-by-side meta fields into singular column containers */}
      <View style={[styles.infoGridRow, isMobile && { flexDirection: 'column' }]}>
        {/* Profile Details Block */}
        <View style={[styles.infoCard, isMobile ? { marginRight: 0, marginBottom: 16 } : { marginRight: 12 }]}>
          <Text style={styles.infoCardTitle}>Profile Information</Text>

          <View style={styles.infoInlineRow}>
            <PersonIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Technician ID: <Text style={styles.boldText}>{tech.uid}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <StarIcon width={20} height={20} fill="#EAB308" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Current Rating: <Text style={styles.boldText}>{tech.profileData?.rating || 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Total Repairs: <Text style={styles.boldText}>{tech.profileData?.totalRepairs || 0}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>State: <Text style={styles.boldText}>{tech.profileData?.state || 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Region: <Text style={styles.boldText}>{tech.profileData?.region || 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Specializations: <Text style={styles.boldText}>{tech.profileData?.specializations?.join(', ') || 'N/A'}</Text></Text>
          </View>
        </View>

        {/* Contact Account Infrastructure Details Block */}
        <View style={[styles.infoCard, isMobile ? { marginLeft: 0 } : { marginLeft: 12 }]}>
          <Text style={styles.infoCardTitle}>Account Details</Text>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Joining Date: <Text style={styles.boldText}>{tech.profileData?.joiningDate ? formatDate(tech.profileData.joiningDate) : 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Last Active: <Text style={styles.boldText}>{tech.lastActive ? formatDate(tech.lastActive) : 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Email: <Text style={styles.boldText}>{tech.email}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <DroneIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Mobile: <Text style={styles.boldText}>{tech.mobile || 'N/A'}</Text></Text>
          </View>

          <View style={styles.infoInlineRow}>
            <SMIcon width={20} height={20} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.infoItem}>Documents: <Text style={[styles.boldText, styles.documentLinkText]}>{((tech as any).documents || tech.verification?.documents || []).length} uploaded</Text></Text>
          </View>
        </View>
      </View>

      {/* Submitted Form Details Section */}
      {(tech as any)?.formData && Object.keys((tech as any).formData).length > 0 && (
        <View style={styles.infoCardFull}>
          <Text style={styles.infoCardTitle}>All Submitted Form Details</Text>
          <View style={styles.formEntriesGrid}>
            {Object.entries((tech as any).formData)
              .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')
              .map(([key, val]) => (
                <View key={key} style={styles.formEntryItem}>
                  <Text style={styles.formEntryKey}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.formEntryVal}>{String(val)}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Uploaded Documents Grid */}
      {(((tech as any).documents && (tech as any).documents.length > 0) || (tech.verification?.documents && tech.verification.documents.length > 0)) && (
        <View style={styles.infoCardFull}>
          <Text style={styles.infoCardTitle}>
            Uploaded Documents ({((tech as any).documents || tech.verification?.documents || []).length})
          </Text>
          <View style={styles.documentsGrid}>
            {((tech as any).documents || tech.verification?.documents || []).map((doc: any, idx: number) => {
              const url = doc.downloadUrl || doc.url;
              const isPdf = url && (url.toLowerCase().endsWith('.pdf') || doc.mimeType === 'application/pdf');
              return (
                <View key={`${doc.type}-${idx}`} style={styles.docCard}>
                  {url && !isPdf ? (
                    <TouchableOpacity
                      style={styles.docImageTouch}
                      onPress={() => {
                        setPreviewImageUrl(url);
                        setPreviewImageTitle(doc.name || doc.type || 'Document');
                      }}
                    >
                      <Image source={{ uri: url }} style={styles.docPreviewImage} resizeMode="cover" />
                      <View style={styles.imageOverlayBadge}>
                        <Text style={styles.imageOverlayText}>🔍 View Image</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.docPdfPlaceholder}>
                      <Text style={styles.pdfIconText}>📄</Text>
                      <Text style={styles.pdfLabelText}>{isPdf ? 'PDF Document' : 'File'}</Text>
                    </View>
                  )}
                  <View style={styles.docCardFooter}>
                    <Text style={styles.docCardName} numberOfLines={1}>
                      {doc.name || (doc.type || '').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    {url ? (
                      <View style={styles.docCardActionsRow}>
                        <TouchableOpacity
                          style={styles.viewDocBtn}
                          onPress={() => {
                            if (url && !isPdf) {
                              setPreviewImageUrl(url);
                              setPreviewImageTitle(doc.name || doc.type || 'Document');
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
                      <Text style={styles.docMissingText}>No file attached</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Internal Activity Logging Sub-Tabs Filter Navigation Line */}
      {/* UPDATED: Injected side scrolling behavior onto inner profile sub-tabs */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.innerSubTabRow}>
        <TouchableOpacity style={[styles.innerSubTabBtn, profileSubTab === 'Tickets' && styles.innerSubTabBtnActive]} onPress={() => setProfileSubTab('Tickets')}>
          <Text style={[styles.innerSubTabText, profileSubTab === 'Tickets' && styles.innerSubTabTextActive]}>Maintenance Tickets ({maintenanceTickets.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.innerSubTabBtn, profileSubTab === 'Drones' && styles.innerSubTabBtnActive]} onPress={() => setProfileSubTab('Drones')}>
              <Text style={[styles.innerSubTabText, profileSubTab === 'Support' && styles.innerSubTabTextActive]}>Support Documents ({tech.verification?.documents?.length || 0})</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dynamic Tab Logs Inner Structured Sheet Grid Table */}
      {/* ADDED: Horizontal ScrollView safety wrapper engine around detailed inner layout tracking sheet */}
      {profileSubTab === 'Tickets' && (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Ticket # ▲</Text>
              <Text style={[styles.headerCell, { flex: 2.2 }]}>Title ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3, textAlign: 'center' }]}>Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Priority ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Drone ID ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.6 }]}>Created Date ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Est. Cost ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Category ▲</Text>
            </View>

            {maintenanceTickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No maintenance tickets found</Text>
              </View>
            ) : (
              maintenanceTickets.map((ticket, index) => (
                <View key={index} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 1.5 }]}>{ticket.ticketNumber}</Text>
                  <Text style={[styles.bodyCell, { flex: 2.2, color: '#4B5563' }]} numberOfLines={1}>{ticket.title}</Text>
                  <View style={{ flex: 1.3, alignItems: 'center' }}>
                    <View style={[styles.pillBadgeContainer, ticket.status === 'COMPLETED' && { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.pillBadgeText, ticket.status === 'COMPLETED' && { color: '#10B981' }]}>{ticket.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 1.3 }]}>{ticket.priority}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5, color: '#4B5563' }]}>{ticket.droneId}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.6, color: '#4B5563' }]}>{formatDate(ticket.createdAt)}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.3 }]}>₹{ticket.estimatedCost}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{ticket.category}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {profileSubTab === 'Drones' && (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Drone ID ▲</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>Model ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Manufacturer ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Status ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Battery ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.3 }]}>Hours ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.6 }]}>Last Maintenance ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Condition ▲</Text>
            </View>

            {repairedDrones.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No repaired drones found</Text>
              </View>
            ) : (
              repairedDrones.map((drone, index) => (
                <View key={index} style={styles.tableBodyRow}>
                  <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 1.5 }]}>{drone.droneId}</Text>
                  <Text style={[styles.bodyCell, { flex: 2, color: '#4B5563' }]} numberOfLines={1}>{drone.model}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{drone.manufacturer}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.3 }]}>{drone.status}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.3 }]}>{drone.batteryHealth}%</Text>
                  <Text style={[styles.bodyCell, { flex: 1.3 }]}>{drone.flightHours}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.6, color: '#4B5563' }]}>{formatDate(drone.lastMaintenance)}</Text>
                  <Text style={[styles.bodyCell, { flex: 1.5 }]}>{drone.overallCondition}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {profileSubTab === 'Support' && (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>Document Type ▲</Text>
              <Text style={[styles.headerCell, { flex: 4 }]}>Document URL ▲</Text>
              <Text style={[styles.headerCell, { flex: 1.5 }]}>Action ▲</Text>
            </View>

            {(!tech.verification?.documents || tech.verification.documents.length === 0) ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No support documents found</Text>
              </View>
            ) : (
              tech.verification.documents.map((doc: any, index: number) => {
                const url = doc.downloadUrl || doc.url;
                return (
                  <View key={index} style={styles.tableBodyRow}>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2 }]}>{doc.name || doc.type}</Text>
                    <Text style={[styles.bodyCell, { flex: 4, color: '#2563EB' }]} numberOfLines={1}>{url}</Text>
                    <TouchableOpacity
                      style={{ flex: 1.5 }}
                      onPress={() => {
                        if (url) {
                          setPreviewImageUrl(url);
                          setPreviewImageTitle(doc.name || doc.type || 'Document');
                        }
                      }}
                    >
                      <Text style={[styles.bodyCell, { color: '#2563EB', textDecorationLine: 'underline' }]}>View Image</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
      
      {/* Image Preview Modal */}
      <Modal visible={!!previewImageUrl} transparent={true} animationType="fade">
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>{previewImageTitle}</Text>
              <TouchableOpacity style={styles.closeImageModalBtn} onPress={() => setPreviewImageUrl(null)}>
                <Text style={styles.closeImageModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            {previewImageUrl && (
              <Image source={{ uri: previewImageUrl }} style={styles.fullPreviewImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    );
  };

  // --- ROUTING CONDITIONAL MAP INTERCEPT ---
  if (viewMode === 'detail') return renderTechnicianDetailScreen();

  // --- CORE MAIN SCREEN: TECHNICIANS DASHBOARD MANAGEMENT MATRIX ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>

      {/* Top Header Row with Breadcrumbs & Search Bar */}
      {/* UPDATED: Reorients the global search field element layout underneath on smartphone drops */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Technician Management</Text>
          </View>
          <Text style={styles.pageTitle}>Technician Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your active technical deployment crew parameters</Text>
        </View>

        {/* Search Field Element */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Technicians (name, ID, email)"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(true);
            }}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>
      </View>

      {/* Core Operational Numeric Blocks Matrix Grid */}
      {/* UPDATED: Changes overview blocks to cascade cleanly into stacked columns */}
      <View style={[styles.metricsRow, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.metricCard, { backgroundColor: '#3B82F6' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Technicians</Text>
          <Text style={styles.metricValueText}>{technicians.length}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#2563EB' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Assigned Crew</Text>
          <Text style={styles.metricValueText}>{technicians.filter(t => t.status === 'active').length}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#1D4ED8' }, isMobile && { marginRight: 0, marginBottom: 12 }]}>
          <Text style={styles.metricLabelText}>Total Available Crew</Text>
          <Text style={styles.metricValueText}>{technicians.filter(t => t.status === 'active').length}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#1E40AF' }, isMobile && { marginRight: 0 }]}>
          <Text style={styles.metricLabelText}>Total Off Duty Crew</Text>
          <Text style={styles.metricValueText}>{technicians.filter(t => t.status !== 'active').length}</Text>
        </View>
      </View>

      {/* Primary Tab Button Group Toggles */}
      <View style={styles.filterBarRow}>
        <View style={[styles.tabButtonGroup, isMobile && { width: '100%' }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'current' && styles.tabButtonTextActive]} numberOfLines={1}>
              Current Technicians
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'incoming' && styles.tabButtonActive, isMobile && { flex: 1, alignItems: 'center' }]}
            onPress={() => setActiveTab('incoming')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'incoming' && styles.tabButtonTextActive]} numberOfLines={1}>
              Incoming Requests
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading technicians...</Text>
        </View>
      ) : (
        <>
          {/* Primary Log Data Structured Grid Sheet Block */}
          {/* ADDED: Horizontal ScrollView wrapper engine around core master log directory list summary */}
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
            <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Name ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Technician ID ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.2 }]}>Rating ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Total Repairs ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'center' }]}>Status ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.8 }]}>Joining Date ▲</Text>
                <Text style={[styles.headerCell, { flex: 2 }]}>State ▲</Text>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Region ▲</Text>
              </View>

              {technicians.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No technicians found</Text>
                </View>
              ) : (
                technicians.map((tech, index) => (
                  <TouchableOpacity key={index} style={styles.tableBodyRow} onPress={() => handleTechnicianClick(tech)}>
                    <Text style={[styles.bodyCell, styles.boldBodyCell, { flex: 2, color: '#2563EB' }]}>{tech.fullName}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5, color: '#4B5563' }]}>{tech.uid}</Text>

                    <View style={[styles.ratingCellContainer, { flex: 1.2 }]}>
                      <StarIcon width={14} height={14} fill="#EAB308" style={styles.starIcon} />
                      <Text style={styles.bodyCell}>{tech.profileData?.rating || 'N/A'}</Text>
                    </View>

                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{tech.profileData?.totalRepairs || 0}</Text>

                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <View style={[
                        styles.pillBadgeContainer,
                        tech.status !== 'active' && styles.pillBadgeContainerUnavailable
                      ]}>
                        <Text style={[
                          styles.pillBadgeText,
                          tech.status !== 'active' && styles.pillBadgeTextUnavailable
                        ]}>
                          {tech.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.bodyCell, { flex: 1.8, color: '#4B5563' }]}>
                      {tech.profileData?.joiningDate ? formatDate(tech.profileData.joiningDate) : 'N/A'}
                    </Text>
                    <Text style={[styles.bodyCell, { flex: 2 }]}>{tech.profileData?.state || 'N/A'}</Text>
                    <Text style={[styles.bodyCell, { flex: 1.5 }]}>{tech.profileData?.region || 'N/A'}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>

          {/* Pagination Control */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={10}
            onPageChange={setCurrentPage}
            itemLabel="technicians"
            alwaysShow={true}
          />
        </>
      )}
    </ScrollView>
  );
}

// Universal UI Structural Style Layout Definitions
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  breadcrumbHome: { fontSize: 12 },
  breadcrumbSeparator: { marginHorizontal: 6, color: '#9CA3AF', fontSize: 11 },
  breadcrumbActive: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  backButton: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, backgroundColor: '#FFF' },
  backButtonText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#FFFFFF', width: 280, height: 38 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', outlineStyle: 'none' as any },
  searchIcon: { fontSize: 14, color: '#9CA3AF' },
  dropdownRowContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF' },
  dropdownText: { fontSize: 12, color: '#374151', marginRight: 8 },
  dropdownArrow: { fontSize: 8, color: '#6B7280' },
  filterMenuButton: { marginLeft: 10, padding: 2 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  metricCard: { flex: 1, padding: 20, borderRadius: 12, marginRight: 12 },
  metricLabelText: { fontSize: 12, color: '#FFFFFF', opacity: 0.9 },
  metricValueText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  filterBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tabButtonGroup: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  tabButton: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#2563EB' },
  tabButtonText: { fontSize: 12, fontWeight: '500', color: '#4B5563' },
  tabButtonTextActive: { color: '#FFFFFF' },
  tableCardContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerCell: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tableBodyRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  bodyCell: { fontSize: 12, color: '#111827' },
  boldBodyCell: { fontWeight: '600' },
  ratingCellContainer: { flexDirection: 'row', alignItems: 'center' },
  starIcon: { marginRight: 4 },
  pillBadgeContainer: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, width: 96, alignItems: 'center' },
  pillBadgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  pillBadgeContainerUnavailable: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  pillBadgeTextUnavailable: { color: '#EF4444' },

  // --- SUBVIEW GRANULAR DETAILS SHEET STYLES ---
  profileHeaderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  profileInfoLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ECECFE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#4F46E5', fontSize: 16, fontWeight: '700' },
  profileNameText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileRoleText: { fontSize: 12, color: '#6B7280' },
  tagOnline: { backgroundColor: '#E6F4EA', color: '#137333', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 6, fontWeight: '600', marginBottom: 4 },
  tagLocation: { backgroundColor: '#F1F3F4', color: '#3C4043', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 6, marginBottom: 4 },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#EF4444', borderRadius: 8 },
  removeBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  approveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  approveBtnText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  infoCardFull: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginTop: 16,
  },
  formEntriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  formEntryItem: {
    minWidth: 180,
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formEntryKey: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  formEntryVal: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
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
  docCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  docCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewDocBtn: {
    backgroundColor: '#2563EB',
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
    color: '#2563EB',
    fontWeight: '700',
  },
  docMissingText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#2563EB',
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
  infoGridRow: { flexDirection: 'row', marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16, borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 6 },
  infoInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    flexWrap: 'wrap',
  },
  boldText: { fontWeight: '600', color: '#111827' },
  documentLinkText: { color: '#2563EB', textDecorationLine: 'underline' },
  innerSubTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  innerSubTabBtn: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderColor: 'transparent' },
  innerSubTabBtnActive: { borderColor: '#2563EB' },
  innerSubTabText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  innerSubTabTextActive: { color: '#2563EB', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: '#9CA3AF' },
  titleIconPadding: {
    marginRight: 10,
    alignSelf: 'center',
  },
});
