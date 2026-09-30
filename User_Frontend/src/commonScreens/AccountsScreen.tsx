import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Modal,
    SafeAreaView,
    Pressable,
    ActivityIndicator,
    Image,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
// Add these to the top imports:
import { useIsDesktop } from '../utils/responsive';
import { DesktopPageShell, SplitPane, ResponsiveGrid } from '../common/DesktopLayouts';
import { Storage } from '../utils/storage';
import { authApi, customerApi, aggregatorApi, getSession, roleApplicationsApi, normalizeBackendRole, normalizeFrontendRole, updateStoredUser, mapsApi } from '../utils/api';
import { checkBiometricSupport } from '../utils/biometrics';
import ProfilePhotoPicker from '../customerModule/components/ProfilePhotoPicker';
import { getCurrentPosition } from '../utils/geolocation';

// --- Personal-details helpers (shared by mobile + desktop) ---
const toSafeText = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
};

const COORD_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
const isCoordinateText = (value: any) => COORD_RE.test(toSafeText(value).trim());

const getStoredAddress = (u: any): string => {
    if (!u) return '';
    const candidates = [
        u?.profileData?.address,
        u?.address,
        u?.location?.address,
        u?.profileData?.location?.address,
        u?.profileData?.region,
        u?.profileData?.state,
    ];
    for (const c of candidates) {
        const text = toSafeText(c).trim();
        if (text) return text;
    }
    return '';
};

const getStoredCoords = (u: any): { lat: number; lng: number } | null => {
    if (!u) return null;
    const loc = u?.profileData?.location || u?.location || u?.profileData?.currentLocation || null;
    const lat = Number(loc?.lat ?? loc?.latitude);
    const lng = Number(loc?.lng ?? loc?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
};

const extractFullAddress = (result: any): string => {
    if (!result) return '';
    return toSafeText(
        result?.data?.formattedAddress ||
        result?.formattedAddress ||
        result?.data?.address ||
        result?.address ||
        '',
    ).trim();
};

const getProfilePhotoUrl = (u: any): string =>
    toSafeText(u?.profileData?.photoUrl || u?.profilePhoto || u?.photoUrl || '').trim();
// Import SVG as a React Component (Capitalized for JSX)
import Roles from '../assets/roles.svg';
import CustomerRefundsScreen from '../customerModule/screens/CustomerRefundsScreen';
//import ContactUsScreen from '../customerModule/screens/ContactUsScreen';
import NewComplaintFormScreen from '../customerModule/screens/NewComplaintFormScreen';
import ComplaintDetailsScreen from '../customerModule/screens/ComplaintDetailsScreen';
import ComplaintHistoryScreen from '../customerModule/screens/ComplaintHistoryScreen';
import LogoutScreen from '../customerModule/screens/LogoutScreen';
import DeleteAccountScreen from '../customerModule/screens/DeleteAccountScreen';
import AddBiometricsScreen from '../customerModule/screens/AddBiometricsScreen';
import TwoFactorAuthScreen from '../customerModule/screens/TwoFactorAuthScreen';
import { useLanguage } from '../i18n';

// Import SVG Components
import PromoCard from '../pilotModule/components/PromoCard';
import FleetManager from '../assets/Icons/SVG/Light/fleet-management-icon.svg';
import Customer from '../assets/Icons/SVG/Light/customer-icon.svg';
import Pilot from '../assets/Icons/SVG/Light/PilotIcon.svg';
import SalesAggregator from '../assets/Icons/SVG/Light/sa-icon.svg';
import Technician from '../assets/Icons/SVG/Light/technician-icon.svg';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

const MOCK_PROMOS = [1, 2, 3];

const ROLES = [
    {
        id: 'customer',
        title: 'Customer',
        screen: 'HomeScreen',
        image: Customer
    },
    {
        id: 'pilot',
        title: 'Drone Pilot',
        screen: 'HomeScreen',
        image: Pilot
    },
    {
        id: 'sales',
        title: 'Sales Aggregator',
        screen: 'HomeScreen',
        image: SalesAggregator
    },
    {
        id: 'fleet',
        title: 'Fleet Manager',
        screen: 'fmHomeScreen',
        image: FleetManager
    },
    {
        id: 'technician',
        title: 'Technician',
        screen: 'TechnicianHomeScreen',
        image: Technician
    }
];

// Real notification preference model (persisted via
// GET/PATCH .../notification-settings). Keys must match the backend
// categories enforced in NotificationService.dispatch (data.category).
// Only App (push/in-app) + Email are offered for now.
// const WHATSAPP_NOTIF_SECTION = {
//     title: 'WhatsApp Notifications',
//     masterKey: 'whatsappNotifications',
//     items: [...],
// }; // TODO: enable once the WhatsApp API is configured.
const NOTIF_MASTER_DEFAULTS: Record<string, boolean> = {
    pushNotifications: true,
    emailNotifications: true,
};
const NOTIF_CATEGORY_DEFAULTS: Record<string, boolean> = {
    bookingUpdates: true,
    marketplaceUpdates: true,
    promotionalMessages: false,
    recommendationUpdates: true,
};
const NOTIF_SECTIONS = [
    { title: 'App Notifications', masterKey: 'pushNotifications' },
    { title: 'Email Notifications', masterKey: 'emailNotifications' },
    // { title: 'WhatsApp Notifications', masterKey: 'whatsappNotifications' }, // TODO: enable once WhatsApp API is configured
];
const NOTIF_ITEMS = [
    { key: 'bookingUpdates', label: 'Booking Status', sub: 'We will give notifications for every booking status update' },
    { key: 'marketplaceUpdates', label: 'Marketplace Updates', sub: "We'll notify you about new Marketplace products" },
    { key: 'promotionalMessages', label: 'Promotions/Offers/Rewards', sub: "We'll notify you about new promotions, offers and rewards on the app, so you don't miss out on your money savings" },
    { key: 'recommendationUpdates', label: 'Recommendations', sub: 'Notifications about new recommended products/services based on your activity' }
];

const ALL_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
];

const CONSTANT_LANGUAGE_CODES = ['en', 'hi'];

