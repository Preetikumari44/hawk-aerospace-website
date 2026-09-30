import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
import { adminAPI, Admin, Department, State } from '../api/admin.api';
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
import DepartmentIcon from '../assets/icons/DepartmentIcon.svg';
import HomeIcon from '../assets/icons/home-vector.svg';
import RefreshIcon from '../assets/icons/RefreshIcon.svg';

export default function StateAdminProfile() {
  // --- Component State Layout Trackers ---
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  
  // Track selected sub-admin for single view routing profile view switch
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<Admin | null>(null);

  // Responsive Width Layout Hooks
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Change State/Department Modals
  const [changeStateModalVisible, setChangeStateModalVisible] = useState(false);
  const [changeDepartmentModalVisible, setChangeDepartmentModalVisible] = useState(false);
  const [adminToModify, setAdminToModify] = useState<Admin | null>(null);
  const [selectedNewState, setSelectedNewState] = useState('');
  const [selectedNewDepartment, setSelectedNewDepartment] = useState('');

  // API Data State
  const [subAdmins, setSubAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [mainDeptAdmins, setMainDeptAdmins] = useState<Admin[]>([]);

  // Pagination State
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    state: '',
    reportingTo: '',
  });

  // Form dropdown open states
  const [formDeptOpen, setFormDeptOpen] = useState(false);
  const [formStateOpen, setFormStateOpen] = useState(false);
  const [formReportingOpen, setFormReportingOpen] = useState(false);
  const [formDeptSearch, setFormDeptSearch] = useState('');
  const [formStateSearch, setFormStateSearch] = useState('');
  const [formReportingSearch, setFormReportingSearch] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    status: '',
    state: '',
    department: '',
  });

  // Filter dropdown open states
  const [stateDropOpen, setStateDropOpen] = useState(false);
  const [deptDropOpen, setDeptDropOpen] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);

  const statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ];

  // Load initial data
  useEffect(() => {
    loadSubAdmins();
    loadDepartments();
    loadStates();
    loadMainDeptAdmins();
  }, []);

  // Reload when filters, search, or page change - with debouncing for search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadSubAdmins();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [filters, searchQuery, pagination.page]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters.status, filters.state, filters.department, searchQuery]);

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

  const loadMainDeptAdmins = async () => {
    try {
      // Load main department admins (ADM0021-ADM0026) to use as "reportingTo" options
      const response = await adminAPI.getAdmins({ limit: 100 });
      const adminsList = response?.data || [];
      const mainAdmins = adminsList.filter((admin: Admin) => {
        const adminNum = parseInt(admin.adminId.replace('ADM', ''));
        return adminNum >= 21 && adminNum <= 26 && admin.role === 'DEPARTMENT_ADMIN';
      });
      setMainDeptAdmins(mainAdmins);
    } catch (err) {
      console.error('Error loading main department admins:', err);
    }
  };

  const loadSubAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.getAdmins({
        search: searchQuery || undefined,
        status: filters.status || undefined,
        state: filters.state || undefined,
        department: filters.department || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      // Get the admin list and pagination data
      let adminsList: Admin[] = [];
      let paginationData: any = null;
      
      if (response && response.data) {
        // Handle paginated response: { data: [...], pagination: {...} }
        if (Array.isArray(response.data)) {
          adminsList = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          adminsList = response.data.data;
          paginationData = response.data.pagination;
        }
      } else if (Array.isArray(response)) {
        adminsList = response as any;
      }
      
      // Filter to show ONLY subordinate department admins
      // These are admins who report to main department admins (ADM0021-ADM0026)
      // Subordinate admins have adminId >= ADM0027 and report to department admins
      const subordinateAdmins = adminsList.filter(admin => {
        if (!admin.reportingTo) return false;
        const reportingToNum = parseInt(admin.reportingTo.replace('ADM', ''));
        // Only include admins reporting to main dept admins (21-26) or higher
        return reportingToNum >= 21;
      });
      
      setSubAdmins(subordinateAdmins);
      
      // Update pagination state
      if (paginationData) {
        console.log('📄 Pagination data received:', paginationData);
        setPagination({
          page: paginationData.page || pagination.page,
          limit: paginationData.limit || pagination.limit,
          total: paginationData.total || subordinateAdmins.length,
          totalPages: paginationData.totalPages || Math.ceil(subordinateAdmins.length / pagination.limit),
          hasNext: paginationData.hasNext || false,
          hasPrev: paginationData.hasPrev || false,
        });
      } else {
        // If no pagination data, update total count
        const totalPages = Math.ceil(subordinateAdmins.length / pagination.limit);
        console.log('📄 No pagination data from API. Total:', subordinateAdmins.length, 'Pages:', totalPages);
        setPagination(prev => ({
          ...prev,
          total: subordinateAdmins.length,
          totalPages: totalPages,
          hasNext: prev.page < totalPages,
          hasPrev: prev.page > 1,
        }));
      }
      
      console.log('✅ Sub-admins loaded:', subordinateAdmins.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load sub-admins');
      console.error('Error loading sub-admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormDeptOpen(false);
    setFormStateOpen(false);
    setFormReportingOpen(false);
    setFormDeptSearch('');
    setFormStateSearch('');
    setFormReportingSearch('');
  };

  const handleCreateSubAdmin = async () => {
    try {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.department || !formData.reportingTo) {
        showAlert('Please fill in all required fields: Name, Email, Phone, Department, and Reporting To');
        return;
      }
      setIsSubmittingForm(true);

      const createData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation || 'Sub-Admin',
        role: 'DEPARTMENT_ADMIN',
        department: formData.department,
        reportingTo: formData.reportingTo,
        scope: {
          country: 'India',
          states: formData.state ? [formData.state] : [],
          districts: [],
          regions: [],
          cities: [],
        },
        permissionsProfile: 'DEPARTMENT_ADMIN',
      };

      await adminAPI.createAdmin(createData);
      showAlert('Sub-Admin created successfully');
      closeModal();
      loadSubAdmins();

      // Reset form
      setFormData({ fullName: '', email: '', phone: '', designation: '', department: '', state: '', reportingTo: '' });
    } catch (err: any) {
      showAlert(err.message || 'Failed to create sub-admin');
      console.error('Error creating sub-admin:', err);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleChangeState = async (admin: Admin, newState: string) => {
    try {
      const updatedScope = {
        ...admin.scope,
        states: [newState],
      };

      await adminAPI.updateAdmin(admin.adminId, {
        scope: updatedScope,
      });

      showAlert(`State changed to ${newState} successfully`);
      
      // If we're viewing the detailed profile, update it
      if (selectedSubAdmin?.adminId === admin.adminId) {
        setSelectedSubAdmin({ ...admin, scope: updatedScope });
      }
      
      // Reload the list
      loadSubAdmins();
    } catch (err: any) {
      showAlert(err.message || 'Failed to change state');
      console.error('Error changing state:', err);
    }
  };

  const handleChangeDepartment = async (admin: Admin, newDepartment: string) => {
    try {
      await adminAPI.updateAdmin(admin.adminId, {
        department: newDepartment,
      });

      showAlert(`Department changed to ${newDepartment} successfully`);
      
      // If we're viewing the detailed profile, update it
      if (selectedSubAdmin?.adminId === admin.adminId) {
        setSelectedSubAdmin({ ...admin, department: newDepartment });
      }
      
      // Reload the list
      loadSubAdmins();
    } catch (err: any) {
      showAlert(err.message || 'Failed to change department');
      console.error('Error changing department:', err);
    }
  };

  const handleDeleteSubAdmin = async (admin: Admin) => {
    try {
      await adminAPI.deleteAdmin(admin.adminId);
      showAlert(`${admin.fullName} has been removed successfully`);
      
      // If we're viewing the detailed profile, go back to list
      if (selectedSubAdmin?.adminId === admin.adminId) {
        setSelectedSubAdmin(null);
      }
      
      // Reload the list
      loadSubAdmins();
    } catch (err: any) {
      showAlert(err.message || 'Failed to remove sub-admin');
      console.error('Error removing sub-admin:', err);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  if (loading && subAdmins.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#535CE8" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading sub-admins...</Text>
      </View>
    );
  }

  // --- Sub-View Component A: Master List Grid View Directory Table ---
  const renderMasterSubAdminsList = () => (
    <>
      {/* Top Breadcrumb Navigation & Search Header row */}
      <View style={[styles.headerRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={isMobile && { marginBottom: 16 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive}>Sub-Admins</Text>
          </View>
          <Text style={styles.pageTitle}>Sub-Admin Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Sub-Admins</Text>
        </View>

        {/* Global Universal Search Bar Component */}
        <View style={[styles.searchContainer, isMobile && { width: '100%' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Sub-Admin"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
      </View>

      {/* Primary Context Action Toolbar Row */}
      <View style={[styles.filterActionBar, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <TouchableOpacity style={[styles.addBtnContainer, isMobile && { alignItems: 'center', marginBottom: 12 }]} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>Add Sub-Admin</Text>
        </TouchableOpacity>

        {/* Filters row — wraps on mobile */}
        <View style={[styles.rightFiltersContainer, isMobile && { flexWrap: 'wrap', gap: 8, marginLeft: 0, marginTop: 8 }]}>

          {/* State Filter Dropdown */}
          <View style={[styles.miniDropdownCard, { position: 'relative' as any }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => { setStateDropOpen(!stateDropOpen); setDeptDropOpen(false); setStatusDropOpen(false); }}
            >
              <Text style={{ fontSize: 13, color: '#374151', marginRight: 8 }}>
                {filters.state || 'All States'}
              </Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>▼</Text>
            </TouchableOpacity>
            {stateDropOpen && (
              <View style={filterDropdownStyles.menu}>
                <TouchableOpacity style={filterDropdownStyles.item} onPress={() => { setFilters({ ...filters, state: '' }); setStateDropOpen(false); }}>
                  <Text style={[filterDropdownStyles.itemText, !filters.state && filterDropdownStyles.itemActive]}>All States</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 180 }}>
                  {states.map(state => (
                    <TouchableOpacity key={state.stateId} style={filterDropdownStyles.item} onPress={() => { setFilters({ ...filters, state: state.name }); setStateDropOpen(false); }}>
                      <Text style={[filterDropdownStyles.itemText, filters.state === state.name && filterDropdownStyles.itemActive]}>{state.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Department Filter Dropdown */}
          <View style={[styles.miniDropdownCard, { position: 'relative' as any }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => { setDeptDropOpen(!deptDropOpen); setStateDropOpen(false); setStatusDropOpen(false); }}
            >
              <Text style={{ fontSize: 13, color: '#374151', marginRight: 8 }}>
                {filters.department || 'All Departments'}
              </Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>▼</Text>
            </TouchableOpacity>
            {deptDropOpen && (
              <View style={filterDropdownStyles.menu}>
                <TouchableOpacity style={filterDropdownStyles.item} onPress={() => { setFilters({ ...filters, department: '' }); setDeptDropOpen(false); }}>
                  <Text style={[filterDropdownStyles.itemText, !filters.department && filterDropdownStyles.itemActive]}>All Departments</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 180 }}>
                  {departments.map(dept => (
                    <TouchableOpacity key={dept.departmentId} style={filterDropdownStyles.item} onPress={() => { setFilters({ ...filters, department: dept.name }); setDeptDropOpen(false); }}>
                      <Text style={[filterDropdownStyles.itemText, filters.department === dept.name && filterDropdownStyles.itemActive]}>{dept.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Status Filter Dropdown */}
          <View style={[styles.miniDropdownCard, { position: 'relative' as any }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 }}
              onPress={() => { setStatusDropOpen(!statusDropOpen); setStateDropOpen(false); setDeptDropOpen(false); }}
            >
              <Text style={{ fontSize: 13, color: '#374151', marginRight: 8 }}>
                {statusOptions.find(o => o.value === filters.status)?.label || 'All Status'}
              </Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>▼</Text>
            </TouchableOpacity>
            {statusDropOpen && (
              <View style={filterDropdownStyles.menu}>
                {statusOptions.map(opt => (
                  <TouchableOpacity key={opt.value} style={filterDropdownStyles.item} onPress={() => { setFilters({ ...filters, status: opt.value }); setStatusDropOpen(false); }}>
                    <Text style={[filterDropdownStyles.itemText, filters.status === opt.value && filterDropdownStyles.itemActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Clear All Filters */}
          {(filters.state || filters.department || filters.status) && (
            <TouchableOpacity
              style={styles.filterConfigButton}
              onPress={() => setFilters({ status: '', state: '', department: '' })}
            >
              <RefreshIcon width={16} height={16} fill="#4B5563" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Directory Table Base Card Wrapper — Desktop table / Mobile cards */}
      <View style={styles.tableCardContainer}>
        <View style={styles.tableSummaryCountHeader}>
          <Text style={styles.summaryTotalCountText}>
            Total Sub-Admins <Text style={styles.boldText}>{pagination.total || subAdmins.length}</Text>
          </Text>
          <Text style={styles.summaryStatusBreakdownText}>
            Active: <Text style={{ color: '#10B981', fontWeight: '700' }}>{subAdmins.filter(s => s.status === 'ACTIVE').length}</Text>
            {' | '}
            Inactive: <Text style={{ color: '#EF4444', fontWeight: '700' }}>{subAdmins.filter(s => s.status !== 'ACTIVE').length}</Text>
          </Text>
        </View>

        {/* ── Desktop: header + row table ── */}
        {!isMobile && (
          <View style={styles.tableHeaderColumnsRow}>
            <Text style={[styles.headerCell, { flex: 2.5 }]}>Name ↕</Text>
            <Text style={[styles.headerCell, { flex: 2.5 }]}>Department ↕</Text>
            <Text style={[styles.headerCell, { flex: 1.8 }]}>Sub-admin ID ↕</Text>
            <Text style={[styles.headerCell, { flex: 2.8 }]}>Email ID ↕</Text>
            <Text style={[styles.headerCell, { flex: 1.5, textAlign: 'center' }]}>Status ↕</Text>
            <Text style={[styles.headerCell, { flex: 1.8 }]}>Region ↕</Text>
            <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>More</Text>
          </View>
        )}

        {/* Data rows */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#535CE8" />
          </View>
        ) : error ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', marginBottom: 12 }}>{error}</Text>
            <TouchableOpacity onPress={loadSubAdmins} style={styles.addBtnContainer}>
              <Text style={styles.addBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : subAdmins.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>No sub-admins found</Text>
          </View>
        ) : isMobile ? (
          /* ── Mobile: card list matching AdminManagementScreen pattern ── */
          subAdmins.map((row) => (
            <View key={row.adminId} style={styles.mobileSubAdminCard}>
              {/* Card header — clickable to open detail */}
              <TouchableOpacity style={styles.mobileSubAdminCardHeader} onPress={() => setSelectedSubAdmin(row)} activeOpacity={0.75}>
                <View style={[styles.avatarCircleSurface, { backgroundColor: '#E0E7FF', marginRight: 12 }]}>
                  <Text style={[styles.avatarInitialsText, { color: '#4F46E5' }]}>{getInitials(row.fullName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bodyCell, styles.boldBodyCellText, { marginLeft: 0 }]}>{row.fullName}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{row.employeeCode}</Text>
                </View>
                <View style={[styles.statusBadgePill, row.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                  <Text style={[styles.statusBadgeText, row.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{row.status}</Text>
                </View>
              </TouchableOpacity>

              {/* Card body — indented under avatar */}
              <View style={styles.mobileSubAdminCardBody}>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>Department</Text>
                  <Text style={styles.mobileFieldValue} numberOfLines={1}>{row.department || 'N/A'}</Text>
                </View>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>Email</Text>
                  <Text style={[styles.mobileFieldValue, { flexShrink: 1 }]} numberOfLines={1}>{row.email}</Text>
                </View>
                <View style={styles.mobileSubAdminField}>
                  <Text style={styles.mobileFieldLabel}>Region</Text>
                  <Text style={styles.mobileFieldValue}>{row.scope?.states?.[0] || 'N/A'}</Text>
                </View>
              </View>

              {/* Action row */}
              <View style={styles.mobileSubCardActions}>
                <TouchableOpacity style={styles.mobileSubActionBtn} onPress={() => setSelectedSubAdmin(row)}>
                  <Text style={styles.mobileSubActionBtnText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileSubActionBtnOutline} onPress={() => { setAdminToModify(row); setSelectedNewState(row.scope?.states?.[0] || ''); setChangeStateModalVisible(true); }}>
                  <Text style={styles.mobileSubActionBtnOutlineText}>Change State</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileSubActionBtnDanger} onPress={async () => { if (await showConfirm(`Remove ${row.fullName}?`)) handleDeleteSubAdmin(row); }}>
                  <Text style={styles.mobileSubActionBtnDangerText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          /* ── Desktop: table rows ── */
          subAdmins.map((row, index) => (
            <View key={row.adminId} style={[styles.tableBodyDataRow, { zIndex: activeMenuIndex === index ? 100 : 1 }]}>
              <TouchableOpacity style={[styles.profileAvatarCellGroup, { flex: 2.5 }]} onPress={() => setSelectedSubAdmin(row)}>
                <View style={styles.avatarCircleSurface}>
                  <Text style={styles.avatarInitialsText}>{getInitials(row.fullName)}</Text>
                </View>
                <Text style={[styles.bodyCell, styles.boldBodyCellText, styles.clickableProfileNameText]}>{row.fullName}</Text>
              </TouchableOpacity>
              <View style={[{ flex: 2.5, alignItems: 'flex-start' }]}>
                <View style={styles.deptBadgeContainer}>
                  <Text style={styles.deptBadgeText} numberOfLines={1}>{row.department || 'N/A'}</Text>
                </View>
              </View>
              <Text style={[styles.bodyCell, { flex: 1.8, color: '#4B5563' }]}>{row.employeeCode}</Text>
              <Text style={[styles.bodyCell, { flex: 2.8, color: '#4B5563' }]} numberOfLines={1}>{row.email}</Text>
              <View style={{ flex: 1.5, alignItems: 'center' }}>
                <View style={[styles.statusBadgePill, row.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                  <Text style={[styles.statusBadgeText, row.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{row.status}</Text>
                </View>
              </View>
              <Text style={[styles.bodyCell, { flex: 1.8 }]}>{row.scope?.states?.[0] || 'N/A'}</Text>
              <View style={{ flex: 0.8, alignItems: 'center', position: 'relative' }}>
                <TouchableOpacity onPress={() => setActiveMenuIndex(activeMenuIndex === index ? null : index)} style={{ paddingHorizontal: 8 }}>
                  <Text style={styles.moreActionDotsIcon}>⋮</Text>
                </TouchableOpacity>
                {activeMenuIndex === index && (
                  <View style={styles.actionMenuDropdownCard}>
                    <TouchableOpacity style={styles.actionMenuItemRow} onPress={() => { setActiveMenuIndex(null); setAdminToModify(row); setSelectedNewState(row.scope?.states?.[0] || ''); setChangeStateModalVisible(true); }}>
                      <Text style={styles.actionMenuItemText}>Change State</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionMenuItemRow} onPress={() => { setActiveMenuIndex(null); setSelectedSubAdmin(row); }}>
                      <Text style={styles.actionMenuItemText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionMenuItemRow, { borderTopWidth: 1, borderTopColor: '#FEE2E2' }]} onPress={async () => { setActiveMenuIndex(null); if (await showConfirm(`Are you sure you want to remove ${row.fullName}?`)) handleDeleteSubAdmin(row); }}>
                      <Text style={[styles.actionMenuItemText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages || 1}
          totalCount={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
          itemLabel="sub-admins"
          alwaysShow={true}
        />
      </View>
    </>
  );

  const renderDetailedSubAdminProfile = (subAdmin: Admin) => (
    <>
      {/* Top Breadcrumb Navigation Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.breadcrumbContainer}>
            <HomeIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <TouchableOpacity onPress={() => setSelectedSubAdmin(null)}>
              <Text style={styles.breadcrumbBackLinkText}>Sub-Admins</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
            <Text style={styles.breadcrumbActive} numberOfLines={1}>{subAdmin.fullName}</Text>
          </View>
          <Text style={[styles.pageTitle, isMobile && { fontSize: 18 }]}>Sub-Admin Management</Text>
          <Text style={styles.pageSubtitle}>Manage all your Sub-Admins</Text>
        </View>
      </View>

      {/* Back link */}
      <TouchableOpacity style={styles.backLinkRowContainer} onPress={() => setSelectedSubAdmin(null)}>
        <Text style={styles.backChevronIconText}>←</Text>
        <Text style={styles.backLinkLabelText}>Back to Sub-Admins</Text>
      </TouchableOpacity>

      {/* Hero identity card — stacks on mobile */}
      <View style={[styles.profileIdentityHeroCardSurface, isMobile && { flexDirection: 'column', paddingVertical: 16 }]}>
        <View style={[styles.heroLeftSectionGroup, isMobile && { marginBottom: 14 }]}>
          <View style={[styles.largeHeroAvatarCircleSurface, isMobile && { width: 52, height: 52, borderRadius: 26, marginRight: 12 }]}>
            <Text style={[styles.largeHeroAvatarInitialsText, isMobile && { fontSize: 18 }]}>{getInitials(subAdmin.fullName)}</Text>
          </View>
          <View style={[styles.heroMetaDetailsBlock, { flex: 1 }]}>
            <Text style={[styles.heroProfileNameText, isMobile && { fontSize: 17 }]} numberOfLines={2}>{subAdmin.fullName}</Text>
            <Text style={styles.heroProfileDeptLabelText}>{subAdmin.department}</Text>
            <View style={[styles.heroBadgesRow, { flexWrap: 'wrap', gap: 4 }]}>
              <View style={[styles.statusBadgePill, subAdmin.status !== 'ACTIVE' && styles.statusBadgePillOffline]}>
                <Text style={[styles.statusBadgeText, subAdmin.status !== 'ACTIVE' && styles.statusBadgeTextOffline]}>{subAdmin.status}</Text>
              </View>
              {(subAdmin.scope?.states || []).map((state, idx) => (
                <View key={idx} style={styles.metaRegionTextBadgeContainer}>
                  <Text style={styles.metaRegionTextBadgeValue}>{state}</Text>
                </View>
              ))}
              {(subAdmin.scope?.districts || []).map((district, idx) => (
                <View key={idx} style={styles.metaRegionTextBadgeContainer}>
                  <Text style={styles.metaRegionTextBadgeValue}>{district}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Dual info panel — stacks vertically on mobile */}
      <View style={[styles.splitGridDetailsInfoLayoutContainer, isMobile && { flexDirection: 'column' }]}>

        <View style={styles.gridInfoCardContainerFlexPanel}>
          <Text style={styles.gridSectionHeadingTitleText}>Profile Information</Text>

          <View style={styles.metricItemRowFieldUnit}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Admin ID</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{subAdmin.employeeCode}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <LocationIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>State/Region</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{(subAdmin.scope?.states || []).join(', ') || 'Not assigned'}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <DepartmentIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Department</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{subAdmin.department || 'Not assigned'}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <PersonIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Users Managing</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>
                {(subAdmin.managedUsers?.customers || 0) + (subAdmin.managedUsers?.pilots || 0) + (subAdmin.managedUsers?.admins || 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.gridInfoCardContainerFlexPanel}>
          <Text style={styles.gridSectionHeadingTitleText}>Account Details</Text>

          <View style={styles.metricItemRowFieldUnit}>
            <ClockIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Joined Date</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{formatDate(subAdmin.joinedAt)}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <ActivityIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Last Updated</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{formatDate(subAdmin.updatedAt)}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <EmailIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Email</Text>
              <Text style={[styles.metricValueSecondaryDataValueText, { flexShrink: 1 }]} numberOfLines={2}>{subAdmin.email}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <CallIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Mobile</Text>
              <Text style={styles.metricValueSecondaryDataValueText}>{subAdmin.phone}</Text>
            </View>
          </View>

          <View style={styles.metricItemRowFieldUnit}>
            <SMIcon width={30} height={30} fill="#374151" style={styles.titleIconPadding} />
            <View>
              <Text style={styles.metricValueLabelFieldHeadlineText}>Created By</Text>
              <Text style={[styles.metricValueSecondaryDataValueText, styles.underlineLinkDecorationValueText]}>{subAdmin.createdBy || 'System'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action buttons — wrap on mobile */}
      <View style={[styles.profileBottomUtilityActionsContainerRowStack, isMobile && { flexDirection: 'column', gap: 8 }]}>
        <TouchableOpacity
          style={[styles.profileBottomOutlineActionButton, isMobile && { flex: undefined }]}
          onPress={() => { setAdminToModify(subAdmin); setSelectedNewState(subAdmin.scope?.states?.[0] || ''); setChangeStateModalVisible(true); }}
        >
          <Text style={styles.profileBottomOutlineActionButtonText}>Change State</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.profileBottomOutlineActionButton, isMobile && { flex: undefined }]}
          onPress={() => { setAdminToModify(subAdmin); setSelectedNewDepartment(subAdmin.department || ''); setChangeDepartmentModalVisible(true); }}
        >
          <Text style={styles.profileBottomOutlineActionButtonText}>Change Department</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.profileBottomDestructiveActionButton, isMobile && { flex: undefined }]}
          onPress={async () => { if (await showConfirm(`Are you sure you want to remove ${subAdmin.fullName}?`)) handleDeleteSubAdmin(subAdmin); }}
        >
          <Text style={styles.profileBottomDestructiveActionButtonText}>Remove Sub-Admin</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && styles.contentContainerMobile]}
    >
      {selectedSubAdmin ? renderDetailedSubAdminProfile(selectedSubAdmin) : renderMasterSubAdminsList()}
    </ScrollView>

      {/* Modals live OUTSIDE the ScrollView — a <Modal> nested inside a
          ScrollView fails to present on native (iOS/Android). */}

      {/* ==================== ADD SUB-ADMIN MODAL ==================== */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.nafOverlay}>
          <View style={styles.nafCard}>

            {/* Header */}
            <View style={styles.nafHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nafTitle}>Add New Sub-Admin Form</Text>
                <Text style={styles.nafSubtitle}>Create a subordinate department admin account.</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.nafCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.nafCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.nafBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Name */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Name</Text>
                <View style={styles.nafInputBox}>
                  <TextInput style={styles.nafInput} placeholder="Full Name of the Sub-Admin" placeholderTextColor="#9CA3AF" value={formData.fullName} onChangeText={(t) => setFormData({ ...formData, fullName: t })} />
                </View>
              </View>

              {/* Mobile */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Mobile Number</Text>
                <View style={styles.nafInputBox}>
                  <TextInput style={styles.nafInput} placeholder="Mobile Number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} />
                </View>
              </View>

              {/* Email */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Email ID</Text>
                <View style={styles.nafInputBox}>
                  <TextInput style={styles.nafInput} placeholder="Email ID" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} />
                </View>
              </View>

              {/* Designation */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Designation</Text>
                <View style={styles.nafInputBox}>
                  <TextInput style={styles.nafInput} placeholder="e.g. Quality Control Officer" placeholderTextColor="#9CA3AF" value={formData.designation} onChangeText={(t) => setFormData({ ...formData, designation: t })} />
                </View>
              </View>

              {/* Department Dropdown */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Assigned Department</Text>
                <TouchableOpacity style={[styles.nafDropdownTrigger, formDeptOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormDeptOpen(!formDeptOpen); setFormStateOpen(false); setFormReportingOpen(false); }} activeOpacity={0.8}>
                  <Text style={[styles.nafDropdownValue, !formData.department && styles.nafDropdownPlaceholder]}>{formData.department || 'Select Department'}</Text>
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

              {/* Reporting To Dropdown */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Reporting To (Main Admin)</Text>
                <TouchableOpacity style={[styles.nafDropdownTrigger, formReportingOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormReportingOpen(!formReportingOpen); setFormDeptOpen(false); setFormStateOpen(false); }} activeOpacity={0.8}>
                  <Text style={[styles.nafDropdownValue, !formData.reportingTo && styles.nafDropdownPlaceholder]}>
                    {formData.reportingTo ? (mainDeptAdmins.find(a => a.adminId === formData.reportingTo)?.fullName || formData.reportingTo) : 'Select Main Admin'}
                  </Text>
                  <Text style={[styles.nafChevron, formReportingOpen && styles.nafChevronOpen]}>⌄</Text>
                </TouchableOpacity>
                {formReportingOpen && (
                  <View style={styles.nafDropdownPanel}>
                    <View style={styles.nafSearchRow}>
                      <TextInput style={styles.nafSearchInput} placeholder="Search admin..." placeholderTextColor="#9CA3AF" value={formReportingSearch} onChangeText={setFormReportingSearch} autoFocus />
                    </View>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {mainDeptAdmins.filter(a => a.fullName.toLowerCase().includes(formReportingSearch.toLowerCase())).map((admin) => (
                        <TouchableOpacity key={admin.adminId} style={[styles.nafDropdownItem, formData.reportingTo === admin.adminId && styles.nafDropdownItemSelected]} onPress={() => { setFormData({ ...formData, reportingTo: admin.adminId }); setFormReportingOpen(false); setFormReportingSearch(''); }} activeOpacity={0.7}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.nafDropdownItemText, formData.reportingTo === admin.adminId && styles.nafDropdownItemTextSelected]}>{admin.fullName}</Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{admin.department}</Text>
                          </View>
                          {formData.reportingTo === admin.adminId && <Text style={styles.nafCheckmark}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                      {mainDeptAdmins.filter(a => a.fullName.toLowerCase().includes(formReportingSearch.toLowerCase())).length === 0 && <Text style={styles.nafNoResults}>No admins found</Text>}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Assigned State Dropdown */}
              <View style={styles.nafFieldWrap}>
                <Text style={styles.nafFieldLabel}>Assigned State</Text>
                <TouchableOpacity style={[styles.nafDropdownTrigger, formStateOpen && styles.nafDropdownTriggerOpen]} onPress={() => { setFormStateOpen(!formStateOpen); setFormDeptOpen(false); setFormReportingOpen(false); }} activeOpacity={0.8}>
                  <Text style={[styles.nafDropdownValue, !formData.state && styles.nafDropdownPlaceholder]}>{formData.state || 'Select State'}</Text>
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

              {/* Submit */}
              <TouchableOpacity
                style={[styles.nafSubmitBtn, (isSubmittingForm || !formData.fullName || !formData.email || !formData.phone || !formData.department || !formData.reportingTo) && styles.nafSubmitBtnDisabled]}
                onPress={handleCreateSubAdmin}
                disabled={isSubmittingForm || !formData.fullName || !formData.email || !formData.phone || !formData.department || !formData.reportingTo}
                activeOpacity={0.85}
              >
                {isSubmittingForm ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.nafSubmitBtnText}>Add Sub-Admin</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.nafCancelBtn} onPress={closeModal} activeOpacity={0.7}>
                <Text style={styles.nafCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* -------------------- CHANGE STATE MODAL -------------------- */}
      <Modal visible={changeStateModalVisible} transparent animationType="fade" onRequestClose={() => setChangeStateModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setChangeStateModalVisible(false)} style={styles.modalBackdropMask}>
          <View style={styles.formCardModalPanel}>
            <View style={styles.modalHeaderCloseRow}>
              <Text style={styles.formModalTitleText}>Change State</Text>
              <TouchableOpacity onPress={() => setChangeStateModalVisible(false)} style={styles.closeTouchArea}>
                <Text style={styles.closeIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formModalSubtitleText}>
              Change state assignment for {adminToModify?.fullName}
            </Text>

            <View style={styles.formFieldContainerRow}>
              <Text style={styles.formInputLabelText}>Select New State</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {states.map((state) => (
                  <TouchableOpacity
                    key={state.stateId}
                    style={[
                      styles.formSelectPickerBox,
                      selectedNewState === state.name && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                    ]}
                    onPress={() => setSelectedNewState(state.name)}
                  >
                    <Text style={[styles.pickerPlaceholderText, selectedNewState === state.name && { color: '#535CE8', fontWeight: '600' }]}>
                      {state.name}
                    </Text>
                    {selectedNewState === state.name && <Text style={{ color: '#535CE8' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.modalSubmitActionButton} 
              onPress={() => {
                if (adminToModify && selectedNewState) {
                  handleChangeState(adminToModify, selectedNewState);
                  setChangeStateModalVisible(false);
                } else {
                  showAlert('Please select a state');
                }
              }}
            >
              <Text style={styles.modalSubmitButtonText}>Change State</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelActionButton} onPress={() => setChangeStateModalVisible(false)}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* -------------------- CHANGE DEPARTMENT MODAL -------------------- */}
      <Modal visible={changeDepartmentModalVisible} transparent animationType="fade" onRequestClose={() => setChangeDepartmentModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setChangeDepartmentModalVisible(false)} style={styles.modalBackdropMask}>
          <View style={styles.formCardModalPanel}>
            <View style={styles.modalHeaderCloseRow}>
              <Text style={styles.formModalTitleText}>Change Department</Text>
              <TouchableOpacity onPress={() => setChangeDepartmentModalVisible(false)} style={styles.closeTouchArea}>
                <Text style={styles.closeIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formModalSubtitleText}>
              Change department assignment for {adminToModify?.fullName}
            </Text>

            <View style={styles.formFieldContainerRow}>
              <Text style={styles.formInputLabelText}>Select New Department</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept.departmentId}
                    style={[
                      styles.formSelectPickerBox,
                      selectedNewDepartment === dept.name && { borderColor: '#535CE8', backgroundColor: '#EEF2FF' }
                    ]}
                    onPress={() => setSelectedNewDepartment(dept.name)}
                  >
                    <Text style={[styles.pickerPlaceholderText, selectedNewDepartment === dept.name && { color: '#535CE8', fontWeight: '600' }]}>
                      {dept.name}
                    </Text>
                    {selectedNewDepartment === dept.name && <Text style={{ color: '#535CE8' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.modalSubmitActionButton} 
              onPress={() => {
                if (adminToModify && selectedNewDepartment) {
                  handleChangeDepartment(adminToModify, selectedNewDepartment);
                  setChangeDepartmentModalVisible(false);
                } else {
                  showAlert('Please select a department');
                }
              }}
            >
              <Text style={styles.modalSubmitButtonText}>Change Department</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelActionButton} onPress={() => setChangeDepartmentModalVisible(false)}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// --- Shared Filter Dropdown Styles ---
const filterDropdownStyles = StyleSheet.create({
  menu: {
    position: 'absolute' as any,
    top: '100%' as any,
    left: 0,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 4,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemText: {
    fontSize: 13,
    color: '#374151',
  },
  itemActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

// --- Interface Stylesheet Properties ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
  },
  contentContainerMobile: {
    padding: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 11,
  },
  breadcrumbBackLinkText: {
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
    fontSize: 20,
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
    borderColor: '#D1D5DB',
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
  filterActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addBtnContainer: {
    backgroundColor: '#535CE8',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
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
  clickableProfileNameText: {
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
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    maxWidth: '95%',
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
  backLinkRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backChevronIconText: {
    fontSize: 16,
    color: '#4B5563',
    marginRight: 6,
    fontWeight: '600',
  },
  backLinkLabelText: {
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
  splitGridDetailsInfoLayoutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridInfoCardContainerFlexPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 6,
    marginBottom: 16,
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
    fontSize: 16,
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
  underlineLinkDecorationValueText: {
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  profileBottomUtilityActionsContainerRowStack: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  profileBottomOutlineActionButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: 10,
  },
  profileBottomOutlineActionButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  profileBottomDestructiveActionButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginLeft: 10,
  },
  profileBottomDestructiveActionButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalBackdropMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  formCardModalPanel: {
    width: 410,
    maxWidth: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
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
  formFieldHintText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
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

  // ── Mobile sub-admin card styles (matching AdminManagementScreen) ──────────
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
    textAlign: 'right' as const,
  },
  mobileSubCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mobileSubActionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#535CE8',
  },
  mobileSubActionBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mobileSubActionBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
  },
  mobileSubActionBtnOutlineText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  mobileSubActionBtnDanger: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
  },
  mobileSubActionBtnDangerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },

  // ── New Admin Form (naf) modal styles ────────────────────────────────────
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
    maxWidth: 440,
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
    borderColor: '#535CE8',
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
    color: '#535CE8',
  },
  nafDropdownPanel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    overflow: 'hidden' as const,
    elevation: 4,
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
    color: '#535CE8',
    fontWeight: '700',
  },
  nafCheckmark: {
    fontSize: 14,
    color: '#535CE8',
    fontWeight: '700',
  },
  nafNoResults: {
    textAlign: 'center' as const,
    color: '#9CA3AF',
    fontSize: 13,
    padding: 16,
  },
  nafSubmitBtn: {
    backgroundColor: '#535CE8',
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