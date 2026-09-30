import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    Alert,
    Animated,
    Image,
} from 'react-native';
import Header from '../components/Header';

import ActiveMissionCard from '../components/ActiveMissionCard';
import AssignedMissionCard from '../components/AssignedMissionCard';
import SupportCard from '../../customerModule/components/SupportCard';
import PromoCard from '../components/PromoCard';
import ReferAndEarnCard from '../../components/ReferAndEarnCard';
import PopularProducts from '../../customerModule/components/PopularProducts';
import DEMO_PRODUCTS from '../../customerModule/constants/demoProducts';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import CardViewIcon from '../../assets/CardView.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import PhoneIcon from '../../assets/phone.svg';
import BackgroundImage from '../../assets/Background.svg';
import { customerApi, pilotApi, teamApi } from '../../utils/api';
import { connectSocket } from '../../utils/socket';
import { getCurrentPosition } from '../../utils/geolocation';
import NotificationHistory from '../../common/NotificationHistory';
import { useUnreadNotifications } from '../../common/useUnreadNotifications';
import { useLanguage } from '../../i18n';
import { TeamMemberCard, TeamDetailModal } from '../../common/TeamCards';
import { colors as ui, } from '../ui/colors';
import { shadow as uiShadow } from '../ui/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

type CardLayout = 'carousel' | 'list';

const FleetManagerCard = ({ layout = 'carousel', manager }: { layout?: CardLayout; manager?: any }) => {
    const { t } = useLanguage();
    const cardWidth = layout === 'carousel' ? PEEK_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };
    return (
        <View style={[styles.fleetCard, { width: cardWidth }, marginSpacing]}>
            <View style={styles.fleetTopRow}>
                <View style={styles.fleetManagerProfile}>
                    <BackgroundImage width={52} height={52} style={styles.fleetAvatar} />
                    <View>
                        <Text style={styles.fleetName}>{manager?.name || t('Fleet Manager')}</Text>
                        <Text style={styles.fleetDronesLabel}>{t('Drones: ')}<Text style={styles.boldDark}>{manager?.dronesCount || manager?.totalDrones || '00'}</Text></Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.85}>
                    <PhoneIcon width={20} height={20} fill="#1E293B" color="#1E293B" />
                </TouchableOpacity>
            </View>
            <View style={styles.fleetLocationRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.fleetAddressText}>{manager?.address || manager?.location?.address || t('Address unavailable')}</Text>
            </View>
        </View>
    );
};

const mockPromos = [1, 2, 3];

/** Duty toggle — identical styling/transition to the technician toggle. */
const AnimatedDutyToggle: React.FC<{ isActive: boolean; onToggle: () => void }> = ({ isActive, onToggle }) => {
    const { t } = useLanguage();
    const toggleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(toggleAnim, {
            toValue: isActive ? 1 : 0,
            useNativeDriver: false,
            stiffness: 800,
            damping: 47,
            mass: 1,
        }).start();
    }, [isActive, toggleAnim]);

    const backgroundColor = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#B91C1C', '#188A4E'],
    });
    const thumbTranslateX = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 60],
    });
    const thumbColor = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#FFD9D9', '#FFFFFF'],
    });

    return (
        <Animated.View style={[styles.dutyToggleContainer, { backgroundColor }]}>
            <TouchableOpacity activeOpacity={1} onPress={onToggle} style={styles.dutyToggleTouchable}>
                <View style={styles.dutyToggleTextContainer}>
                    {isActive ? (
                        <Text style={styles.dutyToggleTextLeft}>{t('Active')}</Text>
                    ) : (
                        <Text style={styles.dutyToggleTextRight}>{t('Off-Duty')}</Text>
                    )}
                </View>
                <Animated.View
                    style={[
                        styles.dutyToggleThumb,
                        { transform: [{ translateX: thumbTranslateX }], backgroundColor: thumbColor },
                    ]}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};

const HomeScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [isActive, setIsActive] = useState(true);
    const [cardView, setCardView] = useState(true);
    const [missions, setMissions] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [earnings, setEarnings] = useState<any>(null);
    const [fleetManagers, setFleetManagers] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [accountUser, setAccountUser] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const { unreadCount, refresh: refreshUnread } = useUnreadNotifications(true);
    // ── Team (up to 3 fleet managers) ──
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamIncoming, setTeamIncoming] = useState<any[]>([]);
    const [teamOutgoing, setTeamOutgoing] = useState<any[]>([]);
    const [teamManagers, setTeamManagers] = useState<any[]>([]);
    const [teamTab, setTeamTab] = useState<'Join' | 'Pending' | 'Invites'>('Join');
    const [fmPhone, setFmPhone] = useState('');
    const [selectedFm, setSelectedFm] = useState<any>(null);
    const [fmDetailVisible, setFmDetailVisible] = useState(false);
    // ── Suggested fleet managers (5 nearest, 150km radius) ──
    const [suggestedFms, setSuggestedFms] = useState<any[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
    const [suggestionDetailVisible, setSuggestionDetailVisible] = useState(false);
    const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
    const myCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

    const loadIncomingRequests = useCallback(() => {
        pilotApi.getIncomingRequests().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.items || data?.data || [];
            setIncomingRequests(items);
        }).catch((error: any) => console.error('Failed to load pilot incoming requests', error));
    }, []);

    // Canonical account doc (/users/me) — owns the profile photo edited in
    // Accounts / Edit Details. Role profile is the fallback.
    useEffect(() => {
        customerApi.getCurrentUser().then((u: any) => setAccountUser(u || null)).catch(() => {});
    }, []);

    const headerPhotoUrl =
        accountUser?.profileData?.photoUrl ||
        accountUser?.profilePhoto ||
        profile?.profileData?.photoUrl ||
        profile?.photoUrl ||
        null;

    useEffect(() => {
        Promise.all([
            pilotApi.getMissions().catch(() => []),
            pilotApi.getIncomingRequests().catch(() => []),
            pilotApi.getEarnings().catch(() => null),
            pilotApi.getProfile().catch(() => null),
            customerApi.getProducts().catch(() => []),
        ]).then(([missionsData, incomingData, earningsData, profileData, productData]) => {
            const missionItems = Array.isArray(missionsData) ? missionsData : missionsData?.items || missionsData?.data || [];
            const incomingItems = Array.isArray(incomingData) ? incomingData : incomingData?.items || incomingData?.data || [];
            setMissions(missionItems);
            setIncomingRequests(incomingItems);
            setEarnings(earningsData);
            setProfile(profileData);
            // Duty toggle reflects last saved availability (offline by default
            // only when explicitly set off).
            if (profileData?.profileData?.isOnline === false) {
                setIsActive(false);
            }
            const productItems = Array.isArray(productData) ? productData : productData?.items || productData?.data || productData?.products || [];
            const items = productItems.length ? productItems : DEMO_PRODUCTS;
            setProducts(items.slice(0, 5));
            setProductsLoading(false);
            const managerItems = Array.isArray(profileData?.fleetManagers) ? profileData.fleetManagers : [];
            setFleetManagers(managerItems);
        }).catch((error) => {
            console.error('Failed to load pilot home data', error);
            setProducts(DEMO_PRODUCTS.slice(0, 5));
            setProductsLoading(false);
        });
    }, []);

    const loadTeam = useCallback(() => {
        teamApi.getMyManagers().then((data: any) => {
            const list = Array.isArray(data) ? data : data?.items || data?.data || [];
            setTeamManagers(list);
            setTeamLoading(false);
        }).catch(() => setTeamLoading(false));
        teamApi.incoming().then((data: any) => {
            setTeamIncoming(Array.isArray(data) ? data : data?.items || data?.data || []);
        }).catch(() => { });
        teamApi.outgoing().then((data: any) => {
            setTeamOutgoing(Array.isArray(data) ? data : data?.items || data?.data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        loadTeam();
    }, [loadTeam]);

    const loadSuggestions = useCallback((coords?: { lat: number; lng: number } | null) => {
        const geo = coords ? { lat: coords.lat, lng: coords.lng, radiusKm: 150 } : { radiusKm: 150 };
        teamApi.getSuggestedManagers(5, geo).then((data: any) => {
            const list = Array.isArray(data) ? data : data?.items || data?.data || [];
            setSuggestedFms(list.slice(0, 5));
        }).catch(() => { });
    }, []);

    useEffect(() => {
        loadSuggestions(myCoords);
    }, [loadSuggestions, myCoords]);

    // One-shot live GPS: persist it (drives FM-side radius too) + refresh suggestions.
    useEffect(() => {
        let cancelled = false;
        getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
            .then((pos: any) => {
                if (cancelled) return;
                const lat = pos?.coords?.latitude;
                const lng = pos?.coords?.longitude;
                if (typeof lat === 'number' && typeof lng === 'number') {
                    myCoordsRef.current = { lat, lng };
                    setMyCoords({ lat, lng });
                    pilotApi.updateLocation({ lat, lng }).catch(() => { });
                }
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []);

    // ⭐ Real-time refresh: when the fleet manager assigns a mission to this
    // pilot, the backend broadcasts `mission:created` — reload immediately so
    // the new incoming request appears without a manual refresh.
    useEffect(() => {
        let cancelled = false;
        let sock: any = null;
        connectSocket().then((s) => {
            if (cancelled || !s) return;
            sock = s;
            sock.on('mission:created', () => { if (!cancelled) loadIncomingRequests(); });
            sock.on('team:inviteReceived', () => { if (!cancelled) { loadTeam(); loadSuggestions(myCoordsRef.current); } });
            sock.on('team:updated', () => { if (!cancelled) { loadTeam(); loadIncomingRequests(); loadSuggestions(myCoordsRef.current); } });
        });
        return () => {
            cancelled = true;
            if (sock) sock.off('mission:created', () => { });
        };
    }, [loadIncomingRequests, loadTeam, loadSuggestions]);

    const handleJoinRequest = useCallback(() => {
        const phone = fmPhone.trim();
        if (!phone) {
            Alert.alert(t('Enter Phone'), t('Enter the fleet manager phone number to send a request.'));
            return;
        }
        teamApi.requestToJoin({ phone })
            .then(() => {
                Alert.alert(t('Request Sent'), t('The fleet manager has been notified.'));
                setFmPhone('');
                loadTeam();
            })
            .catch((error: any) => {
                Alert.alert(t('Request Failed'), error?.message || t('Could not send the request.'));
            });
    }, [fmPhone, loadTeam, t]);

    const handleTeamAccept = useCallback((id: string) => {
        teamApi.accept(id).then(() => loadTeam()).catch(() => loadTeam());
    }, [loadTeam]);

    const handleTeamReject = useCallback((id: string) => {
        teamApi.reject(id).then(() => loadTeam()).catch(() => loadTeam());
    }, [loadTeam]);

    const handleTeamCancel = useCallback((id: string) => {
        teamApi.cancel(id).then(() => loadTeam()).catch(() => loadTeam());
    }, [loadTeam]);

    const handleSuggestionJoin = useCallback((fm: any) => {
        const payload: any = fm?.uid ? { fmUid: fm.uid } : fm?.phone ? { phone: fm.phone } : null;
        if (!payload) {
            Alert.alert(t('Request Failed'), t('Could not send the request.'));
            return;
        }
        teamApi.requestToJoin(payload)
            .then(() => {
                Alert.alert(t('Request Sent'), t('The fleet manager has been notified.'));
                loadTeam();
                loadSuggestions(myCoordsRef.current);
            })
            .catch((error: any) => {
                Alert.alert(t('Request Failed'), error?.message || t('Could not send the request.'));
            });
    }, [loadTeam, loadSuggestions, t]);

    // Duty toggle → backend availability (mirrored to pilots doc so FMs see
    // Available vs Off-Duty). Reverts on failure.
    const handleDutyToggle = useCallback(() => {
        const next = !isActive;
        setIsActive(next);
        pilotApi.updateAvailability({ isOnline: next }).catch(() => setIsActive(!next));
    }, [isActive]);

    // A booking is Active only on its scheduled day; everything else accepted
    // or pending stays Upcoming. Backend blocks 2 accepted same-date bookings.
    const dayKey = (value: any): string | null => {
        if (!value) return null;
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayKey = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);
    const isLiveStatus = (s: any) => ['accepted', 'en_route', 'at_location', 'preflight', 'started'].includes(s);
    const activeMissions = useMemo(
        () => missions.filter((item) => isLiveStatus(item?.status) && dayKey(item?.scheduledDate) === todayKey),
        [missions, todayKey],
    );
    const upcomingAccepted = useMemo(
        () => missions.filter((item) => isLiveStatus(item?.status) && dayKey(item?.scheduledDate) !== todayKey),
        [missions, todayKey],
    );
    const assignedMissions = useMemo(() => incomingRequests.filter((item) => ['pending'].includes(item?.status)), [incomingRequests]);
    const upcomingMissions = useMemo(() => [...assignedMissions, ...upcomingAccepted], [assignedMissions, upcomingAccepted]);
    const completedMissions = useMemo(() => missions.filter((item) => item?.status === 'completed'), [missions]);
    const rejectedMissions = useMemo(() => missions.filter((item) => item?.status === 'cancelled' || item?.status === 'rejected'), [missions]);
    const teamFull = teamManagers.length >= 3;

    return (
        <View style={styles.container}>
            <Header showUser userName={profile?.name || 'User'} photoUrl={headerPhotoUrl} onNotification={() => setNotificationsVisible(true)} unreadCount={unreadCount} />

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ─── 1. DUTY TOGGLE (same as technician) ─── */}
                <View style={styles.statusRow}>
                    <AnimatedDutyToggle isActive={isActive} onToggle={handleDutyToggle} />

                    <Text style={styles.statusCopy}>
                        {t('You are {{status}}', { status: isActive ? t('Active Full Day') : t('Inactive') })}
                    </Text>
                </View>

                {/* Rating Row */}
                <View style={styles.ratingRow}>
                    <Text style={styles.starEmoji}>⭐</Text>
                    <Text style={styles.ratingText}>
                        {t('Your current rating on the app is ')}
                        <Text style={styles.ratingBold}>
                            {profile?.profileData?.stats?.averageRating != null
                                ? `${Number(profile.profileData.stats.averageRating).toFixed(1)} (${String(profile.profileData.stats.totalRatings || 0).padStart(2, '0')})`
                                : '0.0 (00)'}
                        </Text>
                    </Text>
                </View>

                {/* ─── 2. OVERVIEW SECTION (Card Toggle) ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <View style={styles.overviewHeader}>
                        <Text style={styles.sectionTitle}>{t('Overview')}</Text>
                        <TouchableOpacity
                            style={[styles.cardViewToggle, cardView && styles.cardViewToggleActive]}
                            onPress={() => setCardView(!cardView)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardViewThumb}>
                                <CardViewIcon width={16} height={16} />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.sectionSubtitle}>{t('Card View')}</Text>

                    {cardView && (
                        <View style={styles.overviewGrid}>
                            <View style={[styles.overviewCard, styles.overviewCardDark]}>
                                <View style={styles.cardHeader}>
                                    <RupeeIcon width={16} height={16} fill="#DDE7E1" color="#DDE7E1" style={styles.cardIcon} />
                                    <Text style={[styles.cardTitle, styles.cardTitleOnDark]}>{t('Total Earnings')}</Text>
                                </View>
                                <Text style={[styles.cardValue, { color: ui.textOnDark }]}>{earnings?.totalEarnings || earnings?.total || '0'}</Text>
                            </View>
                            <View style={styles.overviewCard}>
                                <View style={styles.cardHeader}>
                                    <DroneIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.cardIcon} />
                                    <Text style={styles.cardTitle}>{t('Completed Missions')}</Text>
                                </View>
                                <Text style={styles.cardValue}>{completedMissions.length}</Text>
                            </View>
                            <View style={styles.overviewCard}>
                                <View style={styles.cardHeader}>
                                    <DroneIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.cardIcon} />
                                    <Text style={styles.cardTitle}>{t('Upcoming Missions')}</Text>
                                </View>
                                <Text style={styles.cardValue}>{upcomingMissions.length}</Text>
                            </View>
                            <View style={styles.overviewCard}>
                                <View style={styles.cardHeader}>
                                    <DroneIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.cardIcon} />
                                    <Text style={styles.cardTitle}>{t('Rejected Missions')}</Text>
                                </View>
                                <Text style={styles.cardValue}>{rejectedMissions.length}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ─── 3. ACTIVE MISSIONS (Carousel) ─── */}
                <View style={styles.carouselSectionTop}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Active Missions ({{count}})', { count: activeMissions.length })}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={SCREEN_WIDTH - 40 + 16}
                        decelerationRate="fast"
                    >
                        {activeMissions.map((mission, index) => (
                            <ActiveMissionCard key={index} layout="carousel" onNavigate={onNavigate} mission={mission} />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 4. ASSIGNED MISSIONS (Carousel) ─── */}
                <View style={styles.carouselSection}>
                    <View style={[styles.sectionHeaderRow, { paddingHorizontal: 20 }]}>
                        <Text style={styles.sectionTitle}>{t('Assigned Missions ({{count}})', { count: assignedMissions.length })}</Text>
                        <TouchableOpacity><Text style={styles.linkBlue}>{t('View All')}</Text></TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={PEEK_WIDTH + 16}
                        decelerationRate="fast"
                    >
                        {assignedMissions.map((mission, index) => (
                            <AssignedMissionCard
                                key={index}
                                layout="carousel"
                                mission={mission}
                                onAccept={() => pilotApi.acceptMission(mission.id)
                                    .then(() => loadIncomingRequests())
                                    .catch((error: any) => console.error('Failed to accept mission', error))}
                                onReject={() => pilotApi.rejectMission(mission.id, { reason: 'Rejected from app' })
                                    .then(() => loadIncomingRequests())
                                    .catch((error: any) => console.error('Failed to reject mission', error))}
                                onViewDetails={() => onNavigate && onNavigate('ActiveMissionDetails', { missionId: mission?.id, mission })}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5. FLEET MANAGERS (Carousel) ─── */}
                <View style={styles.carouselSection}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Your Fleet Managers ({{count}}/3)', { count: fleetManagers.length })}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={PEEK_WIDTH + 16}
                        decelerationRate="fast"
                    >
                        {fleetManagers.map((manager, index) => (
                            <FleetManagerCard key={index} layout="carousel" manager={manager} />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5b. FLEET MANAGER SUGGESTIONS (5 nearest) ─── */}
                {suggestedFms.length > 0 && (
                    <View style={styles.carouselSection}>
                        <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Fleet Manager Suggestions')}</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                            snapToInterval={PEEK_WIDTH + 16}
                            decelerationRate="fast"
                        >
                            {suggestedFms.map((fm, index) => (
                                <TouchableOpacity
                                    key={fm?.uid || index}
                                    activeOpacity={0.85}
                                    style={{ marginRight: 16, width: PEEK_WIDTH }}
                                    onPress={() => { setSelectedSuggestion(fm); setSuggestionDetailVisible(true); }}
                                >
                                    <View style={styles.suggestCard}>
                                        <View style={styles.suggestTopRow}>
                                            {fm?.photoUrl ? (
                                                <Image source={{ uri: fm.photoUrl }} style={styles.suggestAvatar} />
                                            ) : (
                                                <View style={[styles.suggestAvatar, styles.suggestAvatarFallback]}>
                                                    <Text style={styles.suggestAvatarText}>{(fm?.name || 'F').charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.suggestName} numberOfLines={1}>{fm?.name || t('Fleet Manager')}</Text>
                                                <Text style={styles.suggestPhone} numberOfLines={1}>{fm?.phone || ''}</Text>
                                                {fm?.distanceKm !== undefined && fm?.distanceKm !== null && (
                                                    <Text style={styles.suggestDistance} numberOfLines={1}>{`${fm.distanceKm} km away`}</Text>
                                                )}
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.suggestJoinBtn}
                                            onPress={() => handleSuggestionJoin(fm)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.suggestJoinText}>{t('Join')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ─── TEAM TABS (below Fleet Managers, MissionScreen pill style) ─── */}
                {!teamLoading && (teamManagers.length < 3 || teamIncoming.length > 0 || teamOutgoing.length > 0) && (
                    <View style={styles.carouselSection}>
                        <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>
                            {t('My Teams ({{count}}/3)', { count: teamManagers.length })}
                        </Text>
                        <View style={styles.tabContainer}>
                            <View style={styles.tabPillWrapper}>
                                {(['Join', 'Pending', 'Invites'] as const).map((tab) => (
                                    <TouchableOpacity
                                        key={tab}
                                        style={[styles.tabBtn, teamTab === tab && styles.tabBtnActive]}
                                        onPress={() => setTeamTab(tab)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.tabBtnText, teamTab === tab && styles.tabBtnTextActive]}>
                                            {t(tab)}{tab === 'Pending' && teamOutgoing.length > 0 ? ` (${teamOutgoing.length})` : ''}
                                            {tab === 'Invites' && teamIncoming.length > 0 ? ` (${teamIncoming.length})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {teamTab === 'Join' && (
                            <View style={[styles.sectionHeaderPadding, { paddingTop: 0 }]}>
                                {teamFull ? (
                                    <Text style={styles.teamFullText}>
                                        {t('You are on 3 teams (maximum). Withdraw a request or leave a team to join another.')}
                                    </Text>
                                ) : (
                                    <View style={styles.phoneRow}>
                                        <TextInput
                                            value={fmPhone}
                                            onChangeText={setFmPhone}
                                            placeholder={t('Enter fleet manager phone number')}
                                            placeholderTextColor="#94A3B8"
                                            keyboardType="phone-pad"
                                            style={styles.phoneInput}
                                        />
                                        <TouchableOpacity style={styles.joinBtn} onPress={handleJoinRequest} activeOpacity={0.85}>
                                            <Text style={styles.joinBtnText}>{t('Send')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {teamTab === 'Pending' && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                                snapToInterval={PEEK_WIDTH + 16}
                                decelerationRate="fast"
                            >
                                {teamOutgoing.length === 0 && (
                                    <Text style={styles.emptyText}>{t('No pending requests.')}</Text>
                                )}
                                {teamOutgoing.map((req, index) => (
                                    <View key={req?.id || index} style={{ marginRight: 16, width: PEEK_WIDTH }}>
                                        <TeamMemberCard
                                            title={req?.fmName || t('Fleet Manager')}
                                            subtitle={req?.fmPhone || ''}
                                            onPress={() => { setSelectedFm({ uid: req?.fmUid, name: req?.fmName, phone: req?.fmPhone }); setFmDetailVisible(true); }}
                                        />
                                        <TouchableOpacity style={[styles.decideBtn, styles.rejectBtn, { marginTop: 8 }]} onPress={() => handleTeamCancel(req?.id)} activeOpacity={0.85}>
                                            <Text style={styles.decideText}>{t('Withdraw')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {teamTab === 'Invites' && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                                snapToInterval={PEEK_WIDTH + 16}
                                decelerationRate="fast"
                            >
                                {teamIncoming.length === 0 && (
                                    <Text style={styles.emptyText}>{t('No invitations yet.')}</Text>
                                )}
                                {teamIncoming.map((inv, index) => (
                                    <View key={inv?.id || index} style={{ marginRight: 16, width: PEEK_WIDTH }}>
                                        <TeamMemberCard
                                            title={inv?.fmName || t('Fleet Manager')}
                                            subtitle={inv?.fmPhone || ''}
                                            onPress={() => { setSelectedFm({ uid: inv?.fmUid, name: inv?.fmName, phone: inv?.fmPhone }); setFmDetailVisible(true); }}
                                        />
                                        <View style={styles.acceptRow}>
                                            <TouchableOpacity style={[styles.decideBtn, styles.acceptBtn]} onPress={() => handleTeamAccept(inv?.id)} activeOpacity={0.85}>
                                                <Text style={styles.decideText}>{t('Accept')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.decideBtn, styles.rejectBtn]} onPress={() => handleTeamReject(inv?.id)} activeOpacity={0.85}>
                                                <Text style={styles.decideText}>{t('Reject')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}

                <View style={styles.carouselSection}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Promotions & Offers')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={SCREEN_WIDTH * 0.82 + 16}
                        decelerationRate="fast"
                    >
                        <ReferAndEarnCard layout="carousel" onPress={() => onNavigate && onNavigate('ReferAndEarnScreen')} />
                        {mockPromos.map((_, index) => (
                            <PromoCard key={index} layout="carousel" />
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.carouselSection}>
                    <PopularProducts
                        products={products as any}
                        loading={productsLoading}
                        onViewAll={() => onNavigate && onNavigate('Marketplace')}
                        onSelectProduct={(product: any) => onNavigate && onNavigate('ProductDetailsScreen', { product })}
                    />
                </View>

                {/* ─── 8. EXPERT SUPPORT CARD ─── */}
                <View style={{ paddingTop: 22}}>
                    <SupportCard onNavigate={onNavigate} />
                </View>

            </ScrollView>
            <NotificationHistory visible={notificationsVisible} onClose={() => { setNotificationsVisible(false); refreshUnread(); }} />
            <TeamDetailModal
                visible={fmDetailVisible}
                title={selectedFm?.name || t('Fleet Manager Details')}
                rows={[
                    { label: 'Phone', value: selectedFm?.phone || '' },
                    { label: 'Email', value: selectedFm?.email || '' },
                ]}
                onClose={() => setFmDetailVisible(false)}
            />
            <TeamDetailModal
                visible={suggestionDetailVisible}
                title={selectedSuggestion?.name || t('Fleet Manager Details')}
                rows={[
                    { label: 'Phone', value: selectedSuggestion?.phone || '' },
                    { label: 'Distance', value: selectedSuggestion?.distanceKm !== undefined && selectedSuggestion?.distanceKm !== null ? `${selectedSuggestion.distanceKm} km away` : '' },
                    { label: 'Drones', value: String(selectedSuggestion?.dronesCount ?? selectedSuggestion?.totalDrones ?? 0) },
                    { label: 'Completed Missions', value: String(selectedSuggestion?.completedMissions ?? 0) },
                    { label: 'Rejected Missions', value: String(selectedSuggestion?.rejectedMissions ?? 0) },
                ]}
                onClose={() => setSuggestionDetailVisible(false)}
                primaryLabel={t('Send Join Request')}
                onPrimary={() => { setSuggestionDetailVisible(false); handleSuggestionJoin(selectedSuggestion); }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 84 },

    statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    statusCopy: { fontSize: 14, color: '#64748B' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    starEmoji: { fontSize: 15, marginRight: 6 },
    ratingText: { fontSize: 14, color: '#64748B' },
    ratingBold: { fontWeight: '600', color: '#1E293B' },

    // Duty toggle — identical to technician toggle (animated red/green)
    dutyToggleContainer: { height: 30, width: 86, borderRadius: 20, justifyContent: 'center' },
    dutyToggleTouchable: { flex: 1, justifyContent: 'center' },
    dutyToggleTextContainer: { justifyContent: 'center' },
    dutyToggleTextLeft: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 12 },
    dutyToggleTextRight: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', position: 'absolute', right: 12 },
    dutyToggleThumb: { width: 20, height: 20, borderRadius: 10, position: 'absolute', left: 0 },
    // Team tabs — identical to MissionScreen pill tabs
    tabContainer: { paddingHorizontal: 20, marginBottom: 10, marginTop: 4 },
    tabPillWrapper: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 100, padding: 4, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
    tabBtnActive: { backgroundColor: '#0B3A2C' },
    tabBtnText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    tabBtnTextActive: { color: '#FFFFFF' },
    emptyText: { fontSize: 14, color: '#64748B', paddingHorizontal: 20, paddingVertical: 8 },
    teamFullText: { fontSize: 14, color: '#64748B', lineHeight: 20 },

    sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 16 },
    carouselSectionTop: { paddingTop: 16 },
    carouselSection: { paddingTop: 24 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '500', color: '#0F172A', letterSpacing: -0.2 },
    sectionSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2, marginBottom: 16 },
    linkBlue: { fontSize: 14, color: '#0B3A2C', fontWeight: '500' },

    overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardViewToggle: { height: 36, width: 62, borderRadius: 18, backgroundColor: '#CBD5E1', justifyContent: 'center', paddingHorizontal: 5 },
    cardViewToggleActive: { backgroundColor: '#0B3A2C', alignItems: 'flex-end' },
    cardViewThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

    overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    overviewCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, ...(uiShadow.card as object) },
    overviewCardDark: { backgroundColor: '#0B3A2C', borderColor: '#0B3A2C' },
    cardTitleOnDark: { color: 'rgba(248, 250, 252, 0.78)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { marginRight: 6 },
    cardTitle: { fontSize: 13, color: '#475569' },
    cardValue: { fontSize: 28, fontWeight: '500', color: '#1E293B' },

    fleetCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, ...(uiShadow.card as object) },
    suggestCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, ...(uiShadow.card as object) },
    suggestTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    suggestAvatar: { width: 52, height: 52, borderRadius: 26 },
    suggestAvatarFallback: { backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' },
    suggestAvatarText: { fontSize: 20, fontWeight: '600', color: '#334155' },
    suggestName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    suggestPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },
    suggestDistance: { fontSize: 12, color: '#0B3A2C', marginTop: 2, fontWeight: '500' },
    suggestJoinBtn: { backgroundColor: '#0B3A2C', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    suggestJoinText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    fleetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    fleetManagerProfile: { flexDirection: 'row', alignItems: 'center' },
    fleetAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 10 },
    fleetName: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    fleetDronesLabel: { fontSize: 14, color: '#64748B', marginTop: 2 },
    boldDark: { fontWeight: '500', color: '#1E293B' },
    phonePillBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginLeft: 5 },
    fleetLocationRow: { flexDirection: 'row', alignItems: 'flex-start' },
    fleetAddressText: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 20 },
    phoneRow: {
        flexDirection: 'row', alignItems: 'center',
        //marginTop: 12, 
        gap: 8
    },
    phoneInput: { flex: 1, height: 48, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: '#1E293B', backgroundColor: '#FFFFFF' },
    joinBtn: { backgroundColor: '#0B3A2C', borderRadius: 10, paddingHorizontal: 18, height: 48, alignItems: 'center', justifyContent: 'center' },
    joinBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
    acceptRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    decideBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    acceptBtn: { backgroundColor: '#188A4E' },
    rejectBtn: { backgroundColor: '#C53030' },
    decideText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
});

export default HomeScreen;