const ChevronRight = ({ color = '#6B7280' }: { color?: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 18l6-6-6-6" />
    </Svg>
);

const ChevronDown = ({ color = '#6B7280' }: { color?: string }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9l6 6 6-6" />
    </Svg>
);

const LockIcon = ({ color = '#5060D3' }: { color?: string }) => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
);

const CustomToggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onToggle} style={[styles.notifToggleTrack, value && styles.notifToggleTrackActive]}>
        <View style={[styles.notifToggleThumb, value && styles.notifToggleThumbActive]} />
    </TouchableOpacity>
);

const BiometricAlertModal = ({ visible, mode, onClose, message }: { visible: boolean; mode: 'web' | 'unavailable'; onClose: () => void; message: string }) => {
    const { t } = useLanguage();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.biometricModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.biometricModalCard}>
                    <View style={styles.biometricModalIconCircle}>
                        <LockIcon />
                    </View>
                    <Text style={styles.biometricModalTitle}>
                        {mode === 'web' ? t('App Only') : t("Can't Enable Biometrics")}
                    </Text>
                    <Text style={styles.biometricModalMessage}>{message}</Text>
                    <Pressable style={styles.biometricModalButton} onPress={onClose}>
                        <Text style={styles.biometricModalButtonText}>{t('OK')}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

/**
 * Cross-platform role-switch confirmation dialog.
 * Uses RN <Modal> (works on web + Android APK + iOS) because
 * react-native-web's Alert.alert is a no-op — so Alert-based
 * confirmations silently do nothing in the browser.
 */
