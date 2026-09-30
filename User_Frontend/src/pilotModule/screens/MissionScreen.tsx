import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Modal,
    TextInput,
    SafeAreaView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';

import ActiveMissionCard from '../components/ActiveMissionCard';
import AssignedMissionCard from '../components/AssignedMissionCard';
import PromoCard from '../components/PromoCard';
import SupportCard from '../../customerModule/components/SupportCard';

import RupeeIcon from '../../assets/rupeeIcon.svg';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import PhoneIcon from '../../assets/phone.svg';
import DropdownSelect from '../../common/DropdownSelect';
import DateTimePickerModal from '../../common/DateTimePickerModal';
import MediaUploadField from '../../common/MediaUploadField';
import { pilotApi, mapsApi } from '../../utils/api';
import { getCurrentPosition } from '../../utils/geolocation';
import { connectSocket } from '../../utils/socket';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const UpcomingMissionCard = ({ mission, onNavigate }: { mission?: any; onNavigate?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.genericCard}>
            <View style={styles.assignedCardHeader}>
                <Text style={styles.assignedCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Earnings: ')}<Text style={styles.darkTextMedium}>{mission?.estimatedEarnings || mission?.priceEstimation || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.darkTextMedium}>{t(formatDate(mission?.scheduledDate, locale))}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.darkTextMedium}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </View>
            <Text style={styles.etaLabel}>{t('ETA From Home: ')}<Text style={styles.darkTextMedium}>{mission?.eta || mission?.estimatedArrival || t('30 min')}</Text></Text>

            <View style={styles.actionBtnRow}>
                <View style={styles.startBtnDisabled}>
                    <Text style={styles.startBtnTextDisabled}>{t('Start Mission')}</Text>
                </View>
                <TouchableOpacity style={styles.viewDetailsBtnBlueOutlined} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('ActiveMissionDetails', { missionId: mission?.id, mission })}>
                    <Text style={styles.viewDetailsTextBlue}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const CompletedMissionCard = ({ mission }: { mission?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.genericCard}>
            <View style={styles.assignedCardHeader}>
                <Text style={styles.assignedCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
                <View style={styles.completedPill}>
                    <Text style={styles.completedPillText}>{t('View Details')}</Text>
                </View>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Earnings: ')}<Text style={styles.darkTextMedium}>{mission?.estimatedEarnings || mission?.priceEstimation || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.darkTextMedium}>{t(formatDate(mission?.scheduledDate, locale))}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.darkTextMedium}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </View>
            {/*<TouchableOpacity style={styles.viewDetailsFullBtn} activeOpacity={0.85}   >
             onPress={() => onNavigate && onNavigate('ActiveMissionDetails', { missionId: mission?.id, mission })}
            <Text style={styles.viewDetailsTextBlue}>View Details</Text>
        </TouchableOpacity>*/ }
        </View>
    );
};

const MissionsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'Completed'>('Active');
    const screenTabs = ['Active', 'Upcoming', 'Completed'];

    const [modalState, setModalState] = useState<'none' | 'new_ticket' | 'open_tickets' | 'ticket_details' | 'closed_tickets'>('none');
    const [ticketDetailStage, setTicketDetailStage] = useState(0);
    const [missions, setMissions] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);

    const loadIncomingRequests = useCallback(() => {
        pilotApi.getIncomingRequests().then((data: any) => {
            setIncomingRequests(Array.isArray(data) ? data : data?.items || data?.data || []);
        }).catch((error: any) => console.error('Failed to load pilot incoming requests', error));
    }, []);

    useEffect(() => {
        Promise.all([
            pilotApi.getMissions().catch(() => []),
            pilotApi.getIncomingRequests().catch(() => []),
            pilotApi.getRewards().catch(() => []),
        ]).then(([missionsData, incomingData, rewardsData]) => {
            setMissions(Array.isArray(missionsData) ? missionsData : missionsData?.items || missionsData?.data || []);
            setIncomingRequests(Array.isArray(incomingData) ? incomingData : incomingData?.items || incomingData?.data || []);
            setPromotions(Array.isArray(rewardsData) ? rewardsData : rewardsData?.items || rewardsData?.data || []);
        }).catch((error) => console.error('Failed to load pilot missions', error));
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
        });
        return () => {
            cancelled = true;
            if (sock) sock.off('mission:created', () => { });
        };
    }, [loadIncomingRequests]);

    // A booking is Active only on its scheduled day; accepted future/past
    // bookings stay Upcoming. Backend blocks 2 accepted same-date bookings.
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
    const upcomingMissions = useMemo(
        () => [
            ...incomingRequests.filter((item) => ['pending'].includes(item?.status)),
            ...missions.filter((item) => isLiveStatus(item?.status) && dayKey(item?.scheduledDate) !== todayKey),
        ],
        [missions, incomingRequests, todayKey],
    );
    const completedMissions = useMemo(() => missions.filter((item) => item?.status === 'completed' || item?.status === 'cancelled'), [missions]);

    const closeModal = () => setModalState('none');

    const openTicketDetails = () => {
        setTicketDetailStage(0);
        setModalState('ticket_details');
    };

    const advanceTicketStage = () => {
        setTicketDetailStage((prev) => Math.min(prev + 1, 5));
    };

    // ── Maintenance ticket form state ──────────────────────────────────
    const [profile, setProfile] = useState<any>(null);
    const [ticketForm, setTicketForm] = useState<any>({
        mainProblem: '',
        description: '',
        droneId: '',
        missionId: '',
        location: '',
        dateTime: '',
        media: '',
    });
    const [showDateTime, setShowDateTime] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    useEffect(() => {
        pilotApi.getProfile().catch(() => null).then((p: any) => setProfile(p || null));
    }, []);

    const fleetManagers = useMemo(
        () => profile?.fleetManagers || profile?.profileData?.fleetManagers || [],
        [profile],
    );
    const fleetManager = fleetManagers[0] || null;
    const fleetManagerUid = fleetManager?.uid || fleetManager?.id || fleetManager?.fleetManagerUid || '';
    const fleetManagerName = fleetManager?.name || fleetManager?.fleetManagerName || '';

    const allMissions = useMemo(() => [...missions, ...incomingRequests], [missions, incomingRequests]);

    const missionOptions = useMemo(
        () =>
            allMissions
                .filter((m) =>
                    ['pending', 'accepted', 'en_route', 'at_location', 'preflight', 'started', 'in_progress', 'completed'].includes(m?.status),
                )
                .map((m) => ({
                    value: m?.id || m?.bookingId || '',
                    label: `${m?.serviceType || m?.title || 'Mission'} • ${m?.id || m?.bookingId || ''} (${m?.status || ''})`,
                }))
                .filter((o) => o.value),
        [allMissions],
    );

    const droneOptions = useMemo(() => {
        const map = new Map<string, string>();
        allMissions.forEach((m) => {
            if (m?.droneId) {
                map.set(m.droneId, m.droneName ? `${m.droneName} (${m.droneId})` : m.droneId);
            }
        });
        return Array.from(map, ([value, label]) => ({ value, label }));
    }, [allMissions]);

    const updateTicketField = (key: string, value: string) =>
        setTicketForm((prev: any) => ({ ...prev, [key]: value }));

    const useCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
            const { latitude, longitude } = pos.coords;
            let address = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
            try {
                const res = await mapsApi.reverseGeocode(latitude, longitude);
                if (res?.address) address = res.address;
            } catch {
                // keep coordinates fallback
            }
            updateTicketField('location', address);
        } catch {
            Alert.alert(t('Location'), t('Could not get your current location.'));
        } finally {
            setLocationLoading(false);
        }
    };

    const submitTicket = async () => {
        const f = ticketForm;
        if (!f.mainProblem.trim() || !f.description.trim() || !f.droneId || !f.missionId || !f.location.trim() || !f.dateTime) {
            Alert.alert(t('Missing Fields'), t('Please fill in all mandatory fields (upload media is optional).'));
            return;
        }
        setSubmitting(true);
        try {
            await pilotApi.createMaintenanceTicket({
                droneId: f.droneId,
                category: f.mainProblem.trim(),
                description: f.description.trim(),
                priority: 'medium',
                missionId: f.missionId,
                location: f.location.trim(),
                dateTime: f.dateTime,
                fleetManagerUid,
                fleetManagerName,
                mediaUrls: f.media ? [f.media] : [],
            });
            Alert.alert(t('Ticket Submitted'), t('Your maintenance ticket has been submitted.'));
            setModalState('none');
            setTicketForm({ mainProblem: '', description: '', droneId: '', missionId: '', location: '', dateTime: '', media: '' });
        } catch (error) {
            console.error('Failed to create maintenance ticket', error);
            Alert.alert(t('Submission Failed'), (error as any)?.message || t('Could not submit the ticket.'));
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTimeForDisplay = (iso: string) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Static ticket data mirroring the reference designs, keyed by stage index (0-5)
    const ticketBase = {
        dateTime: '16 April 2026, 04:00 PM',
        location: 'Sector 12, Navi Mumbai, 421205',
        missionId: 'MS-123456',
        ticketId: 'TCK-DRN12JQ-120869',
        fleetManager: {
            name: 'John Smith',
            phone: '+44 7700 900123',
            email: 'john.smith@example.com',
            address: 'Radha Society, MG Road, Andheri East, 452136',
        },
        drone: {
            name: 'DJI Mavrick 1050',
            id: 'DRN-MH05-123456',
        },
        technician: {
            name: 'Technician Name',
            id: 'DRN-150-3JI',
        },
        ticketResolution: 'Solution/Service provided by the Technician',
        cost: { service: 800, part: 600, gst: 400, total: 1800 },
    };

    const ticketStatusByStage = [
        'Pending Fleet Manager Approval',
        'Assigning Technician',
        'Technician Assigned',
        'Technician In Transit',
        'Ticket Completed',
        'Ticket Closed',
    ];
    const ticketStatusColorByStage = ['#1E293B', '#1E293B', '#188A4E', '#188A4E', '#188A4E', '#1E293B'];

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" style={{ marginRight: 8 }} />
                <Text style={styles.pageTitle}>{t('Your Missions')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ─── 1. PILL TAB BAR ─── */}
                <View style={styles.tabContainer}>
                    <View style={styles.tabPillWrapper}>
                        {screenTabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                                    onPress={() => setActiveTab(tab as any)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                                        {t(tab)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ─── 2. DYNAMIC TAB CONTENT ─── */}
                <View style={styles.listSection}>
                    {activeTab === 'Active' && activeMissions.map((mission, i) => (
                        <ActiveMissionCard key={mission?.id || i} layout="list" onNavigate={onNavigate} mission={mission} />
                    ))}

                    {activeTab === 'Upcoming' && upcomingMissions.map((mission, i) => (
                        <UpcomingMissionCard key={mission?.id || i} mission={mission} onNavigate={onNavigate} />
                    ))}

                    {activeTab === 'Completed' && completedMissions.map((mission, i) => (
                        <CompletedMissionCard key={mission?.id || i} mission={mission} />
                    ))}
                </View>

                {/* ─── 3. ASSIGNED MISSIONS ─── */}
                <View style={styles.carouselSection}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 16 }]}>
                        {t('Assigned Missions ({{count}})', { count: incomingRequests.length })}
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={PEEK_WIDTH + 16}
                        decelerationRate="fast"
                    >
                        {incomingRequests.map((mission, index) => (
                            <AssignedMissionCard
                                key={mission?.id || index}
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

                {/* ─── 4. MANAGE YOUR SCHEDULE ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{t('Manage your Schedule')}</Text>
                    <View style={styles.calendarCard}>
                        <Text style={styles.calBigDate}>Mon, Aug 17</Text>
                        <View style={styles.calDivider} />
                        <View style={styles.calMonthRow}>
                            <Text style={styles.calMonthText}>August 2025  <Text style={{ fontSize: 10 }}>▼</Text></Text>
                            <View style={styles.calArrowsRow}>
                                <Text style={styles.calArrow}>{'<'}</Text>
                                <Text style={styles.calArrow}>{'>'}</Text>
                            </View>
                        </View>
                        <View style={styles.calDaysHeader}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <Text key={i} style={styles.calDayLabel}>{d}</Text>
                            ))}
                        </View>
                        <View style={styles.calGrid}>
                            <View style={styles.calCell} />
                            <View style={styles.calCell} />
                            <View style={styles.calCell}><Text style={styles.calNum}>1</Text></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>2</Text></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>3</Text></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>4</Text></View>
                            <View style={styles.calCell}><View style={styles.calNumActiveCircle}><Text style={styles.calNumWhite}>5</Text></View></View>
                            <View style={styles.calCell}><View style={styles.calNumRedCircle}><Text style={styles.calNumWhite}>6</Text></View></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>7</Text><View style={styles.calDotBlue} /></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>8</Text><View style={styles.calDotBlue} /></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>9</Text></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>10</Text></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>11</Text><View style={styles.calDotBlue} /></View>
                            <View style={styles.calCell}><Text style={styles.calNum}>12</Text><View style={styles.calDotBlue} /></View>
                        </View>
                        <View style={styles.calDivider} />
                        <View style={styles.calLegendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendCircleLg, { backgroundColor: '#0B3A2C' }]} />
                                <Text style={styles.legendTextBlue}>{t('Full Day\nActive')}</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendCircleLg, { backgroundColor: '#CBD5E1' }]} />
                                <Text style={styles.legendTextGray}>{t('Morning\nOff-Duty')}</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendCircleLg, { backgroundColor: '#CBD5E1' }]} />
                                <Text style={styles.legendTextGray}>{t('Evening\nOff-Duty')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ─── 5. TASKS FOR THE DAY ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <Text style={styles.tasksLabel}>{t('Tasks for the Day')}</Text>
                    <Text style={styles.tasksBold}>{t("Check Active Missions Section to View Today's Missions")}</Text>
                </View>

                {/* ─── 6. MAINTENANCE HISTORY ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{t('Maintenance History')}</Text>
                    <View style={styles.maintenanceRow}>
                        <TouchableOpacity
                            style={styles.maintenanceCard}
                            activeOpacity={0.85}
                            onPress={() => setModalState('open_tickets')}
                        >
                            <View style={styles.mCardHeader}>
                                <DroneIcon width={16} height={16} fill="#5A6478" style={{ marginRight: 6 }} />
                                <Text style={styles.mCardTitle}>{t('Open Tickets')}</Text>
                            </View>
                            <Text style={styles.mCardValue}>1</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.maintenanceCard}
                            activeOpacity={0.85}
                            onPress={() => setModalState('closed_tickets')}
                        >
                            <View style={styles.mCardHeader}>
                                <DroneIcon width={16} height={16} fill="#5A6478" style={{ marginRight: 6 }} />
                                <Text style={styles.mCardTitle}>{t('Closed Tickets')}</Text>
                            </View>
                            <Text style={styles.mCardValue}>{String(completedMissions.length).padStart(2, '0')}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.newTicketBtn}
                        activeOpacity={0.85}
                        onPress={() => setModalState('new_ticket')}
                    >
                        <View style={styles.plusCircle}>
                            <Text style={styles.plusIcon}>+</Text>
                        </View>
                        <Text style={styles.newTicketBtnText}>{t('New Maintenance Ticket')}</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── 7. PROMOTIONS & OFFERS ─── */}
                <View style={styles.carouselSection}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Promotions & Offers')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={PEEK_WIDTH + 16}
                        decelerationRate="fast"
                    >
                        {promotions.map((_, index) => (
                            <PromoCard key={index} layout="carousel" />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 8. EXPERT SUPPORT CARD ─── */}
                <View style={{ paddingTop: 22 }}>
                    <SupportCard onNavigate={onNavigate} />
                </View>

            </ScrollView>

            {/* MODALS UNCHANGED */}
            <Modal visible={modalState === 'new_ticket'} animationType="slide" onRequestClose={closeModal}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={closeModal} activeOpacity={0.7}>
                            <Text style={styles.backArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('New Maintenance Ticket')}</Text>
                    </View>
                    <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalContentPad}>
                            <Text style={styles.inputLabel}>{t('Main Problem')}<Text style={styles.reqStar}> *</Text></Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder={t('Enter the main problem')}
                                placeholderTextColor="#94A3B8"
                                value={ticketForm.mainProblem}
                                onChangeText={(val) => updateTicketField('mainProblem', val)}
                            />

                            <Text style={styles.inputLabel}>{t('Problem Description')}<Text style={styles.reqStar}> *</Text></Text>
                            <View style={styles.textAreaBox}>
                                <TextInput
                                    style={styles.textAreaInput}
                                    placeholder={t('Briefly describe the issue faced with the drone')}
                                    placeholderTextColor="#94A3B8"
                                    multiline={true}
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    value={ticketForm.description}
                                    onChangeText={(val) => updateTicketField('description', val)}
                                />
                            </View>

                            <DropdownSelect
                                label={t('Drone ID')}
                                required
                                value={ticketForm.droneId}
                                options={droneOptions}
                                placeholder={t('Select assigned drone')}
                                onSelect={(val) => updateTicketField('droneId', val)}
                            />

                            <DropdownSelect
                                label={t('Mission ID')}
                                required
                                value={ticketForm.missionId}
                                options={missionOptions}
                                placeholder={t('Select mission')}
                                onSelect={(val) => updateTicketField('missionId', val)}
                            />

                            <Text style={styles.inputLabel}>{t('Fleet Manager ID')}<Text style={styles.reqStar}> *</Text></Text>
                            <View style={styles.prefillBox}>
                                <Text style={styles.prefillText}>{fleetManagerUid || t('Not assigned')}</Text>
                            </View>

                            <Text style={styles.inputLabel}>{t('Fleet Manager Name')}<Text style={styles.reqStar}> *</Text></Text>
                            <View style={styles.prefillBox}>
                                <Text style={styles.prefillText}>{fleetManagerName || t('Not assigned')}</Text>
                            </View>

                            <Text style={styles.inputLabel}>{t('Location')}<Text style={styles.reqStar}> *</Text></Text>
                            <View style={styles.locationRow}>
                                <TextInput
                                    style={[styles.formInput, { flex: 1 }]}
                                    placeholder={t('Where is the ticket submitted from?')}
                                    placeholderTextColor="#94A3B8"
                                    value={ticketForm.location}
                                    onChangeText={(val) => updateTicketField('location', val)}
                                />
                                <TouchableOpacity style={styles.currentLocBtn} onPress={useCurrentLocation} disabled={locationLoading}>
                                    {locationLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.currentLocText}>{t('Current Location')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>{t('Date & Time')}<Text style={styles.reqStar}> *</Text></Text>
                            <TouchableOpacity style={styles.formInput} onPress={() => setShowDateTime(true)} activeOpacity={0.85}>
                                <Text style={ticketForm.dateTime ? styles.prefillText : styles.placeholderText}>
                                    {ticketForm.dateTime ? formatDateTimeForDisplay(ticketForm.dateTime) : t('Select date and time')}
                                </Text>
                            </TouchableOpacity>

                            <MediaUploadField
                                value={ticketForm.media}
                                onChange={(val) => updateTicketField('media', val)}
                                label={t('Upload Media (Optional)')}
                            />
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooterFixed}>
                        <TouchableOpacity style={styles.submitTicketBtn} activeOpacity={0.9} onPress={submitTicket} disabled={submitting}>
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitTicketBtnText}>{t('Submit Ticket')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <DateTimePickerModal
                        visible={showDateTime}
                        initialValue={ticketForm.dateTime || null}
                        onConfirm={(iso) => {
                            updateTicketField('dateTime', iso);
                            setShowDateTime(false);
                        }}
                        onClose={() => setShowDateTime(false)}
                    />
                </SafeAreaView>
            </Modal>

            <Modal visible={modalState === 'open_tickets'} animationType="slide" onRequestClose={closeModal}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={closeModal} activeOpacity={0.7}>
                            <Text style={styles.backArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('Maintenance Tickets (1)')}</Text>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalContentPad}>
                            <View style={styles.openTicketListCard}>
                                <View style={styles.openTicketListTopRow}>
                                    <Text style={styles.openTicketListTitle}>{t('Main Problem')}</Text>
                                    <TouchableOpacity activeOpacity={0.7} onPress={openTicketDetails}>
                                        <Text style={styles.openTicketListViewDetails}>{t('View Details')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.openTicketListDesc}>{t('Problem Description')}</Text>

                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Drone ID: ')}<Text style={styles.openTicketListValue}>DRN-JKGUB-6280</Text></Text>
                                </View>
                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Fleet Manager: ')}<Text style={styles.openTicketListValue}>Fleet Manager Name</Text></Text>
                                </View>
                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Ticket Status: ')}<Text style={styles.openTicketListValue}>Current Ticket Status</Text></Text>
                                </View>
                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Location: ')}<Text style={styles.openTicketListValue}>Location</Text></Text>
                                </View>
                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Date & Time: ')}<Text style={styles.openTicketListValue}>dd-mm-yyy, 00:00 AA</Text></Text>
                                </View>
                                <View style={styles.openTicketListRow}>
                                    <Text style={styles.openTicketListLabel}>{t('Mission ID: ')}<Text style={styles.openTicketListValue}>Mission ID</Text></Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={modalState === 'ticket_details'} animationType="slide" onRequestClose={() => setModalState('open_tickets')}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setModalState('open_tickets')} activeOpacity={0.7}>
                            <Text style={styles.backArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('Maintenance Ticket Details')}</Text>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        <TouchableOpacity
                            style={styles.modalContentPad}
                            activeOpacity={1}
                            onPress={advanceTicketStage}
                        >
                            {/* Main Problem */}
                            <Text style={styles.tdMainProblemTitle}>{t('Main Problem')}</Text>
                            <Text style={styles.tdMainProblemDesc}>{t('Main Problem Description')}</Text>
                            <Text style={styles.tdMetaLine}>{t('Date & Time: ')}<Text style={styles.tdMetaBold}>{ticketBase.dateTime}</Text></Text>
                            <Text style={styles.tdMetaLine}>{t('Location: ')}<Text style={styles.tdMetaBold}>{ticketBase.location}</Text></Text>
                            <Text style={styles.tdMetaLine}>{t('Mission ID: ')}<Text style={styles.tdMetaBold}>{ticketBase.missionId}</Text></Text>

                            <View style={styles.tdDivider} />

                            {/* Ticket Status */}
                            <Text style={styles.tdMetaLine}>
                                {t('Ticket Status: ')}
                                <Text style={[styles.tdStatusBold, { color: ticketStatusColorByStage[ticketDetailStage] }]}>
                                    {t(ticketStatusByStage[ticketDetailStage])}
                                </Text>
                            </Text>
                            <Text style={styles.tdMetaLine}>{t('Ticket ID: ')}<Text style={styles.tdMetaBold}>{ticketBase.ticketId}</Text></Text>

                            {ticketDetailStage >= 1 && (
                                <>
                                    <Text style={styles.tdMetaLine}>{t('Technician Assigned: ')}<Text style={styles.tdMetaBold}>{ticketBase.technician.name}</Text></Text>
                                    <Text style={styles.tdMetaLine}>{t('Technician ID: ')}<Text style={styles.tdMetaBold}>{ticketBase.technician.id}</Text></Text>
                                </>
                            )}

                            {ticketDetailStage === 3 && (
                                <>
                                    <View style={styles.tdMapPlaceholder}>
                                        <View style={styles.tdMapLiveBadge}>
                                            <Text style={styles.tdMapLiveBadgeText}>{t('Live Tracking')}</Text>
                                        </View>
                                        <Text style={styles.tdMapPlaceholderText}>{t('Map Preview')}</Text>
                                    </View>
                                    <Text style={styles.tdMetaLine}>{t('Technician will reach in ')}<Text style={styles.tdMetaBold}>25 min</Text></Text>
                                </>
                            )}

                            {ticketDetailStage >= 4 && (
                                <>
                                    <Text style={styles.tdMetaLine}>{t('Ticket Resolution: ')}<Text style={styles.tdMetaBold}>{ticketBase.ticketResolution}</Text></Text>

                                    <View style={styles.tdDivider} />
                                    <Text style={styles.tdSectionHeader}>{t('Submitted Ticket Evidence by Technician')}</Text>
                                    <View style={styles.tdEvidenceRow}>
                                        <View style={styles.tdEvidenceThumb}><DroneIcon width={22} height={22} fill="#94A3B8" /></View>
                                        <View style={styles.tdEvidenceThumb}><DroneIcon width={22} height={22} fill="#94A3B8" /></View>
                                        <View style={styles.tdEvidenceThumb}><DroneIcon width={22} height={22} fill="#94A3B8" /></View>
                                    </View>
                                </>
                            )}

                            <View style={styles.tdDivider} />

                            {/* Fleet Manager Details */}
                            <View style={styles.rowSpaceBetween}>
                                <Text style={styles.tdSectionHeader}>{t('Fleet Manager Details')}</Text>
                                <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.8} onPress={(e) => e.stopPropagation()}>
                                    <PhoneIcon width={20} height={20} fill="#1E293B" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.tdMetaLine}>{t('Name')}</Text>
                            <Text style={styles.tdMetaBoldStandalone}>{ticketBase.fleetManager.name}</Text>
                            <Text style={styles.tdMetaLine}>{t('Phone')}</Text>
                            <Text style={styles.tdMetaBoldStandalone}>{ticketBase.fleetManager.phone}</Text>
                            <Text style={styles.tdMetaLine}>{t('Email')}</Text>
                            <Text style={styles.tdMetaBoldStandalone}>{ticketBase.fleetManager.email}</Text>
                            <Text style={styles.tdMetaLine}>{t('Address')}</Text>
                            <Text style={styles.tdAddressUnderline}>{ticketBase.fleetManager.address}</Text>

                            <View style={styles.tdDivider} />

                            {/* Drone Details */}
                            <Text style={styles.tdSectionHeader}>{t('Drone Details')}</Text>
                            <Text style={styles.tdMetaLine}>{t('Name')}</Text>
                            <Text style={styles.tdMetaBoldStandalone}>{ticketBase.drone.name}</Text>
                            <Text style={styles.tdMetaLine}>{t('Drone ID')}</Text>
                            <Text style={styles.tdMetaBoldStandalone}>{ticketBase.drone.id}</Text>

                            <View style={styles.tdDivider} />

                            {/* Media */}
                            <Text style={styles.tdSectionHeader}>{t('Media')}</Text>
                            <View style={styles.tdEvidenceRow}>
                                <View style={styles.tdEvidenceThumb}><DroneIcon width={22} height={22} fill="#94A3B8" /></View>
                                <View style={styles.tdEvidenceThumb}><DroneIcon width={22} height={22} fill="#94A3B8" /></View>
                            </View>

                            {ticketDetailStage >= 4 && (
                                <>
                                    <View style={styles.tdDivider} />
                                    <Text style={styles.tdSectionHeader}>{t('Service Cost Breakdown')}</Text>
                                    <View style={styles.tdCostRow}>
                                        <Text style={styles.tdCostLabel}>{t('Service Price')}</Text>
                                        <Text style={styles.tdCostValue}>₹ {ticketBase.cost.service}</Text>
                                    </View>
                                    <View style={styles.tdCostRow}>
                                        <Text style={styles.tdCostLabel}>{t('Drone Part Cost')}</Text>
                                        <Text style={styles.tdCostValue}>₹ {ticketBase.cost.part}</Text>
                                    </View>
                                    <View style={styles.tdCostRow}>
                                        <Text style={styles.tdCostLabel}>{t('GST (18%)')}</Text>
                                        <Text style={styles.tdCostValue}>₹ {ticketBase.cost.gst}</Text>
                                    </View>
                                    <View style={styles.tdDivider} />
                                    <View style={styles.tdCostRow}>
                                        <Text style={styles.tdCostTotalLabel}>{t('Total')}</Text>
                                        <Text style={styles.tdCostTotalValue}>₹ {ticketBase.cost.total.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.tdDivider} />
                                    <Text style={styles.tdSectionHeader}>{t('Payment Status:')}</Text>
                                    {ticketDetailStage === 4 ? (
                                        <Text style={styles.tdPaymentPending}>{t('Payment Pending')}</Text>
                                    ) : (
                                        <Text style={styles.tdPaymentCompleted}>{t('Payment Completed')}</Text>
                                    )}
                                    {ticketDetailStage === 4 && (
                                        <TouchableOpacity
                                            style={styles.tdCompletePaymentBtn}
                                            activeOpacity={0.9}
                                            onPress={(e) => { e.stopPropagation(); advanceTicketStage(); }}
                                        >
                                            <Text style={styles.tdCompletePaymentBtnText}>{t('Complete Payment')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal visible={modalState === 'closed_tickets'} animationType="slide" onRequestClose={closeModal}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={closeModal} activeOpacity={0.7}>
                            <Text style={styles.backArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('Closed Tickets')}</Text>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.modalContentPad}>
                            {completedMissions.map((mission, index) => (
                                <View key={mission?.id || index} style={styles.ticketCard}>
                                    <View style={styles.ticketCardHeader}>
                                        <View style={styles.ticketTitleRow}>
                                            <DroneIcon width={16} height={16} fill="#5A6478" style={{ marginRight: 8 }} />
                                            <Text style={styles.ticketTitleText}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
                                        </View>
                                        <Text style={styles.ticketSubText}>{t('ID: ')}{mission?.id || t('N/A')}</Text>
                                        <Text style={styles.ticketSubText}>{t('Date: ')}{t(formatDate(mission?.scheduledDate, locale))}</Text>
                                    </View>
                                    <View style={styles.ticketPillGreen}>
                                        <Text style={styles.greenDotSmall}>●</Text>
                                        <Text style={styles.greenPillText}>{t('Completed')}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.viewDetailsFullBtn} activeOpacity={0.8} onPress={() => onNavigate && onNavigate('ActiveMissionDetails', { missionId: mission?.id, mission })}>
                                        <Text style={styles.viewDetailsTextBlue}>{t('View Details')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 84 },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    tabContainer: { paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
    tabPillWrapper: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 100, padding: 4, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
    tabBtnActive: { backgroundColor: '#1E293B' },
    tabBtnText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    tabBtnTextActive: { color: '#FFFFFF' },
    listSection: { paddingHorizontal: 20 },
    carouselSection: { paddingTop: 24 },
    sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
    genericCard: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    assignedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    assignedCardTitle: { fontSize: 18, fontWeight: '600', color: '#0B3A2C' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, fontWeight: '400', color: '#64748B' },
    darkTextMedium: { color: '#1E293B', fontWeight: '500' },
    etaLabel: { fontSize: 15, fontWeight: '400', color: '#64748B', marginTop: 10 },
    completedPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
    completedPillText: { color: '#0B3A2C', fontSize: 14, fontWeight: '600' },
    actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    startBtnDisabled: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    startBtnTextDisabled: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    viewDetailsBtnBlueOutlined: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    viewDetailsTextBlue: { color: '#0B3A2C', fontSize: 16, fontWeight: '500' },
    viewDetailsFullBtn: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    calBigDate: { fontSize: 22, fontWeight: '600', color: '#1E293B', marginBottom: 16 },
    calDivider: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 16 },
    calMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calMonthText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    calArrowsRow: { flexDirection: 'row', gap: 24 },
    calArrow: { fontSize: 16, fontWeight: '500', color: '#64748B' },
    calDaysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    calDayLabel: { width: '14.28%', textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#1E293B' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 12 },
    calCell: { width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'center' },
    calNum: { fontSize: 15, fontWeight: '400', color: '#1E293B' },
    calNumWhite: { fontSize: 15, fontWeight: '400', color: '#FFFFFF' },
    calNumActiveCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0B3A2C', alignItems: 'center', justifyContent: 'center' },
    calNumRedCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
    calDotBlue: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0B3A2C', marginTop: 2 },
    calLegendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
    legendItem: { alignItems: 'center' },
    legendCircleLg: { width: 44, height: 44, borderRadius: 22, marginBottom: 8 },
    legendTextBlue: { fontSize: 12, fontWeight: '500', color: '#0B3A2C', textAlign: 'center' },
    legendTextGray: { fontSize: 12, fontWeight: '500', color: '#64748B', textAlign: 'center' },
    tasksLabel: { fontSize: 15, fontWeight: '400', color: '#64748B', marginBottom: 8 },
    tasksBold: { fontSize: 18, fontWeight: '500', color: '#1E293B', lineHeight: 26 },
    maintenanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    maintenanceCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 20 },
    mCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    mCardTitle: { fontSize: 14, fontWeight: '500', color: '#64748B' },
    mCardValue: { fontSize: 32, fontWeight: '600', color: '#1E293B', marginTop: 4 },
    newTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 100, borderWidth: 1.5, borderColor: '#5A6478', paddingVertical: 16, marginTop: 16 },
    plusCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#5A6478', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    plusIcon: { fontSize: 14, fontWeight: '500', color: '#64748B', marginTop: -2 },
    newTicketBtnText: { fontSize: 16, fontWeight: '500', color: '#64748B' },
    modalContainer: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? 24 : 0 },
    modalScroll: { flex: 1 },
    modalContentPad: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 60 },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16, justifyContent: 'center' },
    backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
    modalPageTitle: { fontSize: 20, fontWeight: '600', color: '#1E293B' },
    inputLabel: { fontSize: 15, fontWeight: '500', color: '#475569', marginBottom: 8, marginTop: 16 },
    reqStar: { color: '#EF4444' },
    dropdownInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, backgroundColor: '#FFFFFF' },
    dropdownText: { fontSize: 16, fontWeight: '400', color: '#475569' },
    dropdownChevron: { fontSize: 20, color: '#64748B', marginTop: -4 },
    formInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, backgroundColor: '#FFFFFF', fontSize: 15, color: '#0F172A' },
    prefillBox: { justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, backgroundColor: '#F4F6F8' },
    prefillText: { fontSize: 15, fontWeight: '400', color: '#0F172A' },
    placeholderText: { fontSize: 15, fontWeight: '400', color: '#94A3B8' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    currentLocBtn: { backgroundColor: '#0B3A2C', borderRadius: 12, paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
    currentLocText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
    textAreaBox: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', height: 120 },
    textAreaInput: { flex: 1, fontSize: 16, fontWeight: '400', color: '#1E293B' },
    uploadBox: { borderWidth: 1.5, borderColor: '#94A3B8', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8' },
    uploadTextDark: { fontSize: 15, fontWeight: '500', color: '#475569', marginBottom: 4 },
    uploadTextLight: { fontSize: 13, fontWeight: '400', color: '#64748B' },
    modalFooterFixed: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    submitTicketBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    submitTicketBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    ticketCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    ticketCardHeader: { marginBottom: 16 },
    ticketTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    ticketTitleText: { fontSize: 18, fontWeight: '500', color: '#0B3A2C' },
    ticketSubText: { fontSize: 14, fontWeight: '400', color: '#64748B', marginBottom: 2 },
    ticketPillOrange: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20 },
    ticketPillOrangeInline: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
    orangeDot: { color: '#D97706', fontSize: 10, marginRight: 6 },
    orangePillText: { color: '#D97706', fontSize: 13, fontWeight: '500' },
    ticketPillGreen: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20 },
    greenDotSmall: { color: '#188A4E', fontSize: 10, marginRight: 6 },
    greenPillText: { color: '#188A4E', fontSize: 13, fontWeight: '500' },
    infoBannerBlue: { flexDirection: 'row', backgroundColor: '#E7F4EC', borderRadius: 16, padding: 16, alignItems: 'flex-start', marginBottom: 24 },
    infoIcon: { fontSize: 16, marginRight: 10, marginTop: 2 },
    infoBannerText: { flex: 1, fontSize: 13, fontWeight: '400', color: '#0B3A2C', lineHeight: 20 },
    flatSectionTight: { paddingVertical: 8 },
    dividerTight: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
    sectionHeaderDarkTight: { fontSize: 18, fontWeight: '500', color: '#1E293B', marginBottom: 12 },
    dataBlockTight: { marginBottom: 12 },
    dataLabel: { fontSize: 15, fontWeight: '400', color: '#64748B', marginBottom: 4 },
    dataValue: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    phonePillBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' },
    mediaThumbnailBox: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    mediaThumbnailImage: { width: '100%', height: '100%' },

    // ── Open Tickets list card (image ref: 0212) ──
    openTicketListCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#CBD5E1', padding: 24 },
    openTicketListTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    openTicketListTitle: { fontSize: 20, fontWeight: '500', color: '#0B3A2C' },
    openTicketListViewDetails: { fontSize: 15, fontWeight: '500', color: '#0B3A2C' },
    openTicketListDesc: { fontSize: 15, fontWeight: '400', color: '#1E293B', marginBottom: 16 },
    openTicketListRow: { marginBottom: 10 },
    openTicketListLabel: { fontSize: 15, fontWeight: '400', color: '#64748B' },
    openTicketListValue: { fontSize: 15, fontWeight: '500', color: '#1E293B' },

    // ── Ticket Details (image refs: 3827, 8925, 0980, 0316, 1237, 5214) ──
    tdMainProblemTitle: { fontSize: 20, fontWeight: '500', color: '#0B3A2C', marginBottom: 4 },
    tdMainProblemDesc: { fontSize: 15, fontWeight: '400', color: '#1E293B', marginBottom: 10 },
    tdMetaLine: { fontSize: 15, fontWeight: '400', color: '#64748B', marginBottom: 6 },
    tdMetaBold: { color: '#1E293B', fontWeight: '500' },
    tdMetaBoldStandalone: { fontSize: 16, fontWeight: '500', color: '#1E293B', marginBottom: 10 },
    tdAddressUnderline: { fontSize: 16, fontWeight: '500', color: '#1E293B', textDecorationLine: 'underline', marginBottom: 10 },
    tdStatusBold: { fontWeight: '500' },
    tdDivider: { height: 1, backgroundColor: '#E2E8F0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', marginVertical: 16 },
    tdSectionHeader: { fontSize: 17, fontWeight: '500', color: '#1E293B', marginBottom: 12 },
    tdEvidenceRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    tdEvidenceThumb: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center' },
    tdMapPlaceholder: { height: 180, borderRadius: 16, backgroundColor: '#E8F5EC', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 10, overflow: 'hidden' },
    tdMapLiveBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
    tdMapLiveBadgeText: { fontSize: 12, fontWeight: '500', color: '#1E293B' },
    tdMapPlaceholderText: { fontSize: 14, fontWeight: '400', color: '#64748B' },
    tdCostRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    tdCostLabel: { fontSize: 15, fontWeight: '400', color: '#64748B' },
    tdCostValue: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
    tdCostTotalLabel: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    tdCostTotalValue: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    tdPaymentPending: { fontSize: 16, fontWeight: '500', color: '#B91C1C', marginBottom: 16 },
    tdPaymentCompleted: { fontSize: 16, fontWeight: '500', color: '#188A4E', marginBottom: 16 },
    tdCompletePaymentBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    tdCompletePaymentBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

export default MissionsScreen;