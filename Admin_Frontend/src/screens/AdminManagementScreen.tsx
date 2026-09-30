import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, TouchableWithoutFeedback, ActivityIndicator, useWindowDimensions } from 'react-native';
import { adminAPI, Admin, AdminStats, Department, State, PermissionProfile, CreateAdminRequest } from '../api/admin.api';
import Pagination from '../components/Pagination';
import { showAlert, showConfirm } from '../utils/dialog';

// ------------------------------------------------------
// Import SVG Icons
// ------------------------------------------------------
import LocationIcon from '../assets/icons/LocationIcon.svg';
import CallIcon from '../assets/icons/CallIcon.svg';
import EmailIcon from '../assets/icons/EmailIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';
import ActivityIcon from '../assets/icons/ActivityIcon.svg';
import ClockIcon from '../assets/icons/ClockIcon.svg';
import SMIcon from '../assets/icons/sm.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

export default function AdminManagementScreen() {
  // --- Component State Trackers ---
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  
  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Dynamic Route Tracking: Holds the Admin object when an item row is clicked
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // API Data State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [permissionProfiles, setPermissionProfiles] = useState<PermissionProfile[]>([]);
  const [subordinates, setSubordinates] = useState<Admin[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [subordinatesLoading, setSubordinatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [adminPage, setAdminPage] = useState(1);

  // Change modals state
  const [changeDepartmentModalVisible, setChangeDepartmentModalVisible] = useState(false);
  const [changeStateModalVisible, setChangeStateModalVisible] = useState(false);
  const [adminToUpdate, setAdminToUpdate] = useState<Admin | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    role: 'STATE_ADMIN',
    department: '',
    state: '',
    region: '',
    permissionsProfile: '',
  });

  // Filters State
  const [filters, setFilters] = useState({
    role: '',
    state: '',
    department: '',
  });

  // Filter dropdown modals
  const [roleFilterModalVisible, setRoleFilterModalVisible] = useState(false);
  const [stateFilterModalVisible, setStateFilterModalVisible] = useState(false);
  const [departmentFilterModalVisible, setDepartmentFilterModalVisible] = useState(false);

  // Form dropdown open states
  const [formRoleOpen, setFormRoleOpen] = useState(false);
  const [formStateOpen, setFormStateOpen] = useState(false);
  const [formDeptOpen, setFormDeptOpen] = useState(false);
  const [formStateSearch, setFormStateSearch] = useState('');
  const [formDeptSearch, setFormDeptSearch] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAdmins();
    loadStats();
    loadDepartments();
    loadStates();
    loadPermissionProfiles();
  }, []);

  // Debounced search - wait 500ms after user stops typing
  useEffect(() => {
    // Show searching indicator immediately
    if (searchQuery) {
      setIsSearching(true);
    }

    const debounceTimer = setTimeout(() => {
      loadAdmins();
      setIsSearching(false);
    }, 500);

    // Cleanup: cancel the timer if searchQuery changes again before 500ms
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]);

  // Reload immediately when filters change (no debounce needed for dropdowns)
  useEffect(() => {
    loadAdmins();
  }, [filters]);

  // Client-side pagination over the top-level-filtered admin list.
  // (The list is post-filtered to top-level admins, so we page the result here
  // rather than server-side to keep page sizes consistent.)
  const ADMIN_PAGE_SIZE = 15;
  const totalAdminPages = Math.max(1, Math.ceil(admins.length / ADMIN_PAGE_SIZE));
  const pagedAdmins = admins.slice(
    (adminPage - 1) * ADMIN_PAGE_SIZE,
    adminPage * ADMIN_PAGE_SIZE,
  );

  // Snap back to page 1 whenever the underlying list changes (reload/filter/search)
  useEffect(() => {
    setAdminPage(1);
  }, [admins]);

  // Load subordinates when an admin is selected
  useEffect(() => {
    if (selectedAdmin) {
      loadSubordinates(selectedAdmin.adminId);
    }
  }, [selectedAdmin]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAdmins({
        search: searchQuery || undefined,
        role: filters.role || undefined,
        state: filters.state || undefined,
        department: filters.department || undefined,
        limit: 100,
      });
      
      // Defensive: ensure we have an array
      let adminsList: Admin[] = [];
      if (response && Array.isArray(response.data)) {
        adminsList = response.data;
      } else if (Array.isArray(response)) {
        // Fallback: if response itself is an array
        adminsList = response as any;
      } else {
        console.error('Unexpected response format:', response);
        adminsList = [];
      }
      
      // Filter to show only top-level admins (exclude subordinate department admins)
      // Top-level admins are those who report to:
      // - Super Admin (ADM0000)
      // - State Admins (ADM0001, ADM0002)
      // - Or have no reportingTo (Super Admin itself)
      // Exclude admins who report to department admins (ADM0021+)
      const topLevelAdmins = adminsList.filter(admin => {
        if (!admin.reportingTo) return true; // Super Admin
        const reportingToNum = parseInt(admin.reportingTo.replace('ADM', ''));
        // Include if reporting to Super Admin (0) or State Admins (1-2) or early district admins (3-20)
        // Exclude if reporting to main dept admins (21+)
        return reportingToNum <= 20;
      });
      
      setAdmins(topLevelAdmins);
    } catch (err: any) {
      setError(err.message || 'Failed to load admins');
      console.error('Error loading admins:', err);
      setAdmins([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminAPI.getAdminStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await adminAPI.getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadStates = async () => {
    try {
      const statesData = await adminAPI.getStates();
      setStates(statesData);
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const loadPermissionProfiles = async () => {
    try {
      const profiles = await adminAPI.getPermissionProfiles();
      setPermissionProfiles(profiles);
    } catch (err) {
      console.error('Error loading permission profiles:', err);
    }
  };

  const loadSubordinates = async (adminId: string) => {
    try {
      setSubordinatesLoading(true);
      const response = await adminAPI.getSubordinates(adminId, { limit: 100 });
      
      // Defensive: ensure we have an array
      if (response && Array.isArray(response.data)) {
        setSubordinates(response.data);
      } else if (Array.isArray(response)) {
        setSubordinates(response as any);
      } else {
        console.error('Unexpected subordinates response format:', response);
        setSubordinates([]);
      }
    } catch (err) {
      console.error('Error loading subordinates:', err);
      setSubordinates([]); // Set empty array on error
    } finally {
      setSubordinatesLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.department) {
        showAlert('Please fill in all required fields: Name, Email, Phone, and Department.');
        return;
      }

      setIsSubmittingForm(true);
      const createData: CreateAdminRequest = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation || 'Admin',
        role: formData.role,
        department: formData.department,
        permissionsProfile: formData.permissionsProfile || 'default',
        scope: {
          country: 'India',
          states: formData.state ? [formData.state] : [],
          districts: [],
          regions: formData.region ? [formData.region] : [],
          cities: [],
        },
      };

      await adminAPI.createAdmin(createData);
      showAlert('Admin created successfully!');
      setModalVisible(false);
      loadAdmins();
      loadStats();
      // Reset form
      setFormData({ fullName: '', email: '', phone: '', designation: '', role: 'STATE_ADMIN', department: '', state: '', region: '', permissionsProfile: '' });
      setFormRoleOpen(false);
      setFormStateOpen(false);
      setFormDeptOpen(false);
      setFormStateSearch('');
      setFormDeptSearch('');
    } catch (err: any) {
      showAlert(err.message || 'Failed to create admin');
      console.error('Error creating admin:', err);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    console.log('handleDeleteAdmin called with adminId:', adminId);
    try {
      console.log('Calling adminAPI.deleteAdmin...');
      await adminAPI.deleteAdmin(adminId);
      console.log('Admin deleted successfully');
      showAlert('Admin removed successfully');
      setSelectedAdmin(null);
      loadAdmins();
      loadStats();
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      showAlert(err.message || 'Failed to remove admin');
    }
  };

  const handleChangeDepartment = async () => {
    if (!adminToUpdate || !selectedDepartment) {
      showAlert('Please select a department');
      return;
    }

    try {
      await adminAPI.updateAdmin(adminToUpdate.adminId, {
        department: selectedDepartment,
      });
      showAlert('Department updated successfully');
      setChangeDepartmentModalVisible(false);
      setAdminToUpdate(null);
      setSelectedDepartment('');
      loadAdmins();
      if (selectedAdmin?.adminId === adminToUpdate.adminId) {
        setSelectedAdmin({ ...selectedAdmin, department: selectedDepartment });
      }
    } catch (err: any) {
      showAlert(err.message || 'Failed to update department');
      console.error('Error updating department:', err);
    }
  };

  const handleChangeState = async () => {
    if (!adminToUpdate || !selectedState) {
      showAlert('Please select a state');
      return;
    }

    try {
      await adminAPI.updateAdmin(adminToUpdate.adminId, {
        scope: {
          country: adminToUpdate.scope?.country || 'India',
          states: [selectedState],
          districts: adminToUpdate.scope?.districts || [],
          regions: adminToUpdate.scope?.regions || [],
          cities: adminToUpdate.scope?.cities || [],
        },
      });
      showAlert('State updated successfully');
      setChangeStateModalVisible(false);
      setAdminToUpdate(null);
      setSelectedState('');
      loadAdmins();
      if (selectedAdmin?.adminId === adminToUpdate.adminId) {
        setSelectedAdmin({
          ...selectedAdmin,
          scope: { 
            ...(selectedAdmin.scope || { country: 'India', states: [], districts: [], regions: [], cities: [] }),
            states: [selectedState],
          },
        });
      }
    } catch (err: any) {
      showAlert(err.message || 'Failed to update state');
      console.error('Error updating state:', err);
    }
  };

  const openChangeDepartmentModal = (admin: Admin) => {
    setAdminToUpdate(admin);
    setSelectedDepartment(admin.department || '');
    setChangeDepartmentModalVisible(true);
    setActiveMenuIndex(null);
  };

  const openChangeStateModal = (admin: Admin) => {
    setAdminToUpdate(admin);
    setSelectedState(admin.scope?.states?.[0] || '');
    setChangeStateModalVisible(true);
    setActiveMenuIndex(null);
  };

  // Helper function to dynamically generate initials badge letters
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleActionMenu = (index: number) => {
    setActiveMenuIndex(activeMenuIndex === index ? null : index);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return formatDate(dateString);
  };

  if (loading && admins.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#535CE8" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading admins...</Text>
      </View>
    );
  }

  // --- Sub-Layout VIEW A: Master List View Content Panel ---
  const renderMasterDirectoryList = () => (
    <>
      {/* Top Header Row with Breadcrumbs & Search Bar */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Admins</Text>
          </View>
          <Text style={styles.pageTitle}>Admin Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your State and Department Admins</Text>
        </View>
        
        {/* Universal Search Field */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Admin (name, email, ID)"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#535CE8" style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.searchIcon}>🔍</Text>
          )}
        </View>
      </View>

      {/* Primary Action bar with Add Admin & Context Filters */}
      <View style={[styles.filterActionBar, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
        <TouchableOpacity style={styles.addAdminButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addAdminButtonText}>Add Admin</Text>
        </TouchableOpacity>

        <View style={[styles.rightFiltersContainer, isMobile && { justifyContent: 'space-between', width: '100%' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.miniDropdownCard}
              onPress={() => setRoleFilterModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {filters.role ? filters.role.replace(/_/g, ' ') : 'All Roles'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniDropdownCard}
              onPress={() => setStateFilterModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {filters.state || 'All States'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniDropdownCard}
              onPress={() => setDepartmentFilterModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {filters.department || 'All Departments'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterConfigButton}
              onPress={() => setFilters({ role: '', state: '', department: '' })}
            >
              <RefreshIcon width={16} height={16} fill="#4B5563" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Core Directory Data Card Table Wrapper */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
      <View style={[styles.tableCardContainer, { width: Math.max(width - 64, 900) }]}>
        <View style={styles.tableSummaryCountHeader}>
          <Text style={styles.summaryTotalCountText}>
            Total Admins <Text style={styles.boldText}>{stats?.totalAdmins || admins.length}</Text>
          </Text>
          <Text style={styles.summaryStatusBreakdownText}>
            Active: <Text style={{ color: '#10B981', fontWeight: '700' }}>{stats?.activeAdmins || 0}</Text>  |  Inactive: <Text style={{ color: '#EF4444', fontWeight: '700' }}>{stats?.inactiveAdmins || 0}</Text>
          </Text>
        </View>

        {/* Header Column Titles row */}
        <View style={styles.tableHeaderColumnsRow}>
          <Text style={[styles.headerCell, { flex: 2.5 }]}>Name ▲</Text>
          <Text style={[styles.headerCell, { flex: 2.2 }]}>Department ▲</Text>
          <Text style={[styles.headerCell, { flex: 1.8 }]}>Admin ID ▲</Text>
          <Text style={[styles.headerCell, { flex: 2.8 }]}>Email ID ▲</Text>
          <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'center' }]}>Status ▲</Text>
          <Text style={[styles.headerCell, { flex: 1.8 }]}>State ▲</Text>
          <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>More</Text>
        </View>

        {/* Rows Mapping Loop */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#535CE8" />
          </View>
        ) : error ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', marginBottom: 12 }}>{error}</Text>
            <TouchableOpacity onPress={loadAdmins} style={styles.addAdminButton}>
              <Text style={styles.addAdminButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : admins.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>No admins found</Text>
          </View>
        ) : (
          pagedAdmins.map((row, index) => (
            <View key={row.adminId} style={[styles.tableBodyDataRow, { zIndex: activeMenuIndex === index ? 100 : 1 }]}>
              {/* Clickable Active Hitbox to Open Profile Details Panel */}
              <TouchableOpacity 
                style={[styles.profileAvatarCellGroup, { flex: 2.5 }]} 
                onPress={() => setSelectedAdmin(row)}
              >
                <View style={styles.avatarCircleSurface}>
                  <Text style={styles.avatarInitialsText}>{getInitials(row.fullName)}</Text>
                </View>
                <Text style={[styles.bodyCell, styles.boldBodyCellText, styles.clickableTextName]}>{row.fullName}</Text>
              </TouchableOpacity>

              <View style={[{ flex: 2.2, alignItems: 'flex-start' }]}>
                <View style={styles.deptBadgeContainer}>
                  <Text style={styles.deptBadgeText} numberOfLines={1}>{row.department || row.role}</Text>
                </View>
              </View>

              <Text style={[styles.bodyCell, { flex: 1.8, color: '#4B5563' }]}>{row.employeeCode}</Text>
              <Text style={[styles.bodyCell, { flex: 2.8, color: '#4B5563' }]} numberOfLines={1}>{row.email}</Text>
              
              <View style={{ flex: 1.5, alignItems: 'center' }}>
                <View style={[styles.statusBadgePill, row.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                  <Text style={[styles.statusBadgeText, row.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>
                    {row.status}
                  </Text>
                </View>
              </View>

              <Text style={[styles.bodyCell, { flex: 1.8 }]}>{row.scope?.states?.[0] || 'N/A'}</Text>
              
              {/* Context Action Dropdown Menu Trigger */}
              <View style={{ flex: 0.8, alignItems: 'center', position: 'relative' }}>
                <TouchableOpacity onPress={() => toggleActionMenu(index)} style={{ paddingHorizontal: 8 }}>
                  <Text style={styles.moreActionDotsIcon}>⋮</Text>
                </TouchableOpacity>

                {activeMenuIndex === index && (
                  <View style={styles.actionMenuDropdownCard}>
                    <TouchableOpacity 
                      style={styles.actionMenuItemRow} 
                      onPress={() => openChangeStateModal(row)}
                    >
                      <Text style={styles.actionMenuItemText}>Change State</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionMenuItemRow} 
                      onPress={() => openChangeDepartmentModal(row)}
                    >
                      <Text style={styles.actionMenuItemText}>Change Department</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionMenuItemRow} onPress={() => setActiveMenuIndex(null)}>
                      <Text style={styles.actionMenuItemText}>Manage Permissions</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {/* Pagination controls */}
        {!loading && !error && admins.length > ADMIN_PAGE_SIZE && (
          <Pagination
            page={adminPage}
            totalPages={totalAdminPages}
            totalCount={admins.length}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={(newPage) => {
              setActiveMenuIndex(null);
              setAdminPage(newPage);
            }}
            itemLabel="admins"
          />
        )}
      </View>
      </ScrollView>
    </>
  );

  // --- Sub-Layout VIEW B: Deep Detailed Single Profile Screen View Panel ---
  const renderDetailedAdminProfile = (admin: Admin) => (
    <>
      {/* Top Header Row with Deep Navigation Path Breadcrumbs */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <TouchableOpacity onPress={() => setSelectedAdmin(null)}>
              <Text style={styles.breadcrumbLinkBack}>Admins</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive} numberOfLines={1}>{admin.fullName}</Text>
          </View>
          <Text style={[styles.pageTitle, isMobile && { fontSize: 18 }]}>Admin Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your State and Department Admins</Text>
        </View>
      </View>

      {/* Explicit Core Step Back Mechanism Action Button Link */}
      <TouchableOpacity style={styles.backButtonTouchableContainer} onPress={() => setSelectedAdmin(null)}>
        <Text style={styles.backButtonChevronText}>←</Text>
        <Text style={styles.backButtonLabelText}>Back to Admins</Text>
      </TouchableOpacity>

      {/* Main Admin Meta Identity Card Panel — stacks vertically on mobile */}
      <View style={[styles.profileIdentityHeroCardSurface, isMobile && styles.profileHeroCardMobile]}>
        <View style={[styles.heroLeftSectionGroup, isMobile && { marginBottom: 16 }]}>
          <View style={[styles.largeHeroAvatarCircleSurface, isMobile && { width: 52, height: 52, borderRadius: 26, marginRight: 12 }]}>
            <Text style={[styles.largeHeroAvatarInitialsText, isMobile && { fontSize: 18 }]}>{getInitials(admin.fullName)}</Text>
          </View>
          <View style={[styles.heroMetaDetailsBlock, { flex: 1 }]}>
            <Text style={[styles.heroProfileNameText, isMobile && { fontSize: 17 }]} numberOfLines={2}>{admin.fullName}</Text>
            <Text style={styles.heroProfileDeptLabelText}>{admin.department || admin.role}</Text>
            <View style={[styles.heroBadgesRow, { flexWrap: 'wrap', gap: 4 }]}>
              <View style={[styles.statusBadgePill, admin.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                <Text style={[styles.statusBadgeText, admin.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{admin.status}</Text>
              </View>
              {(admin.scope?.states || []).map((state, idx) => (
                <View key={idx} style={styles.metaRegionTextBadgeContainer}>
                  <Text style={styles.metaRegionTextBadgeValue}>{state}</Text>
                </View>
              ))}
              {(admin.scope?.districts || []).map((district, idx) => (
                <View key={idx} style={styles.metaRegionTextBadgeContainer}>
                  <Text style={styles.metaRegionTextBadgeValue}>{district}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Global CRUD Profile Action Control Buttons — wrap on mobile */}
        <View style={[styles.heroRightActionControlButtonsStackRow, isMobile && styles.heroActionButtonsMobile]}>
          <TouchableOpacity 
            style={[styles.secondaryUtilityActionButton, isMobile && styles.actionButtonFullWidth]}
            onPress={() => openChangeStateModal(admin)}
          >
            <Text style={styles.secondaryUtilityActionButtonText}>Change State</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryUtilityActionButton, isMobile && styles.actionButtonFullWidth]}
            onPress={() => openChangeDepartmentModal(admin)}
          >
            <Text style={styles.secondaryUtilityActionButtonText}>Change Department</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.destructiveDangerActionButton, isMobile && styles.actionButtonFullWidth]}
            onPress={async () => {
              if (await showConfirm(`Are you sure you want to remove ${admin.fullName}? This will deactivate their account.`)) {
                handleDeleteAdmin(admin.adminId);
              }
            }}
          >
            <Text style={styles.destructiveDangerActionButtonText}>Remove Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Split Segment Block for Info Fields — stacks on mobile */}
      <View style={[styles.splitGridDetailsInfoLayoutContainer, isMobile && { flexDirection: 'column' }]}>
        {/* Card Field Block 1: Profile Structural Metrics */}
        <View style={[styles.gridInfoCardContainerFlexPanel, isMobile && { marginHorizontal: 0, marginBottom: 12 }]}>
          <Text style={styles.gridSectionHeadingTitleText}>Profile Information</Text>
          
          <View style={styles.metricItemRowFieldUnit}>
            <PersonIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Admin ID</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{admin.employeeCode}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <SMIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Role</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{admin.role.replace(/_/g, ' ')}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <LocationIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>State</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{(admin.scope?.states || []).join(', ') || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <PersonIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Users Managing</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>
                {(admin.managedUsers?.admins || 0) + (admin.managedUsers?.customers || 0) + (admin.managedUsers?.pilots || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Field Block 2: Accounts Metadata Credentials Metrics */}
        <View style={[styles.gridInfoCardContainerFlexPanel, isMobile && { marginHorizontal: 0 }]}>
          <Text style={styles.gridSectionHeadingTitleText}>Account Details</Text>

          <View style={styles.metricItemRowFieldUnit}>
            <ClockIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Joined Date</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{formatDate(admin.joinedAt)}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <ActivityIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Last Active</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{getTimeAgo(admin.lastLogin)}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <EmailIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Email</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{admin.email}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <CallIcon width={24} height={24} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Mobile</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{admin.phone}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Nested Data Table Sub-Section — horizontal scroll on mobile */}
      <View style={[styles.tableCardContainer, { marginTop: 24 }]}>
        <View style={styles.subTableTitleCustomHeaderContainerRow}>
          <Text style={[styles.nestedTableCardSectionTitleText, isMobile && { fontSize: 13 }]}>Department-Admins Managed by this Admin</Text>
        </View>
        
        <View style={styles.tableSummaryCountHeader}>
          <Text style={styles.summaryTotalCountText}>Total Admins: <Text style={styles.boldText}>{subordinates.length}</Text></Text>
          <Text style={styles.summaryStatusBreakdownText}>
            Active: <Text style={{ color: '#10B981', fontWeight: '700' }}>{subordinates.filter(s => s.status === 'ACTIVE').length}</Text>  |  Inactive: <Text style={{ color: '#EF4444', fontWeight: '700' }}>{subordinates.filter(s => s.status !== 'ACTIVE').length}</Text>
          </Text>
        </View>

        {/* Sub-Table: horizontal scroll on mobile, normal on desktop */}
        {subordinatesLoading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#535CE8" />
          </View>
        ) : subordinates.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>No subordinates found</Text>
          </View>
        ) : isMobile ? (
          /* Mobile: Card list instead of table */
          subordinates.map((subAdmin) => (
            <View key={subAdmin.adminId} style={styles.mobileSubAdminCard}>
              <View style={styles.mobileSubAdminCardHeader}>
                <View style={[styles.avatarCircleSurface, { backgroundColor: '#E0E7FF', marginRight: 12 }]}>
                  <Text style={[styles.avatarInitialsText, { color: '#4F46E5' }]}>{getInitials(subAdmin.fullName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bodyCell, styles.boldBodyCellText, { marginLeft: 0 }]}>{subAdmin.fullName}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{subAdmin.employeeCode}</Text>
                </View>
                <View style={[styles.statusBadgePill, subAdmin.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                  <Text style={[styles.statusBadgeText, subAdmin.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{subAdmin.status}</Text>
                </View>
              </View>
              <View style={styles.mobileSubAdminCardBody}>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>Department</Text>
                  <Text style={styles.mobileFieldValue}>{subAdmin.department || subAdmin.role}</Text>
                </View>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>State</Text>
                  <Text style={styles.mobileFieldValue}>{subAdmin.scope?.states?.[0] || 'N/A'}</Text>
                </View>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>Email</Text>
                  <Text style={[styles.mobileFieldValue, { flexShrink: 1 }]} numberOfLines={1}>{subAdmin.email}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          /* Desktop: horizontal table */
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 700 }}>
              <View style={styles.tableHeaderColumnsRow}>
                <Text style={[styles.headerCell, { flex: 2.2 }]}>Name ↕</Text>
                <Text style={[styles.headerCell, { flex: 2.5 }]}>Department ↕</Text>
                <Text style={[styles.headerCell, { flex: 2.0 }]}>Sub-admin ID ↕</Text>
                <Text style={[styles.headerCell, { flex: 3.0 }]}>Email ID ↕</Text>
                <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'center' }]}>Status ↕</Text>
                <Text style={[styles.headerCell, { flex: 1.8 }]}>State ↕</Text>
                <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>More</Text>
              </View>
              {subordinates.map((subAdmin) => (
                <View key={subAdmin.adminId} style={styles.tableBodyDataRow}>
                  <View style={[styles.profileAvatarCellGroup, { flex: 2.2 }]}>
                    <View style={[styles.avatarCircleSurface, { backgroundColor: '#E0E7FF' }]}>
                      <Text style={[styles.avatarInitialsText, { color: '#4F46E5' }]}>{getInitials(subAdmin.fullName)}</Text>
                    </View>
                    <Text style={[styles.bodyCell, styles.boldBodyCellText]}>{subAdmin.fullName}</Text>
                  </View>
                  <View style={[{ flex: 2.5, alignItems: 'flex-start' }]}>
                    <View style={styles.deptBadgeContainer}>
                      <Text style={styles.deptBadgeText}>{subAdmin.department || subAdmin.role}</Text>
                    </View>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 2.0, color: '#4B5563' }]}>{subAdmin.employeeCode}</Text>
                  <Text style={[styles.bodyCell, { flex: 3.0, color: '#4B5563' }]} numberOfLines={1}>{subAdmin.email}</Text>
                  <View style={{ flex: 1.5, alignItems: 'center' }}>
                    <View style={[styles.statusBadgePill, subAdmin.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                      <Text style={[styles.statusBadgeText, subAdmin.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{subAdmin.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.bodyCell, { flex: 1.8 }]}>{subAdmin.scope?.states?.[0] || 'N/A'}</Text>
                  <TouchableOpacity style={{ flex: 0.8, alignItems: 'center' }}>
                    <Text style={styles.moreActionDotsIcon}>⋮</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.appMasterContainerViewWrapper}>
      {/* Structural Left Navigation Sidebar Panel Menu Layout Section */}
      {/*renderSidebar()*/}

      {/* Primary Dynamic App Core Data Layout Canvas Panel View */}
      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}>
        {selectedAdmin ? renderDetailedAdminProfile(selectedAdmin) : renderMasterDirectoryList()}
      </ScrollView>

      {/* Modals live OUTSIDE the ScrollView — a <Modal> nested inside a
          ScrollView fails to present on native (iOS/Android). */}

      {/* ==================== ADD NEW ADMIN FORM MODAL ==================== */}
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { setModalVisible(false); setFormRoleOpen(false); setFormStateOpen(false); setFormDeptOpen(false); }}>
          <View style={styles.nafOverlay}>
            <TouchableWithoutFeedback onPress={() => { setFormRoleOpen(false); setFormStateOpen(false); setFormDeptOpen(false); }}>
              <View style={styles.nafCard}>

                {/* Header */}
                <View style={styles.nafHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nafTitle}>Add New Admin Form</Text>
                    <Text style={styles.nafSubtitle}>Create a new Admin account by filling out the form below.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setModalVisible(false); setFormRoleOpen(false); setFormStateOpen(false); setFormDeptOpen(false); }}
                    style={styles.nafCloseBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.nafCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable Form Body */}
                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.nafBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                  {/* Name */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Name</Text>
                    <View style={styles.nafInputBox}>
                      <TextInput style={styles.nafInput} placeholder="Full Name of the Admin" placeholderTextColor="#9CA3AF" value={formData.fullName} onChangeText={(t) => setFormData({ ...formData, fullName: t })} />
                    </View>
                  </View>

                  {/* Mobile */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Mobile Number</Text>
                    <View style={styles.nafInputBox}>
                      <TextInput style={styles.nafInput} placeholder="Mobile Number of the Admin" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} />
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Email ID</Text>
                    <View style={styles.nafInputBox}>
                      <TextInput style={styles.nafInput} placeholder="Email ID of the Admin" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} />
                    </View>
                  </View>

                  {/* Role Dropdown */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Role</Text>
                    <TouchableOpacity style={[styles.nafDropdownTrigger, formRoleOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormRoleOpen(!formRoleOpen); setFormStateOpen(false); setFormDeptOpen(false); }} activeOpacity={0.8}>
                      <Text style={[styles.nafDropdownValue, !formData.role && styles.nafDropdownPlaceholder]}>
                        {formData.role ? formData.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Select Role of the Admin'}
                      </Text>
                      <Text style={[styles.nafChevron, formRoleOpen && styles.nafChevronOpen]}>⌄</Text>
                    </TouchableOpacity>
                    {formRoleOpen && (
                      <View style={styles.nafDropdownPanel}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {[
                            { value: 'SUPER_ADMIN', label: 'Super Admin' },
                            { value: 'STATE_ADMIN', label: 'State Admin' },
                            { value: 'DEPARTMENT_ADMIN', label: 'Department Admin' },
                            { value: 'DISTRICT_ADMIN', label: 'District Admin' },
                          ].map((item) => (
                            <TouchableOpacity key={item.value} style={[styles.nafDropdownItem, formData.role === item.value && styles.nafDropdownItemSelected]} onPress={() => { setFormData({ ...formData, role: item.value }); setFormRoleOpen(false); }} activeOpacity={0.7}>
                              <Text style={[styles.nafDropdownItemText, formData.role === item.value && styles.nafDropdownItemTextSelected]}>{item.label}</Text>
                              {formData.role === item.value && <Text style={styles.nafCheckmark}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Assigned State */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Assigned State</Text>
                    <TouchableOpacity style={[styles.nafDropdownTrigger, formStateOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormStateOpen(!formStateOpen); setFormRoleOpen(false); setFormDeptOpen(false); }} activeOpacity={0.8}>
                      <Text style={[styles.nafDropdownValue, !formData.state && styles.nafDropdownPlaceholder]}>{formData.state || 'Select State of the Admin'}</Text>
                      <Text style={[styles.nafChevron, formStateOpen && styles.nafChevronOpen]}>⌄</Text>
                    </TouchableOpacity>
                    {formStateOpen && (
                      <View style={styles.nafDropdownPanel}>
                        <View style={styles.nafSearchRow}>
                          <TextInput style={styles.nafSearchInput} placeholder="Search state..." placeholderTextColor="#9CA3AF" value={formStateSearch} onChangeText={setFormStateSearch} autoFocus />
                        </View>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {states.filter(s => s.name.toLowerCase().includes(formStateSearch.toLowerCase())).map((state) => (
                            <TouchableOpacity key={state.stateId} style={[styles.nafDropdownItem, formData.state === state.name && styles.nafDropdownItemSelected]} onPress={() => { setFormData({ ...formData, state: state.name }); setFormStateOpen(false); setFormStateSearch(''); }} activeOpacity={0.7}>
                              <Text style={[styles.nafDropdownItemText, formData.state === state.name && styles.nafDropdownItemTextSelected]}>{state.name}</Text>
                              {formData.state === state.name && <Text style={styles.nafCheckmark}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                          {states.filter(s => s.name.toLowerCase().includes(formStateSearch.toLowerCase())).length === 0 && <Text style={styles.nafNoResults}>No states found</Text>}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Assigned Region */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Assigned Region</Text>
                    <View style={styles.nafInputBox}>
                      <TextInput style={styles.nafInput} placeholder="Select Region of the Admin" placeholderTextColor="#9CA3AF" value={formData.region} onChangeText={(t) => setFormData({ ...formData, region: t })} />
                    </View>
                  </View>

                  {/* Assigned Department */}
                  <View style={styles.nafFieldWrap}>
                    <Text style={styles.nafFieldLabel}>Assigned Department</Text>
                    <TouchableOpacity style={[styles.nafDropdownTrigger, formDeptOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormDeptOpen(!formDeptOpen); setFormRoleOpen(false); setFormStateOpen(false); }} activeOpacity={0.8}>
                      <Text style={[styles.nafDropdownValue, !formData.department && styles.nafDropdownPlaceholder]}>{formData.department || 'Select Department of the Admin'}</Text>
                      <Text style={[styles.nafChevron, formDeptOpen && styles.nafChevronOpen]}>⌄</Text>
                    </TouchableOpacity>
                    {formDeptOpen && (
                      <View style={styles.nafDropdownPanel}>
                        <View style={styles.nafSearchRow}>
                          <TextInput style={styles.nafSearchInput} placeholder="Search department..." placeholderTextColor="#9CA3AF" value={formDeptSearch} onChangeText={setFormDeptSearch} autoFocus />
                        </View>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {departments.filter(d => d.name.toLowerCase().includes(formDeptSearch.toLowerCase())).map((dept) => (
                            <TouchableOpacity key={dept.departmentId} style={[styles.nafDropdownItem, formData.department === dept.name && styles.nafDropdownItemSelected]} onPress={() => { setFormData({ ...formData, department: dept.name }); setFormDeptOpen(false); setFormDeptSearch(''); }} activeOpacity={0.7}>
                              <Text style={[styles.nafDropdownItemText, formData.department === dept.name && styles.nafDropdownItemTextSelected]}>{dept.name}</Text>
                              {formData.department === dept.name && <Text style={styles.nafCheckmark}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                          {departments.filter(d => d.name.toLowerCase().includes(formDeptSearch.toLowerCase())).length === 0 && <Text style={styles.nafNoResults}>No departments found</Text>}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.nafSubmitBtn, (isSubmittingForm || !formData.fullName || !formData.email || !formData.phone || !formData.department) && styles.nafSubmitBtnDisabled]}
                    onPress={handleCreateAdmin}
                    disabled={isSubmittingForm || !formData.fullName || !formData.email || !formData.phone || !formData.department}
                    activeOpacity={0.85}
                  >
                    {isSubmittingForm ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.nafSubmitBtnText}>Add Admin</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.nafCancelBtn} onPress={() => { setModalVisible(false); setFormRoleOpen(false); setFormStateOpen(false); setFormDeptOpen(false); }} activeOpacity={0.7}>
                    <Text style={styles.nafCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <View style={{ height: 24 }} />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </Modal>


        {/* -------------------- CHANGE DEPARTMENT MODAL -------------------- */}
        <Modal visible={changeDepartmentModalVisible} transparent animationType="slide" onRequestClose={() => setChangeDepartmentModalVisible(false)}>
          <View style={styles.modalBackdropMask}>
            <View style={styles.addAdminModalSheet}>
              <View style={styles.addAdminModalHeader}>
                <View>
                  <Text style={styles.addAdminModalTitle}>Change Department</Text>
                  <Text style={styles.addAdminModalSubtitle} numberOfLines={1}>For: {adminToUpdate?.fullName}</Text>
                </View>
                <TouchableOpacity onPress={() => setChangeDepartmentModalVisible(false)} style={styles.addAdminCloseBtn}>
                  <Text style={styles.addAdminCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.addAdminSectionLabel}>🏢 Select Department</Text>
                {/* Current dept indicator */}
                {adminToUpdate?.department && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>Current: <Text style={{ fontWeight: '700' }}>{adminToUpdate.department}</Text></Text>
                  </View>
                )}
                <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {departments.map((dept) => (
                    <TouchableOpacity
                      key={dept.departmentId}
                      style={[styles.addAdminDropdownItem, { borderBottomWidth: 1, borderColor: '#F3F4F6' }, selectedDepartment === dept.name && styles.addAdminDropdownItemSelected]}
                      onPress={() => setSelectedDepartment(dept.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addAdminDropdownItemIcon}>📁</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.addAdminDropdownItemLabel, selectedDepartment === dept.name && { color: '#4F46E5', fontWeight: '700' }]}>{dept.name}</Text>
                      </View>
                      {selectedDepartment === dept.name && <Text style={styles.addAdminDropdownCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.addAdminDivider} />
                <TouchableOpacity style={[styles.addAdminSubmitBtn, !selectedDepartment && styles.addAdminSubmitBtnDisabled]} onPress={handleChangeDepartment} disabled={!selectedDepartment} activeOpacity={0.85}>
                  <Text style={styles.addAdminSubmitBtnText}>✅  Update Department</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addAdminCancelBtn, { marginTop: 10 }]} onPress={() => setChangeDepartmentModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.addAdminCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* -------------------- CHANGE STATE MODAL -------------------- */}
        <Modal visible={changeStateModalVisible} transparent animationType="slide" onRequestClose={() => setChangeStateModalVisible(false)}>
          <View style={styles.modalBackdropMask}>
            <View style={styles.addAdminModalSheet}>
              <View style={styles.addAdminModalHeader}>
                <View>
                  <Text style={styles.addAdminModalTitle}>Change State</Text>
                  <Text style={styles.addAdminModalSubtitle} numberOfLines={1}>For: {adminToUpdate?.fullName}</Text>
                </View>
                <TouchableOpacity onPress={() => setChangeStateModalVisible(false)} style={styles.addAdminCloseBtn}>
                  <Text style={styles.addAdminCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.addAdminSectionLabel}>🗺️ Select State</Text>
                {/* Current state indicator */}
                {adminToUpdate?.scope?.states?.[0] && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, color: '#166534', fontWeight: '500' }}>Current: <Text style={{ fontWeight: '700' }}>{adminToUpdate.scope?.states?.[0] || ''}</Text></Text>
                  </View>
                )}
                <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {states.map((state) => (
                    <TouchableOpacity
                      key={state.stateId}
                      style={[styles.addAdminDropdownItem, { borderBottomWidth: 1, borderColor: '#F3F4F6' }, selectedState === state.name && styles.addAdminDropdownItemSelected]}
                      onPress={() => setSelectedState(state.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addAdminDropdownItemIcon}>🗺️</Text>
                      <Text style={[styles.addAdminDropdownItemLabel, selectedState === state.name && { color: '#4F46E5', fontWeight: '700' }]}>{state.name}</Text>
                      {selectedState === state.name && <Text style={styles.addAdminDropdownCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.addAdminDivider} />
                <TouchableOpacity style={[styles.addAdminSubmitBtn, !selectedState && styles.addAdminSubmitBtnDisabled]} onPress={handleChangeState} disabled={!selectedState} activeOpacity={0.85}>
                  <Text style={styles.addAdminSubmitBtnText}>✅  Update State</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addAdminCancelBtn, { marginTop: 10 }]} onPress={() => setChangeStateModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.addAdminCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* -------------------- ROLE FILTER MODAL -------------------- */}
        <Modal visible={roleFilterModalVisible} transparent animationType="fade" onRequestClose={() => setRoleFilterModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setRoleFilterModalVisible(false)}>
            <View style={styles.modalBackdropMask}>
              <TouchableWithoutFeedback>
                <View style={styles.formCardModalPanel}>
                  <View style={styles.modalHeaderCloseRow}>
                    <Text style={styles.formModalTitleText}>Filter by Role</Text>
                    <TouchableOpacity onPress={() => setRoleFilterModalVisible(false)} style={styles.closeTouchArea}>
                      <Text style={styles.closeIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formModalSubtitleText}>Select a role to filter admins</Text>

                  <View style={styles.formFieldContainerRow}>
                    <TouchableOpacity
                      style={[
                        styles.formSelectPickerBox,
                        filters.role === '' && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                      ]}
                      onPress={() => {
                        setFilters({ ...filters, role: '' });
                        setRoleFilterModalVisible(false);
                      }}
                    >
                      <Text style={[styles.pickerPlaceholderText, filters.role === '' && { color: '#535CE8', fontWeight: '600' }]}>
                        All Roles
                      </Text>
                      {filters.role === '' && <Text style={{ color: '#535CE8' }}>✓</Text>}
                    </TouchableOpacity>

                    {['SUPER_ADMIN', 'STATE_ADMIN', 'DEPARTMENT_ADMIN', 'DISTRICT_ADMIN'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.formSelectPickerBox,
                          filters.role === role && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                        ]}
                        onPress={() => {
                          setFilters({ ...filters, role });
                          setRoleFilterModalVisible(false);
                        }}
                      >
                        <Text style={[styles.pickerPlaceholderText, filters.role === role && { color: '#535CE8', fontWeight: '600' }]}>
                          {role.replace(/_/g, ' ')}
                        </Text>
                        {filters.role === role && <Text style={{ color: '#535CE8' }}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* -------------------- STATE FILTER MODAL -------------------- */}
        <Modal visible={stateFilterModalVisible} transparent animationType="fade" onRequestClose={() => setStateFilterModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setStateFilterModalVisible(false)}>
            <View style={styles.modalBackdropMask}>
              <TouchableWithoutFeedback>
                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  <View style={styles.formCardModalPanel}>
                    <View style={styles.modalHeaderCloseRow}>
                      <Text style={styles.formModalTitleText}>Filter by State</Text>
                      <TouchableOpacity onPress={() => setStateFilterModalVisible(false)} style={styles.closeTouchArea}>
                        <Text style={styles.closeIconText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.formModalSubtitleText}>Select a state to filter admins</Text>

                    <View style={styles.formFieldContainerRow}>
                      <TouchableOpacity
                        style={[
                          styles.formSelectPickerBox,
                          filters.state === '' && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                        ]}
                        onPress={() => {
                          setFilters({ ...filters, state: '' });
                          setStateFilterModalVisible(false);
                        }}
                      >
                        <Text style={[styles.pickerPlaceholderText, filters.state === '' && { color: '#535CE8', fontWeight: '600' }]}>
                          All States
                        </Text>
                        {filters.state === '' && <Text style={{ color: '#535CE8' }}>✓</Text>}
                      </TouchableOpacity>

                      <ScrollView style={{ maxHeight: 300 }}>
                        {states.map((state) => (
                          <TouchableOpacity
                            key={state.stateId}
                            style={[
                              styles.formSelectPickerBox,
                              filters.state === state.name && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                            ]}
                            onPress={() => {
                              setFilters({ ...filters, state: state.name });
                              setStateFilterModalVisible(false);
                            }}
                          >
                            <Text style={[styles.pickerPlaceholderText, filters.state === state.name && { color: '#535CE8', fontWeight: '600' }]}>
                              {state.name}
                            </Text>
                            {filters.state === state.name && <Text style={{ color: '#535CE8' }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </ScrollView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* -------------------- DEPARTMENT FILTER MODAL -------------------- */}
        <Modal visible={departmentFilterModalVisible} transparent animationType="fade" onRequestClose={() => setDepartmentFilterModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setDepartmentFilterModalVisible(false)}>
            <View style={styles.modalBackdropMask}>
              <TouchableWithoutFeedback>
                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  <View style={styles.formCardModalPanel}>
                    <View style={styles.modalHeaderCloseRow}>
                      <Text style={styles.formModalTitleText}>Filter by Department</Text>
                      <TouchableOpacity onPress={() => setDepartmentFilterModalVisible(false)} style={styles.closeTouchArea}>
                        <Text style={styles.closeIconText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.formModalSubtitleText}>Select a department to filter admins</Text>

                    <View style={styles.formFieldContainerRow}>
                      <TouchableOpacity
                        style={[
                          styles.formSelectPickerBox,
                          filters.department === '' && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                        ]}
                        onPress={() => {
                          setFilters({ ...filters, department: '' });
                          setDepartmentFilterModalVisible(false);
                        }}
                      >
                        <Text style={[styles.pickerPlaceholderText, filters.department === '' && { color: '#535CE8', fontWeight: '600' }]}>
                          All Departments
                        </Text>
                        {filters.department === '' && <Text style={{ color: '#535CE8' }}>✓</Text>}
                      </TouchableOpacity>

                      <ScrollView style={{ maxHeight: 300 }}>
                        {departments.map((dept) => (
                          <TouchableOpacity
                            key={dept.departmentId}
                            style={[
                              styles.formSelectPickerBox,
                              filters.department === dept.name && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                            ]}
                            onPress={() => {
                              setFilters({ ...filters, department: dept.name });
                              setDepartmentFilterModalVisible(false);
                            }}
                          >
                            <Text style={[styles.pickerPlaceholderText, filters.department === dept.name && { color: '#535CE8', fontWeight: '600' }]}>
                              {dept.name}
                            </Text>
                            {filters.department === dept.name && <Text style={{ color: '#535CE8' }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </ScrollView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
    </View>
  );
}

// --- Style Sheet Architecture Configuration Definitions ---
const styles = StyleSheet.create({
  appMasterContainerViewWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  sidebarContainer: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 24,
    paddingHorizontal: 14,
  },
  sidebarBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  sidebarBrandIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#4F46E5',
  },
  sidebarBrandTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  sidebarMenuLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarMenuLinkRowActive: {
    backgroundColor: '#535CE8',
  },
  sidebarMenuLinkIcon: {
    fontSize: 15,
    marginRight: 12,
    color: '#64748B',
    width: 20,
  },
  sidebarMenuLinkText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  sidebarMenuLinkTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  contentContainer: {
    padding: 32,
  },
  contentContainerMobile: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleIconPadding: {
    marginRight: 8,
  },
  breadcrumbHome: {
    fontSize: 12,
  },
  breadcrumbSeparator: {
    marginHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 11,
  },
  breadcrumbLinkBack: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    width: 280,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  searchIcon: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addAdminButton: {
    backgroundColor: '#535CE8',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addAdminButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rightFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniDropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 12,
    color: '#4B5563',
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 8,
    color: '#6B7280',
  },
  filterConfigButton: {
    marginLeft: 10,
    padding: 2,
  },
  tableCardContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  tableSummaryCountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  subTableTitleCustomHeaderContainerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  nestedTableCardSectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryTotalCountText: {
    fontSize: 13,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  summaryStatusBreakdownText: {
    fontSize: 12,
    color: '#6B7280',
  },
  tableHeaderColumnsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableBodyDataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  bodyCell: {
    fontSize: 12.5,
    color: '#111827',
  },
  boldBodyCellText: {
    fontWeight: '600',
    marginLeft: 10,
  },
  clickableTextName: {
    color: '#111827',
  },
  profileAvatarCellGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircleSurface: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  deptBadgeContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
  },
  deptBadgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  statusBadgePill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  statusBadgePillOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  statusBadgeTextOffline: {
    color: '#EF4444',
  },
  moreActionDotsIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  actionMenuDropdownCard: {
    position: 'absolute',
    top: 24,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 170,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 999,
  },
  actionMenuItemRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionMenuItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  backButtonTouchableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonChevronText: {
    fontSize: 16,
    color: '#4B5563',
    marginRight: 6,
    fontWeight: '600',
  },
  backButtonLabelText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  profileIdentityHeroCardSurface: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileHeroCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 16,
    gap: 0,
  },
  heroLeftSectionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeHeroAvatarCircleSurface: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  largeHeroAvatarInitialsText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetaDetailsBlock: {
    justifyContent: 'center',
  },
  heroProfileNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  heroProfileDeptLabelText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRegionTextBadgeContainer: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 6,
  },
  metaRegionTextBadgeValue: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  heroRightActionControlButtonsStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroActionButtonsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 12,
  },
  actionButtonFullWidth: {
    marginLeft: 0,
    width: '100%',
    alignItems: 'center',
  },
  secondaryUtilityActionButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryUtilityActionButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  destructiveDangerActionButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  destructiveDangerActionButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  splitGridDetailsInfoLayoutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridInfoCardContainerFlexPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
  },
  mobileSubAdminCard: {
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  mobileSubAdminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mobileSubAdminCardBody: {
    paddingLeft: 44,
  },
  mobileSubAdminField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  mobileFieldLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    width: 90,
    flexShrink: 0,
  },
  mobileFieldValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  gridSectionHeadingTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingBottom: 8,
  },
  metricItemRowFieldUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricLabelDescriptorIconText: {
    fontSize: 18,
    marginRight: 14,
    color: '#6B7280',
    width: 24,
    textAlign: 'center',
  },
  metricValueLabelFieldHeadlineText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricValueSecondaryDataValueText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  modalBackdropMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  formCardModalPanel: {
    width: '100%',
    maxWidth: 500,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeaderCloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formModalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeTouchArea: {
    padding: 4,
  },
  closeIconText: {
    fontSize: 14,
    color: '#6B7280',
  },
  formModalSubtitleText: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  formFieldContainerRow: {
    marginBottom: 14,
  },
  formInputLabelText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formTextInputField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  formSelectPickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  pickerPlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
  },
  pickerChevronArrow: {
    fontSize: 9,
    color: '#6B7280',
  },
  modalSubmitActionButton: {
    backgroundColor: '#535CE8',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelActionButton: {
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  modalCancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },

  // ==================== ADD ADMIN MODAL — Redesigned Styles ====================
  addAdminModalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  addAdminModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FAFBFF',
  },
  addAdminModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  addAdminModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addAdminCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAdminCloseBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  addAdminFormBody: {
    padding: 20,
    paddingTop: 16,
  },
  addAdminSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  addAdminFieldWrap: {
    marginBottom: 14,
  },
  addAdminFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  addAdminInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  addAdminInputBoxActive: {
    borderColor: '#6366F1',
    backgroundColor: '#FAFBFF',
  },
  addAdminInputIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center' as const,
  },
  addAdminInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none' as any,
    padding: 0,
  },
  addAdminDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  addAdminDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  addAdminDropdownTriggerOpen: {
    borderColor: '#6366F1',
    backgroundColor: '#FAFBFF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  addAdminDropdownTriggerIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center' as const,
  },
  addAdminDropdownTriggerText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  addAdminDropdownTriggerSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  addAdminDropdownChevron: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  addAdminDropdownPanel: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#6366F1',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  addAdminDropdownSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  addAdminDropdownSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
    padding: 0,
  },
  addAdminDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: '#F9FAFB',
  },
  addAdminDropdownItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  addAdminDropdownItemIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center' as const,
  },
  addAdminDropdownItemLabel: {
    fontSize: 13.5,
    color: '#1F2937',
    fontWeight: '500',
  },
  addAdminDropdownItemDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  addAdminDropdownCheckmark: {
    fontSize: 15,
    color: '#4F46E5',
    fontWeight: '700',
    marginLeft: 8,
  },
  addAdminValidationHint: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  addAdminValidationText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  addAdminSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  addAdminSubmitBtnDisabled: {
    backgroundColor: '#C7D2FE',
    shadowOpacity: 0,
    elevation: 0,
  },
  addAdminSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addAdminCancelBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  addAdminCancelBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── New Admin Form (naf) styles — matches screenshot design ──────────────
  nafOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  nafCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden' as const,
  },
  nafHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nafTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  nafSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  nafCloseBtn: {
    marginLeft: 10,
    padding: 4,
  },
  nafCloseBtnText: {
    fontSize: 16,
    color: '#6B7280',
  },
  nafBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  nafFieldWrap: {
    marginBottom: 14,
  },
  nafFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  nafInputBox: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
  },
  nafInput: {
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  nafDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
  },
  nafDropdownTriggerOpen: {
    borderColor: '#4F46E5',
  },
  nafDropdownValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  nafDropdownPlaceholder: {
    color: '#9CA3AF',
  },
  nafChevron: {
    fontSize: 20,
    color: '#6B7280',
    lineHeight: 22,
  },
  nafChevronOpen: {
    transform: [{ rotate: '180deg' }],
    color: '#4F46E5',
  },
  nafDropdownPanel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    overflow: 'hidden' as const,
    elevation: 4,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
  },
  nafSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nafSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  nafDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  nafDropdownItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  nafDropdownItemText: {
    flex: 1,
    fontSize: 13.5,
    color: '#1F2937',
    fontWeight: '500',
  },
  nafDropdownItemTextSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  nafCheckmark: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '700',
  },
  nafNoResults: {
    textAlign: 'center' as const,
    color: '#9CA3AF',
    fontSize: 13,
    padding: 16,
  },
  nafSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  nafSubmitBtnDisabled: {
    backgroundColor: '#A5B4FC',
  },
  nafSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nafCancelBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  nafCancelBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});