const RoleSwitchConfirmModal = ({
    visible,
    roleTitle,
    loading,
    onCancel,
    onConfirm,
}: {
    visible: boolean;
    roleTitle: string;
    loading?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => {
    const { t } = useLanguage();
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.confirmModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
                <View style={styles.confirmModalCard}>
                    <Text style={styles.confirmModalTitle}>
                        {t('Switch to {{role}}?', { role: roleTitle })}
                    </Text>
                    <Text style={styles.confirmModalMessage}>
                        {t('Do you want to switch to the {{role}} role?', { role: roleTitle })}
                    </Text>
                    <View style={styles.confirmModalActions}>
                        <Pressable style={[styles.confirmModalButton, styles.confirmModalCancel]} onPress={onCancel}>
                            <Text style={styles.confirmModalCancelText}>{t('Cancel')}</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.confirmModalButton, styles.confirmModalConfirm]}
                            onPress={onConfirm}
                            disabled={!!loading}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#FFFFFF" />
                                : <Text style={styles.confirmModalConfirmText}>{t('Switch')}</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AccountsScreen: React.FC<{ onNavigate?: any, currentRole: string, onSwitchRole: (role: string) => void, currentScreen?: string }> = ({ onNavigate, currentRole, onSwitchRole, currentScreen = '' }) => {
    const { t, language, setLanguage, regionalLanguage } = useLanguage();
    const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
    const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
    const [isOtherLanguagesExpanded, setIsOtherLanguagesExpanded] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(language);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // Full "place, city, state, pincode" address shown under Personal Details.
    const [personalAddress, setPersonalAddress] = useState('');
    const [addressLoading, setAddressLoading] = useState(false);
    // Profile-photo viewer/editor (circular avatar on top is tappable).
    const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
    const [draftPhoto, setDraftPhoto] = useState('');
    const [photoSaving, setPhotoSaving] = useState(false);

    // Real notification preferences (loaded from backend, not hardcoded).
    const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
        ...NOTIF_MASTER_DEFAULTS,
        ...NOTIF_CATEGORY_DEFAULTS,
    });
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifSavingKey, setNotifSavingKey] = useState<string | null>(null);
    const [notifError, setNotifError] = useState('');

    const getSettingsApi = () => {
        const role = toSafeText(currentRole).toLowerCase();
        if (role === 'sales' || role === 'salesaggregator' || role === 'aggregator') return aggregatorApi;
        return customerApi;
    };

    const loadNotifSettings = async () => {
        setNotifLoading(true);
        setNotifError('');
        try {
            const api: any = getSettingsApi();
            const res = await api.getNotificationSettings().catch(async () => {
                // Fall back to the other settings endpoint (roles share this screen).
                const fallback: any = api === customerApi ? aggregatorApi : customerApi;
                return fallback.getNotificationSettings();
            });
            const remote = res?.notificationSettings || res || {};
            setNotifSettings({
                ...NOTIF_MASTER_DEFAULTS,
                ...NOTIF_CATEGORY_DEFAULTS,
                ...remote,
            });
        } catch (e) {
            console.error('Failed to load notification settings', e);
            setNotifError('Could not load preferences. Please try again.');
        } finally {
            setNotifLoading(false);
        }
    };

    useEffect(() => {
        if (isNotifModalVisible) loadNotifSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNotifModalVisible]);
    const isDesktop = useIsDesktop();
    const [desktopTab, setDesktopTab] = useState('Profile');
    const DESKTOP_TABS = ['Profile', 'Your Role', 'Preferences', 'Marketplace', 'Support', 'Security'];

    // Biometrics gating: 'web' => only available in the app, 'unavailable' => device has no sensor
    const [biometricModal, setBiometricModal] = useState<null | 'web' | 'unavailable'>(null);

    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    useEffect(() => {
        Promise.all([customerApi.getCurrentUser().catch(() => null), getSession()])
            .then(([currentUser, session]) => {
                setUser(currentUser || session?.user || null);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Failed to load account data', error);
                setLoading(false);
            });
    }, []);

    /**
     * Personal-details address:
     * - customer / sales (aggregator): the location the user has set
     *   (users/me profileData.address, else reverse-geocode its stored coords).
     * - fleet (FM) / pilot / technician: live GPS location reverse-geocoded
     *   to a full "place, city, state, pincode" address, falling back to the
     *   stored address when GPS is unavailable/denied.
     */
    useEffect(() => {
        let cancelled = false;
        const resolveAddress = async () => {
            if (!user) {
                if (!loading) setPersonalAddress('');
                return;
            }
            const role = toSafeText(currentRole).toLowerCase();
            const isLiveRole = role === 'fleet' || role === 'pilot' || role === 'technician';
            const stored = getStoredAddress(user);
            const storedCoords = getStoredCoords(user);

            const reverseGeocodeCoords = async (lat: number, lng: number): Promise<string> => {
                try {
                    const result = await mapsApi.reverseGeocode(lat, lng);
                    return extractFullAddress(result);
                } catch {
                    return '';
                }
            };

            if (!isLiveRole) {
                // Customer / sales-aggregator: user-set location.
                if (stored && !isCoordinateText(stored)) {
                    setPersonalAddress(stored);
                    return;
                }
                if (storedCoords) {
                    setAddressLoading(true);
                    const resolved = await reverseGeocodeCoords(storedCoords.lat, storedCoords.lng);
                    if (cancelled) return;
                    setAddressLoading(false);
                    if (resolved) {
                        setPersonalAddress(resolved);
                        return;
                    }
                }
                setPersonalAddress(stored && !isCoordinateText(stored) ? stored : '');
                return;
            }

            // FM / pilot / technician: live location first.
            setAddressLoading(true);
            try {
                const pos: any = await getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 }).catch(() => null);
                const lat = Number(pos?.coords?.latitude);
                const lng = Number(pos?.coords?.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const resolved = await reverseGeocodeCoords(lat, lng);
                    if (cancelled) return;
                    setAddressLoading(false);
                    if (resolved) {
                        setPersonalAddress(resolved);
                        return;
                    }
                }
            } catch {
                // fall through to stored address
            }
            if (cancelled) return;
            setAddressLoading(false);
            if (stored && !isCoordinateText(stored)) {
                setPersonalAddress(stored);
                return;
            }
            if (storedCoords) {
                const resolved = await reverseGeocodeCoords(storedCoords.lat, storedCoords.lng);
                if (cancelled) return;
                if (resolved) {
                    setPersonalAddress(resolved);
                    return;
                }
            }
            setPersonalAddress('');
        };
        resolveAddress();
        return () => {
            cancelled = true;
        };
    }, [user, currentRole, loading]);

    const openPhotoViewer = () => {
        setDraftPhoto(getProfilePhotoUrl(user));
        setPhotoViewerVisible(true);
    };

    const handleSavePhoto = async () => {
        if (!draftPhoto || photoSaving) return;
        setPhotoSaving(true);
        try {
            const updated = await customerApi.updateCurrentUser({ profilePhoto: draftPhoto });
            await updateStoredUser(updated).catch(() => {});
            setUser(updated);
            setPhotoViewerVisible(false);
        } catch (error) {
            console.error('Failed to update profile photo', error);
        } finally {
            setPhotoSaving(false);
        }
    };

    const handleNotifToggle = async (key: string) => {
        const next = !notifSettings[key];
        const prev = { ...notifSettings };
        setNotifSettings({ ...prev, [key]: next });
        setNotifSavingKey(key);
        try {
            const api: any = getSettingsApi();
            const update = async (target: any) => target.updateNotificationSettings({ [key]: next });
            const res = await update(api).catch(async () => {
                const fallback: any = api === customerApi ? aggregatorApi : customerApi;
                return update(fallback);
            });
            const remote = res?.notificationSettings || {};
            setNotifSettings({ ...NOTIF_MASTER_DEFAULTS, ...NOTIF_CATEGORY_DEFAULTS, ...prev, [key]: next, ...remote });
        } catch (e) {
            console.error('Failed to update notification setting', e);
            setNotifSettings(prev); // revert on failure
        } finally {
            setNotifSavingKey(null);
        }
    };

    const renderNotifPrefs = () => {
        if (notifLoading) {
            return (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#5060D3" />
                </View>
            );
        }
        return (
            <View>
                {!!notifError && (
                    <View>
                        <Text style={{ color: '#DC2626', marginBottom: 8 }}>{notifError}</Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#EEF0FF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, alignSelf: 'flex-start', marginBottom: 16 }}
                            onPress={loadNotifSettings}
                        >
                            <Text style={{ color: '#5060D3', fontFamily: 'Roboto-Medium' }}>{t('Retry')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {NOTIF_SECTIONS.map((section) => (
                    <View key={section.masterKey}>
                        <View style={[styles.notifItemRow, { marginTop: 8 }]}>
                            <View style={styles.notifTextCol}>
                                <Text style={[styles.notifItemLabel, { fontWeight: '600' }]}>{t(section.title)}</Text>
                                <Text style={styles.notifItemSub}>{t('Master switch for this channel')}</Text>
                            </View>
                            <View style={{ opacity: notifSavingKey === section.masterKey ? 0.5 : 1 }}>
                                <CustomToggle value={!!notifSettings[section.masterKey]} onToggle={() => !notifSavingKey && handleNotifToggle(section.masterKey)} />
                            </View>
                        </View>
                        {NOTIF_ITEMS.map((item) => (
                            <View key={`${section.masterKey}_${item.key}`} style={styles.notifItemRow}>
                                <View style={styles.notifTextCol}>
                                    <Text style={styles.notifItemLabel}>{t(item.label)}</Text>
                                    <Text style={styles.notifItemSub}>{t(item.sub)}</Text>
                                </View>
                                <View style={{ opacity: notifSavingKey === item.key ? 0.5 : 1 }}>
                                    <CustomToggle
                                        value={!!notifSettings[section.masterKey] && !!notifSettings[item.key]}
                                        onToggle={() => !notifSavingKey && handleNotifToggle(item.key)}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    const handleAddBiometricsPress = async () => {
        const support = await checkBiometricSupport();

        if (support.status === 'web') {
            setBiometricModal('web');
        } else if (support.status === 'unavailable') {
            setBiometricModal('unavailable');
        } else {
            if (onNavigate) onNavigate('AddBiometricsScreen');
        }
    };
    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.error('Logout error', e);
        }
        if (onNavigate) onNavigate('MobileNumberScreen');
    };

    const handleRoleSelect = (roleId: string) => {
        onSwitchRole(roleId);
    };

    /**
     * Role click flow (mobile icons + desktop cards) — shared by web + APK + iOS:
     * - Current role → nothing happens.
     * - Customer (base role every user already has) → confirmation popup only.
     *   Never check applications, never open a form.
     * - Restricted role the user is already approved for (their original/main
     *   role such as pilot, or any role in approvedRoles/roles) → confirmation
     *   popup only, then switch. Never ask for the application form again.
     * - Any other restricted role (sales / fleet / technician / pilot the user
     *   has never been approved for) → application flow:
     *   never applied → application form, pending/rejected → status screen,
     *   approved → confirmation popup then switch.
     */
    const [roleFlowLoading, setRoleFlowLoading] = useState(false);
    const [pendingConfirmRole, setPendingConfirmRole] = useState<string | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);

    const collectApprovedBackendRoles = (u: any): string[] => {
        if (!u) return ['customer'];
        const collected: string[] = ['customer'];
        const push = (value: any) => {
            if (!value) return;
            const list = Array.isArray(value) ? value : [value];
            list.forEach((entry) => {
                if (!entry) return;
                try {
                    const backend = normalizeBackendRole(entry);
                    if (backend && !collected.includes(backend)) collected.push(backend);
                    const frontend = normalizeFrontendRole(entry);
                    if (frontend) {
                        const viaFrontend = normalizeBackendRole(frontend);
                        if (viaFrontend && !collected.includes(viaFrontend)) collected.push(viaFrontend);
                    }
                } catch {
                    // ignore unparseable entries
                }
            });
        };
        push(u.approvedRoles);
        push(u.roles);
        push(u.role);
        push(u.primaryRole);
        return collected;
    };

    const isRoleAlreadyApproved = (u: any, roleId: string): boolean => {
        if (roleId === 'customer') return true;
        const targetBackend = normalizeBackendRole(roleId);
        return collectApprovedBackendRoles(u).includes(targetBackend);
    };

    const handleRolePress = async (roleId: string) => {
        if (roleId === currentRole) {
            return;
        }
        // Customer is always available — ask for confirmation via the
        // cross-platform modal (Alert.alert is a no-op on web).
        if (roleId === 'customer') {
            setPendingConfirmRole('customer');
            return;
        }
        if (roleFlowLoading) {
            return;
        }
        setRoleFlowLoading(true);
        try {
            // Refresh the profile so approvedRoles is current (e.g. pilot who
            // switched to customer still carries pilot in approvedRoles).
            let freshUser: any = user;
            try {
                const latest = await customerApi.getCurrentUser().catch(() => null);
                if (latest) {
                    freshUser = latest;
                    setUser(latest);
                }
            } catch {
                // Fall back to the cached user/session below.
            }
            if (!freshUser) {
                try {
                    const session = await getSession();
                    freshUser = session?.user || null;
                } catch {
                    freshUser = null;
                }
            }
            // Already approved (e.g. switching back to your main pilot role
            // after visiting customer) → confirmation only, no form.
            if (isRoleAlreadyApproved(freshUser, roleId)) {
                setPendingConfirmRole(roleId);
                return;
            }
            const application = await roleApplicationsApi.getMyApplicationForRole(roleId);
            if (!application || application.status === 'pending' || application.status === 'rejected') {
                if (!application) {
                    onNavigate?.('RoleApplicationFormScreen', { role: roleId });
                } else {
                    onNavigate?.('ApplicationStatusScreen', { role: roleId });
                }
                return;
            }
            if (application.status === 'approved') {
                // Approved via application → confirmation popup, then switch.
                setPendingConfirmRole(roleId);
            }
        } catch (error) {
            console.error('Failed to check role application status', error);
            onNavigate?.('RoleApplicationFormScreen', { role: roleId });
        } finally {
            setRoleFlowLoading(false);
        }
    };

    const handleConfirmRoleSwitch = async () => {
        if (!pendingConfirmRole || confirmBusy) return;
        setConfirmBusy(true);
        try {
            await handleRoleSelect(pendingConfirmRole);
        } finally {
            setConfirmBusy(false);
            setPendingConfirmRole(null);
        }
    };

    const handleRoleIconPress = (roleId: string) => {
        handleRolePress(roleId);
    };

    const handleLanguageSelect = (code: string) => {
        setSelectedLanguage(code);
        setLanguage(code);
    };

    const currentRoleTitle = ROLES.find(r => r.id === currentRole)?.title || 'Drone Pilot';

    const regionalCode = regionalLanguage && !CONSTANT_LANGUAGE_CODES.includes(regionalLanguage) ? regionalLanguage : null;
    const constantLanguages = ALL_LANGUAGES.filter((lang) => CONSTANT_LANGUAGE_CODES.includes(lang.code));
    const regionalEntry = regionalCode ? ALL_LANGUAGES.find((lang) => lang.code === regionalCode) || null : null;
    const otherLanguages = ALL_LANGUAGES.filter(
        (lang) => !CONSTANT_LANGUAGE_CODES.includes(lang.code) && lang.code !== regionalCode,
    );

    const renderLanguageRow = (lang: { code: string; name: string; nativeName: string }) => (
        <TouchableOpacity
            key={lang.code}
            style={styles.languageRow}
            activeOpacity={0.7}
            onPress={() => handleLanguageSelect(lang.code)}
        >
            <View style={styles.languageNameWrap}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageNative}>{lang.nativeName}</Text>
            </View>
            <View style={[styles.languageRadioOuter, selectedLanguage === lang.code && styles.languageRadioOuterSelected]}>
                {selectedLanguage === lang.code && <View style={styles.languageRadioInner} />}
            </View>
        </TouchableOpacity>
    );

    const renderLanguageSection = () => (
        <View style={styles.languageSection}>
            {constantLanguages.map(renderLanguageRow)}

            {regionalEntry && (
                <View style={styles.languageGroup}>
                    <Text style={styles.languageGroupLabel}>{t('Regional Language')}</Text>
                    {renderLanguageRow(regionalEntry)}
                </View>
            )}

            <View style={styles.languageGroup}>
                <TouchableOpacity
                    style={styles.languageGroupHeader}
                    activeOpacity={0.7}
                    onPress={() => setIsOtherLanguagesExpanded(prev => !prev)}
                >
                    <Text style={styles.languageGroupLabel}>{t('Other Languages')}</Text>
                    {isOtherLanguagesExpanded ? <ChevronDown /> : <ChevronRight />}
                </TouchableOpacity>
                {isOtherLanguagesExpanded && otherLanguages.map(renderLanguageRow)}
            </View>
        </View>
    );

    // ==========================================
    // DESKTOP LAYOUT
    // ==========================================
    if (isDesktop) {
        return (
            <>
            <DesktopPageShell
                header={<View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32, paddingBottom: 24 }}>
                    <Text style={[styles.fsPageTitle, { fontSize: 28 }]}>{t('Account Settings')}</Text>
                </View>}            >
                <SplitPane
                    leftWeight={2.5} rightWeight={7.5}
                    left={
                        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                            {DESKTOP_TABS.map(tab => {
                                const isActive = desktopTab === tab;
                                return (
                                    <TouchableOpacity
                                        key={tab}
                                        style={{ paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, backgroundColor: isActive ? '#EEF0FF' : 'transparent', marginBottom: 4 }}
                                        onPress={() => setDesktopTab(tab)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={{ fontSize: 16, fontFamily: 'Roboto-Medium', color: isActive ? '#5060D3' : '#4B5563' }}>{t(tab)}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    }
                    right={
                        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 40, borderWidth: 1, borderColor: '#E5E7EB', minHeight: 600 }}>

                            {desktopTab === 'Profile' && (
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                                        <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 0 }]}>{t('Personal Details')}</Text>
                                        <TouchableOpacity onPress={() => onNavigate?.('EditDetailsScreen', { user })}>
                                            <Text style={{ color: '#5060D3', fontSize: 14, fontWeight: '600' }}>{t('Edit')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {loading ? (
                                        <ActivityIndicator size="large" color="#5060D3" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
                                            <TouchableOpacity onPress={openPhotoViewer} activeOpacity={0.8}>
                                                <View style={styles.avatarCircle}>
                                                    {getProfilePhotoUrl(user) ? (
                                                        <Image source={{ uri: getProfilePhotoUrl(user) }} style={styles.avatarImage} />
                                                    ) : (
                                                        <Text style={styles.avatarText}>
                                                            {toSafeText(user?.name || 'U').charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={styles.avatarHint}>{t('View / Edit')}</Text>
                                            </TouchableOpacity>
                                            <View style={{ marginLeft: 32 }}>
                                                <Text style={[styles.bodyText, { fontSize: 24, fontFamily: 'Roboto-Medium', color: '#111827', marginBottom: 4 }]}>{user?.name || t('Not provided')}</Text>
                                                <Text style={[styles.bodyText, { color: '#6B7280', marginBottom: 12 }]}>{user?.email || t('No email')}   •   {user?.phone || t('No phone')}</Text>
                                                <Text style={styles.bodyText}>{t('Role: {{role}}   |   User ID: {{id}}', { role: user?.role || currentRole, id: user?.uid || 'N/A' })}</Text>
                                                <Text style={[styles.bodyText, { marginTop: 8 }]}>
                                                    {addressLoading ? t('Locating…') : (personalAddress || t('Address unavailable'))}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {desktopTab === 'Your Role' && (
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 0 }]}>{t('Switch Your Role')}</Text>
                                        <Text style={styles.bodyTextList}>{t('Current Role: ')}<Text style={styles.blueText}>{t(currentRoleTitle)}</Text></Text>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 32 }} />

                                    <ResponsiveGrid>
                                        {ROLES.filter((role) => role.id !== currentRole).map((role) => {
                                            const isActive = currentRole === role.id;
                                            const RoleImageComponent = role.image;
                                            return (
                                                <TouchableOpacity key={role.id} style={[{ width: '48%', flexDirection: 'column', height: 'auto', padding: 24, borderRadius: 20, borderWidth: 2, borderColor: isActive ? '#5060D3' : '#E5E7EB', backgroundColor: isActive ? '#EEF0FF' : '#FFFFFF' }]} activeOpacity={0.8} onPress={() => handleRolePress(role.id)}>
                                                    <View style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', marginBottom: 24 }}>
                                                        <RoleImageComponent width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ResponsiveGrid>
                                </View>
                            )}

                            {desktopTab === 'Preferences' && (
                                <View>
                                    <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 24 }]}>{t('General Settings')}</Text>
                                    <TouchableOpacity
                                        style={[styles.actionRow, { paddingVertical: 16 }]}
                                        activeOpacity={0.7}
                                        onPress={() => setIsLanguageExpanded(prev => !prev)}
                                    >
                                        <Text style={styles.actionText}>{t('Language')}</Text>
                                        {isLanguageExpanded ? <ChevronDown /> : <ChevronRight />}
                                    </TouchableOpacity>
                                    {isLanguageExpanded && renderLanguageSection()}
                                    <View style={[styles.actionRow, { paddingVertical: 16 }]}><Text style={styles.actionText}>{t('Theme')}</Text><View style={styles.themeToggleTrack}><View style={styles.themeToggleThumb} /></View></View>

                                    <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 32 }} />

                                    <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 8 }]}>{t('Notification Preferences')}</Text>
                                    {renderNotifPrefs()}
                                </View>
                            )}

                            {desktopTab === 'Marketplace' && (
                                <View style={styles.tabSection}>
                                    <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 24 }]}>{t('Marketplace Settings')}</Text>
                                    {currentScreen === 'CustomerRefundsScreen' ? (
                                        <CustomerRefundsScreen
                                            onNavigate={onNavigate}
                                            onSwitchRole={onSwitchRole}
                                            routeParams={{}}
                                        />
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.actionRow, { paddingVertical: 16 }]}
                                            activeOpacity={0.7}
                                            onPress={() => onNavigate?.('CustomerRefundsScreen')}
                                        >
                                            <Text style={styles.actionText}>{t('Refunds')}</Text>
                                            <ChevronRight />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {desktopTab === 'Support' && (
                                <View style={styles.tabSection}>
                                    {currentScreen === 'NewComplaintFormScreen' ? (
                                        <NewComplaintFormScreen onNavigate={onNavigate} onSwitchRole={onSwitchRole} routeParams={{}} />
                                    ) : currentScreen === 'ComplaintHistoryScreen' ? (
                                        <ComplaintHistoryScreen onNavigate={onNavigate} onSwitchRole={onSwitchRole} routeParams={{}} />
                                    ) : currentScreen === 'ComplaintDetailsScreen' ? (
                                        <ComplaintDetailsScreen onNavigate={onNavigate} onSwitchRole={onSwitchRole} routeParams={{}} />
                                    ) : (
                                        <>
                                            <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 24 }]}>{t('Help & Support')}</Text>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('SupportOptionsScreen')}>
                                                <Text style={styles.actionText}>{t('Help Centre')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('ContactUsScreen')}>
                                                <Text style={styles.actionText}>{t('Contact Us')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('NewComplaintFormScreen')}>
                                                <Text style={styles.actionText}>{t('Raise a Complaint')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('ComplaintHistoryScreen')}>
                                                <Text style={styles.actionText}>{t('Complaint History')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('LegalPoliciesScreen')}>
                                                <Text style={styles.actionText}>{t('Legal Policies')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}

                            {desktopTab === 'Security' && (
                                <View style={styles.tabSection}>
                                    {currentScreen === 'AddBiometricsScreen' ? (
                                        <AddBiometricsScreen onNavigate={onNavigate} />
                                    ) : currentScreen === 'TwoFactorAuthScreen' ? (
                                        <TwoFactorAuthScreen onNavigate={onNavigate} />
                                    ) : currentScreen === 'LogoutScreen' ? (
                                        <LogoutScreen onNavigate={onNavigate} onSwitchRole={onSwitchRole} routeParams={{}} />
                                    ) : currentScreen === 'DeleteAccountScreen' ? (
                                        <DeleteAccountScreen onNavigate={onNavigate} onSwitchRole={onSwitchRole} routeParams={{}} />
                                    ) : (
                                        <>
                                            <Text style={[styles.sectionHeader, { fontSize: 20, color: '#111827', marginBottom: 24 }]}>{t('Account Security')}</Text>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={handleAddBiometricsPress}>
                                                <Text style={styles.actionText}>{t('Add Biometrics')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('TwoFactorAuthScreen')}>
                                                <Text style={styles.actionText}>{t('2-Factor Authentication')}</Text>
                                                <ChevronRight />
                                            </TouchableOpacity>
                                            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 32 }} />
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('LogoutScreen')}>
                                                <Text style={[styles.actionTextRed, { fontWeight: '600' }]}>{t('Log Out')}</Text>
                                                <ChevronRight color="#DC2626" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionRow, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={() => onNavigate?.('DeleteAccountScreen')}>
                                                <Text style={[styles.actionTextRed, { fontWeight: '600' }]}>{t('Delete Account')}</Text>
                                                <ChevronRight color="#DC2626" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}

                        </View>
                    }
                />
            </DesktopPageShell>
            <BiometricAlertModal
                visible={biometricModal !== null}
                mode={biometricModal || 'web'}
                onClose={() => setBiometricModal(null)}
                message={biometricModal === 'web'
                    ? t('Biometrics is only available in the app. Please download the Hawk Aero app to use this feature.')
                    : t('Biometrics is not available on your phone.')}
            />
            <RoleSwitchConfirmModal
                visible={pendingConfirmRole !== null}
                roleTitle={pendingConfirmRole ? (ROLES.find(r => r.id === pendingConfirmRole)?.title || pendingConfirmRole) : ''}
                loading={confirmBusy}
                onCancel={() => { if (!confirmBusy) setPendingConfirmRole(null); }}
                onConfirm={handleConfirmRoleSwitch}
            />
            <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
                <View style={styles.photoModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!photoSaving) setPhotoViewerVisible(false); }} />
                    <View style={styles.photoModalCard}>
                        <Text style={styles.photoModalTitle}>{t('Profile Photo')}</Text>
                        {draftPhoto ? (
                            <Image source={{ uri: draftPhoto }} style={styles.photoModalImage} />
                        ) : (
                            <View style={[styles.photoModalImage, styles.photoModalPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {toSafeText(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <ProfilePhotoPicker value={draftPhoto} onChange={setDraftPhoto} />
                        <View style={styles.photoModalActions}>
                            <Pressable
                                style={[styles.photoModalButton, styles.photoModalCancel]}
                                onPress={() => { if (!photoSaving) setPhotoViewerVisible(false); }}
                            >
                                <Text style={styles.photoModalCancelText}>{t('Close')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.photoModalButton, styles.photoModalSave]}
                                onPress={handleSavePhoto}
                                disabled={photoSaving || !draftPhoto}
                            >
                                {photoSaving
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.photoModalSaveText}>{t('Save Photo')}</Text>}
                            </Pressable>
                        </View>
                        <TouchableOpacity
                            onPress={() => { setPhotoViewerVisible(false); onNavigate?.('EditDetailsScreen', { user }); }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.photoModalEditLink}>{t('Open in Edit Details')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            </>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Avatar Section — shows profile pic; tap to view / edit just like Edit Details */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={openPhotoViewer} activeOpacity={0.8} style={{ alignItems: 'center' }}>
                        <View style={styles.avatarCircle}>
                            {getProfilePhotoUrl(user) ? (
                                <Image source={{ uri: getProfilePhotoUrl(user) }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {loading ? '...' : toSafeText(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <Text style={styles.avatarHint}>{t('View / Edit Photo')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Details */}
                <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => onNavigate?.('EditDetailsScreen', { user })}>
                    <View style={styles.rowCenter}>
                        <View style={styles.flex1}>
                            <Text style={styles.sectionHeader}>{t('Personal Details')}</Text>
                            {loading ? (
                                <ActivityIndicator size="small" color="#5060D3" />
                            ) : (
                                <>
                                    <Text style={styles.bodyText}>{user?.name || t('Not provided')}</Text>
                                    <Text style={styles.bodyText}>{user?.phone || t('No phone')}</Text>
                                    <Text style={styles.bodyText}>{user?.email || t('No email')}</Text>
                                    <Text style={styles.bodyText}>{t('Role: {{role}}', { role: user?.role || currentRole })}</Text>
                                    <Text style={styles.bodyText}>{t('ID: {{id}}', { id: user?.uid || 'N/A' })}</Text>
                                    <Text style={[styles.bodyText, { marginTop: 4, lineHeight: 22 }]}>
                                        {addressLoading ? t('Locating…') : (personalAddress || t('Address unavailable'))}
                                    </Text>
                                </>
                            )}
                        </View>
                        <ChevronRight />
                    </View>
                </TouchableOpacity>

                {/* Your Role Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>{t('Your Role')}</Text>
                    <Text style={styles.bodyTextList}>
                        {t('Your Current Role:')} <Text style={styles.blueText}>{t(currentRoleTitle)}</Text>
                    </Text>

                    <View style={styles.roleIconsRow}>
                        {ROLES.filter((role) => role.id !== currentRole).map((role) => {
                            const isActive = currentRole === role.id;
                            const RoleIcon = role.image;
                            return (
                                <TouchableOpacity
                                    key={role.id}
                                    style={[styles.roleIconItem, isActive && styles.roleIconItemActive]}
                                    onPress={() => handleRoleIconPress(role.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.roleIconCircle, isActive && styles.roleIconCircleActive]}>
                                        <RoleIcon width={26} height={26} />
                                    </View>
                                    <Text style={[styles.roleIconLabel, isActive && styles.roleIconLabelActive]}>{t(role.title)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('ApplicationStatusScreen')}>
                        <Text style={styles.actionText}>{t('Application Status')}</Text>
                        <ChevronRight />
                    </TouchableOpacity>

                </View>

                {/* Preferences */}
                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>{t('Preferences')}</Text>

                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => setIsLanguageExpanded(prev => !prev)}>
                        <Text style={styles.actionText}>{t('Language')}</Text>
                        {isLanguageExpanded ? <ChevronDown /> : <ChevronRight />}
                    </TouchableOpacity>

                    {isLanguageExpanded && renderLanguageSection()}

                    <View style={styles.actionRow}>
                        <Text style={styles.actionText}>{t('Theme')}</Text>
                        <View style={styles.themeToggleTrack}>
                            <View style={styles.themeToggleThumb} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => setIsNotifModalVisible(true)}>
                        <Text style={styles.actionText}>{t('Notifications')}</Text>
                        <ChevronRight />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>{t('Marketplace')}</Text>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('CustomerRefundsScreen')}>
                        <Text style={styles.actionText}>{t('Refunds')}</Text>
                        <ChevronRight />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>{t('Support')}</Text>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('SupportOptionsScreen')}><Text style={styles.actionText}>{t('Help Centre')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('ContactUsScreen')}><Text style={styles.actionText}>{t('Contact Us')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('NewComplaintFormScreen')}><Text style={styles.actionText}>{t('Raise a Complaint')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('ComplaintHistoryScreen')}><Text style={styles.actionText}>{t('Complaint History')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('LegalPoliciesScreen')}><Text style={styles.actionText}>{t('Legal Policies')}</Text><ChevronRight /></TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={handleAddBiometricsPress}><Text style={styles.actionText}>{t('Add Biometrics')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('TwoFactorAuthScreen')}><Text style={styles.actionText}>{t('2-Factor Authentication')}</Text><ChevronRight /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('LogoutScreen')}><Text style={styles.actionTextRed}>{t('Log Out')}</Text><ChevronRight color="#DC2626" /></TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => onNavigate?.('DeleteAccountScreen')}><Text style={styles.actionTextRed}>{t('Delete Account')}</Text><ChevronRight color="#DC2626" /></TouchableOpacity>
                </View>

            </ScrollView>

            {/* ─── NOTIFICATION PREFERENCES MODAL (Full Screen) ─── */}
            <Modal visible={isNotifModalVisible} animationType="slide" onRequestClose={() => setIsNotifModalVisible(false)}>
                <SafeAreaView style={styles.fullScreenModal}>
                    <View style={styles.fsModalHeader}>
                        <TouchableOpacity style={styles.fsBackBtn} onPress={() => setIsNotifModalVisible(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.fsBackArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.fsPageTitle}>{t('Your Notification Preferences')}</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fsScrollContent}>
                        {renderNotifPrefs()}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* ─── BIOMETRICS GATING MODAL ─── */}
            <BiometricAlertModal
                visible={biometricModal !== null}
                mode={biometricModal || 'web'}
                onClose={() => setBiometricModal(null)}
                message={biometricModal === 'web'
                    ? t('Biometrics is only available in the app. Please download the Hawk Aero app to use this feature.')
                    : t('Biometrics is not available on your phone.')}
            />

            {/* ─── ROLE-SWITCH CONFIRMATION (web + APK + iOS) ─── */}
            <RoleSwitchConfirmModal
                visible={pendingConfirmRole !== null}
                roleTitle={pendingConfirmRole ? (ROLES.find(r => r.id === pendingConfirmRole)?.title || pendingConfirmRole) : ''}
                loading={confirmBusy}
                onCancel={() => { if (!confirmBusy) setPendingConfirmRole(null); }}
                onConfirm={handleConfirmRoleSwitch}
            />

            {/* ─── PROFILE PHOTO VIEWER / EDITOR (same picker as Edit Details) ─── */}
            <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
                <View style={styles.photoModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!photoSaving) setPhotoViewerVisible(false); }} />
                    <View style={styles.photoModalCard}>
                        <Text style={styles.photoModalTitle}>{t('Profile Photo')}</Text>
                        {draftPhoto ? (
                            <Image source={{ uri: draftPhoto }} style={styles.photoModalImage} />
                        ) : (
                            <View style={[styles.photoModalImage, styles.photoModalPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {toSafeText(user?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <ProfilePhotoPicker value={draftPhoto} onChange={setDraftPhoto} />
                        <View style={styles.photoModalActions}>
                            <Pressable
                                style={[styles.photoModalButton, styles.photoModalCancel]}
                                onPress={() => { if (!photoSaving) setPhotoViewerVisible(false); }}
                            >
                                <Text style={styles.photoModalCancelText}>{t('Close')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.photoModalButton, styles.photoModalSave]}
                                onPress={handleSavePhoto}
                                disabled={photoSaving || !draftPhoto}
                            >
                                {photoSaving
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.photoModalSaveText}>{t('Save Photo')}</Text>}
                            </Pressable>
                        </View>
                        <TouchableOpacity
                            onPress={() => { setPhotoViewerVisible(false); onNavigate?.('EditDetailsScreen', { user }); }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.photoModalEditLink}>{t('Open in Edit Details')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    scrollContent: { paddingTop: 48, paddingBottom: 100 },
    flex1: { flex: 1, paddingRight: 16 },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    tabSection: { width: '100%' },

    avatarSection: { alignItems: 'center', marginBottom: 24 },
    avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E0E7FF', borderWidth: 3, borderColor: '#5060D3', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarText: { fontSize: 40, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#374151' },
    avatarImage: { width: 104, height: 104, borderRadius: 52 },
    avatarHint: { marginTop: 8, fontSize: 12, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5060D3', textAlign: 'center' },
    photoModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.55)' },
    photoModalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', maxWidth: 400, width: '100%' },
    photoModalTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#111827', marginBottom: 16 },
    photoModalImage: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#E0E7FF' },
    photoModalPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#5060D3' },
    photoModalActions: { flexDirection: 'row', width: '100%', marginTop: 16 } as any,
    photoModalButton: { flex: 1, borderRadius: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
    photoModalCancel: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    photoModalSave: { backgroundColor: '#5060D3' },
    photoModalCancelText: { color: '#374151', fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '500' },
    photoModalSaveText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '500' },
    photoModalEditLink: { marginTop: 14, fontSize: 14, color: '#5060D3', fontFamily: 'Roboto-Medium', fontWeight: '500' },

    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },

    sectionHeader: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', marginBottom: 16 },
    bodyText: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#374151', marginBottom: 8 },
    bodyTextList: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#374151', marginBottom: 20 },
    blueText: { color: '#5060D3', fontFamily: 'Roboto-Medium', fontWeight: '500' },

    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    actionText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1F2937' },
    actionTextRed: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#DC2626' },

    roleIconsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    roleIconItem: { alignItems: 'center', flex: 1, paddingVertical: 8, borderRadius: 12 },
    roleIconItemActive: { backgroundColor: '#EEF0FF' },
    roleIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    roleIconCircleActive: { backgroundColor: '#E0E7FF' },
    roleIconLabel: { fontSize: 11, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#6B7280', textAlign: 'center' },
    roleIconLabelActive: { color: '#5060D3' },

    themeToggleTrack: { width: 48, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', borderWidth: 1.5, borderColor: '#6B7280', justifyContent: 'center', paddingHorizontal: 3 },
    themeToggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#6B7280' },

    carouselSection: { paddingTop: 16 },
    carouselTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#374151', marginLeft: 20, marginBottom: 16 },

    // Language Section
    languageSection: { paddingTop: 4, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4 },
    languageGroup: { marginTop: 12 },
    languageGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    languageGroupLabel: { fontSize: 12, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 0 },
    languageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    languageNameWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
    languageName: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1F2937' },
    languageNative: { fontSize: 12, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280' },
    languageRadioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#6B7280', justifyContent: 'center', alignItems: 'center' },
    languageRadioOuterSelected: { borderColor: '#5060D3' },
    languageRadioInner: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#5060D3' },

    // Role Modal (Bottom Sheet)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayDismiss: { ...StyleSheet.absoluteFill },
    bottomSheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%', paddingBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
    sheetTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#5060D3' },
    closeBtnX: { fontSize: 24, color: '#4B5563', fontWeight: '400' },
    sheetScroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Role Cards
    roleCard: { flexDirection: 'row', marginBottom: 20 },
    roleImageContainer: { flex: 1, backgroundColor: '#F3F4F6' },
    roleImageLabel: { paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
    roleImageLabelActive: { backgroundColor: '#5060D3' },
    roleImageLabelInactive: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    roleImageLabelText: { fontSize: 13, fontFamily: 'Roboto-Medium', fontWeight: '600' },
    roleImageLabelTextActive: { color: '#FFFFFF' },
    roleImageLabelTextInactive: { color: '#4B5563' },
    roleRowMobile: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
        width: '100%',
    },
    roleRowMobileActive: {
        borderColor: '#5060D3',
        backgroundColor: '#EEF0FF',
    },
    roleIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    roleIconBoxActive: {
        backgroundColor: '#E0E7FF',
    },
    roleRowTitle: {
        fontSize: 16,
        fontFamily: 'Roboto-Medium',
        fontWeight: '600',
        color: '#374151',
    },
    roleRowTitleActive: {
        color: '#5060D3',
    },

    // Notification Preferences Modal (Full Screen)
    fullScreenModal: { flex: 1, backgroundColor: '#FAFAFA' },
    fsModalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#FAFAFA' },
    fsBackBtn: { marginRight: 16, justifyContent: 'center' },
    fsBackArrow: { fontSize: 28, color: '#4B5563', fontWeight: '400', marginTop: -4 },
    fsPageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#374151' },
    fsScrollContent: { paddingHorizontal: 24, paddingBottom: 64 },

    notifSectionTitle: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', marginTop: 24, marginBottom: 16 },
    notifItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    notifTextCol: { flex: 1, paddingRight: 20 },
    notifItemLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1F2937', marginBottom: 2 },
    notifItemSub: { fontSize: 14, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', lineHeight: 20 },

    notifToggleTrack: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#E4E5EB', borderWidth: 2, borderColor: '#81838A', justifyContent: 'center', paddingHorizontal: 2 },
    notifToggleTrackActive: { borderColor: '#5060D3' },
    notifToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#81838A' },
    notifToggleThumbActive: { transform: [{ translateX: 22 }], backgroundColor: '#5060D3' },

    // Biometrics Gating Modal (Pop-up)
    biometricModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
    biometricModalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, paddingTop: 32, alignItems: 'center', maxWidth: 360, width: '100%' },
    biometricModalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    biometricModalTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#111827', marginBottom: 10, textAlign: 'center' },
    biometricModalMessage: { fontSize: 14, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
    biometricModalButton: { backgroundColor: '#5060D3', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 48, alignItems: 'center', justifyContent: 'center' },
    biometricModalButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '500', textAlign: 'center' },

    // Role-switch confirmation (cross-platform: web + Android APK + iOS)
    confirmModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
    confirmModalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', maxWidth: 380, width: '100%' },
    confirmModalTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#111827', marginBottom: 10, textAlign: 'center' },
    confirmModalMessage: { fontSize: 14, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
    confirmModalActions: { flexDirection: 'row', width: '100%', gap: 12 } as any,
    confirmModalButton: { flex: 1, borderRadius: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    confirmModalCancel: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    confirmModalConfirm: { backgroundColor: '#5060D3' },
    confirmModalCancelText: { color: '#374151', fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '500' },
    confirmModalConfirmText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '500' },
});

export default AccountsScreen;
