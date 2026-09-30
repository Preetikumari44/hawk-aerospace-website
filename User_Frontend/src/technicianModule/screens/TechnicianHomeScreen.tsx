import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Asset Imports
import RupeeIcon from '../../assets/rupeeIcon.svg';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import CardViewIcon from '../../assets/CardView.svg';
import CalendarIcon from '../../assets/calendar.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import GraphIcon from '../../assets/GraphLinearIcon.svg';

// Component Imports
import TechnicianHeader from '../components/TechnicianHeader';
import ActiveTicketCard from '../components/ActiveTicketCard';
import NextTicketCard from '../components/NextTicketCard';
import IncomingTicketCard from '../components/IncomingTicketCard';

import SupportCard from '../../customerModule/components/SupportCard';
import PromoCard from '../../pilotModule/components/PromoCard';
import ReferAndEarnCard from '../../components/ReferAndEarnCard';
import PopularProducts from '../../customerModule/components/PopularProducts';
import DEMO_PRODUCTS from '../../customerModule/constants/demoProducts';
import { IncomingDetailsModal, IncomingViewAllModal } from '../components/IncomingModals';
import NotificationHistory from '../../common/NotificationHistory';
import { useUnreadNotifications } from '../../common/useUnreadNotifications';
import { customerApi, technicianApi } from '../../utils/api';
import { useLanguage } from '../../i18n';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const RejectedTicketCard = ({ ticket, onAccept, onViewDetails }: { ticket?: any; onAccept?: () => void; onViewDetails?: () => void }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.rejectedCardOutline}>
            <View style={styles.cardHeaderInline}>
                <Text style={styles.rejectedMainProblemText}>{t(ticket?.title || ticket?.mainProblem || 'Rejected Ticket')}</Text>
                <TouchableOpacity onPress={onViewDetails}><Text style={styles.linkText}>{t('View Details')}</Text></TouchableOpacity>
            </View>
            <View style={styles.iconRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Est. Earnings: ')} <Text style={styles.darkText}>{t(ticket?.estimatedEarnings || ticket?.amount || 'N/A')}</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Date: ')} <Text style={styles.darkText}>{t(formatDate(ticket?.scheduledDate || ticket?.date, locale))}</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText} numberOfLines={1}>{t(ticket?.address?.line1 || ticket?.address || ticket?.location?.address || 'Location pending')}</Text>
            </View>
            <Text style={styles.etaLabel}>{t('ETA From Home: ')} <Text style={styles.darkText}>{t(ticket?.eta || ticket?.estimatedArrival || '45 min')}</Text></Text>
            <TouchableOpacity style={styles.accpetBtnSolid} activeOpacity={0.85} onPress={onAccept}>
                <Text style={styles.accpetBtnText}>{t('Accpet')}</Text>
            </TouchableOpacity>
        </View>
    );
};
interface StatusToggleProps {
    isActive: boolean;
    onToggle: () => void;
}

const AnimatedStatusToggle: React.FC<StatusToggleProps> = ({ isActive, onToggle }) => {
    const { t, locale } = useLanguage();
    const toggleAnim = React.useRef(new Animated.Value(isActive ? 1 : 0)).current;

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
        outputRange: ['#B91C1C', '#188A4E'] // Red for Off-Duty, Green for Active
    });

    const thumbTranslateX = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 60] // Adjust based on toggle width
    });

    const thumbColor = toggleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#FFD9D9', '#FFFFFF'] // Pinkish thumb for Off-Duty, White for Active
    });

    return (
        <Animated.View style={[styles.customToggleContainer, { backgroundColor }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onToggle}
                style={styles.toggleTouchable}
            >
                <View style={styles.toggleTextContainer}>
                    {isActive ? (
                        <Text style={styles.toggleTextLeft}>{t('Active')}</Text>
                    ) : (
                        <Text style={styles.toggleTextRight}>{t('Off-Duty')}</Text>
                    )}
                </View>
                <Animated.View
                    style={[
                        styles.customToggleThumb,
                        { transform: [{ translateX: thumbTranslateX }], backgroundColor: thumbColor }
                    ]}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};

const TechnicianHomeScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [isActive, setIsActive] = useState(true);
    const [cardView, setCardView] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [incomingTickets, setIncomingTickets] = useState<any[]>([]);
    const [rejectedTickets, setRejectedTickets] = useState<any[]>([]);
    const [earnings, setEarnings] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [accountUser, setAccountUser] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    const [isRejectedModalVisible, setRejectedModalVisible] = useState(false);
    const [isIncomingDetailsVisible, setIncomingDetailsVisible] = useState(false);
    const [isIncomingViewAllVisible, setIncomingViewAllVisible] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const { unreadCount, refresh: refreshUnread } = useUnreadNotifications(true);

    // Canonical account doc (/users/me) owns the profile photo edited in
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
            technicianApi.getProfile().catch(() => null),
            technicianApi.getTickets().catch(() => []),
            technicianApi.getIncomingTickets().catch(() => []),
            technicianApi.getRejectedTickets().catch(() => []),
            technicianApi.getEarnings().catch(() => null),
        ]).then(([profileData, ticketsData, incomingData, rejectedData, earningsData]) => {
            setProfile(profileData);
            setTickets(Array.isArray(ticketsData) ? ticketsData : ticketsData?.items || ticketsData?.data || []);
            setIncomingTickets(Array.isArray(incomingData) ? incomingData : incomingData?.items || incomingData?.data || []);
            setRejectedTickets(Array.isArray(rejectedData) ? rejectedData : rejectedData?.items || rejectedData?.data || []);
            setEarnings(earningsData);
        }).catch((error) => console.error('Failed to load technician home data', error));

        customerApi.getProducts()
            .then((productResponse: any) => {
                const apiItems = Array.isArray(productResponse)
                    ? productResponse
                    : productResponse?.items || productResponse?.data || productResponse?.products || [];
                const items = apiItems.length ? apiItems : DEMO_PRODUCTS;
                setProducts(items.slice(0, 5));
                setProductsLoading(false);
            })
            .catch(() => {
                setProducts(DEMO_PRODUCTS.slice(0, 5));
                setProductsLoading(false);
            });
    }, []);

    const activeTickets = useMemo(() => tickets.filter((ticket) => ['accepted', 'in_progress', 'repairing'].includes(ticket?.status)), [tickets]);
    const upcomingTickets = useMemo(() => tickets.filter((ticket) => ['assigned', 'scheduled', 'pending'].includes(ticket?.status)), [tickets]);
    const completedTickets = useMemo(() => tickets.filter((ticket) => ticket?.status === 'completed'), [tickets]);

    return (
        <View style={styles.container}>
            <TechnicianHeader userName={t(profile?.name || profile?.fullName || 'Technician')} photoUrl={headerPhotoUrl} onNotification={() => setNotificationsVisible(true)} unreadCount={unreadCount} />

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* ─── 5a. PROFILE STATUS & RATING ─── */}
                <View style={styles.statusRow}>
                    <AnimatedStatusToggle
                        isActive={isActive}
                        onToggle={() => setIsActive(!isActive)}
                    />
                    <Text style={styles.statusCopy}>
                        {t('You are ')}{isActive ? t('Active Full Day') : t('Inactive')}
                    </Text>
                </View>

                <View style={styles.ratingRow}>
                    <Text style={styles.starEmoji}>⭐</Text>
                    <Text style={styles.ratingText}>
                        {t('Your current rating on the app is ')} <Text style={styles.ratingBold}>{profile?.rating || profile?.averageRating || '0.0'} ({profile?.ratingCount || '0'})</Text>
                    </Text>
                </View>

                {/* ─── 5b. OVERVIEW CONTAINER ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <View style={styles.overviewHeader}>
                        <Text style={styles.sectionTitle}>{t('Overview')}</Text>
                        <TouchableOpacity
                            style={[styles.cardViewToggle, cardView && styles.cardViewToggleActive]}
                            onPress={() => setCardView(!cardView)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardViewThumb}>
                                {/* Swapping icons based on toggled state while keeping background static */}
                                {cardView ? (
                                    <CardViewIcon width={16} height={16} />
                                ) : (
                                    <GraphIcon width={16} height={16} />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.sectionSubtitle}>{t('Card View')}</Text>

                    {cardView && (
                        <View style={styles.overviewGrid}>
                            <TouchableOpacity style={styles.overviewCard} onPress={() => onNavigate('Earnings')} activeOpacity={0.8}>
                                <View style={styles.cardHeader}><RupeeIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} /><Text style={styles.cardTitle}>{t('Total Earnings')}</Text></View>
                                <Text style={[styles.cardValue, { color: '#0B3A2C' }]}>{earnings?.totalEarnings || earnings?.total || '0'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overviewCard} onPress={() => onNavigate('Repairs')} activeOpacity={0.8}>
                                <View style={styles.cardHeader}><DroneIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} /><Text style={styles.cardTitle}>{t('Total Repairs')}</Text></View>
                                <Text style={styles.cardValue}>{completedTickets.length}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overviewCard} onPress={() => onNavigate('Repairs', { initialTab: 'Upcoming' })} activeOpacity={0.8}>
                                <View style={styles.cardHeader}><DroneIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} /><Text style={styles.cardTitle}>{t('Upcoming Tickets')}</Text></View>
                                <Text style={styles.cardValue}>{upcomingTickets.length}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overviewCard} onPress={() => setRejectedModalVisible(true)} activeOpacity={0.8}>
                                <View style={styles.cardHeader}><DroneIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} /><Text style={styles.cardTitle}>{t('Rejected Tickets')}</Text></View>
                                <Text style={styles.cardValue}>{rejectedTickets.length}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ─── 5c. ACTIVE TICKET CARD CAROUSEL ─── */}
                <View style={styles.carouselSectionTop}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Active Ticket')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={SCREEN_WIDTH - 40 + 16}
                        decelerationRate="fast"
                    >
                        {activeTickets.slice(0, 2).map((ticket, index) => (
                            <ActiveTicketCard
                                key={index}
                                ticket={ticket}
                                onStartRepair={() => technicianApi.updateTicketStage(ticket.id, { stage: 'in_progress' }).catch((error: any) => console.error('Failed to start repair', error))}
                                onViewDetails={() => onNavigate && onNavigate('ActiveTicketDetails', { ticketId: ticket.id, ticket })}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5d. NEXT TICKET CARD CAROUSEL ─── */}
                <View style={styles.carouselSection}>
                    <Text style={[styles.sectionTitle, { marginLeft: 20, marginBottom: 12 }]}>{t('Next Ticket')}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={SCREEN_WIDTH * 0.82 + 16}
                        decelerationRate="fast"
                    >
                        {upcomingTickets.map((ticket, index) => (
                            <NextTicketCard
                                key={index}
                                ticket={ticket}
                                onStartTransit={() => technicianApi.acceptTicket(ticket.id).catch((error: any) => console.error('Failed to accept ticket', error))}
                                onViewDetails={() => onNavigate && onNavigate('ActiveTicketDetails', { ticketId: ticket.id, ticket })}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5e. INCOMING TICKET CARD CAROUSEL ─── */}
                <View style={styles.carouselSection}>
                    <View style={[styles.sectionHeaderRow, { paddingHorizontal: 20 }]}>
                        <Text style={styles.sectionTitle}>{t('Incoming Tickets ({{count}})', { count: incomingTickets.length })}</Text>
                        <TouchableOpacity onPress={() => setIncomingViewAllVisible(true)}><Text style={styles.linkBlue}>{t('View All')}</Text></TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
                        snapToInterval={SCREEN_WIDTH * 0.82 + 16}
                        decelerationRate="fast"
                    >
                        {incomingTickets.map((ticket, index) => (
                            <IncomingTicketCard
                                key={index}
                                ticket={ticket}
                                onAccept={() => technicianApi.acceptTicket(ticket.id).catch((error: any) => console.error('Failed to accept ticket', error))}
                                onReject={() => technicianApi.rejectTicket(ticket.id, { reason: 'Rejected from app' }).catch((error: any) => console.error('Failed to reject ticket', error))}
                                onViewDetails={() => setIncomingDetailsVisible(true)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5f. POPULAR PRODUCTS ─── */}
                <View style={styles.carouselSection}>
                    <PopularProducts
                        products={products as any}
                        loading={productsLoading}
                        onViewAll={() => onNavigate && onNavigate('Marketplace')}
                        onSelectProduct={(product: any) => onNavigate && onNavigate('ProductDetailsScreen', { product })}
                    />
                </View>

                {/* ─── 5g. PROMOTIONS & OFFERS ─── */}
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
                        {[1, 2, 3].map((_, index) => (
                            <PromoCard key={index} layout="carousel" />
                        ))}
                    </ScrollView>
                </View>

                {/* ─── 5h. SUPPORT ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <SupportCard onNavigate={onNavigate} />
                </View>

            </ScrollView>

            <IncomingDetailsModal visible={isIncomingDetailsVisible} onClose={() => setIncomingDetailsVisible(false)} />
            <IncomingViewAllModal visible={isIncomingViewAllVisible} onClose={() => setIncomingViewAllVisible(false)} />

            {/* Rejected Tickets Modal */}
            <Modal visible={isRejectedModalVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.modalBackBtn} onPress={() => setRejectedModalVisible(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.modalBackArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('Rejected Tickets')}</Text>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                        {rejectedTickets.map((ticket, idx) => (
                            <RejectedTicketCard
                                key={ticket?.id || idx}
                                ticket={ticket}
                                onAccept={() => technicianApi.acceptTicket(ticket.id).catch((error: any) => console.error('Failed to re-accept ticket', error))}
                                onViewDetails={() => onNavigate && onNavigate('ActiveTicketDetails', { ticketId: ticket?.id, ticket })}
                            />
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <NotificationHistory visible={notificationsVisible} onClose={() => { setNotificationsVisible(false); refreshUnread(); }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 84 },

    customToggleContainer: {
        height: 30,
        width: 86,
        borderRadius: 20,
        justifyContent: 'center',
    },
    toggleTouchable: {
        flex: 1,
        justifyContent: 'center',
    },
    toggleTextContainer: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
    },
    toggleTextLeft: {
        color: '#FFFFFF',
        fontFamily: 'Roboto-Medium',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 12,
    },
    toggleTextRight: {
        color: '#FFFFFF',
        fontFamily: 'Roboto-Medium',
        fontSize: 14,
        fontWeight: '600',
        position: 'absolute',
        right: 12,
    },
    customToggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        left: 0,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
    statusCopy: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#5A6478' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    starEmoji: { fontSize: 15, marginRight: 6 },
    ratingText: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#5A6478' },
    ratingBold: { fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0B3A2C' },

    customToggle: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 18, width: 92, paddingHorizontal: 5 },
    customToggleActive: { backgroundColor: '#188A4E', justifyContent: 'space-between', paddingLeft: 14 },
    customToggleInactive: { backgroundColor: '#CBD5E1', justifyContent: 'space-between', paddingRight: 14, flexDirection: 'row-reverse' },
    customToggleTextActive: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 15, fontWeight: '500' },
    customToggleTextInactive: { color: '#5A6478', fontFamily: 'Roboto-Medium', fontSize: 12, fontWeight: '500' },

    sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 16 },
    carouselSectionTop: { paddingTop: 16 },
    carouselSection: { paddingTop: 24 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    sectionSubtitle: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 2, marginBottom: 16 },
    linkBlue: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },

    overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardViewToggle: { height: 36, width: 62, borderRadius: 18, backgroundColor: '#7ED4A6', justifyContent: 'center', paddingHorizontal: 5 },
    cardViewToggleActive: { backgroundColor: '#0B3A2C', alignItems: 'flex-end' },
    cardViewThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

    overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    overviewCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { marginRight: 6 },
    cardTitle: { fontSize: 13, fontFamily: 'Roboto-Medium', color: '#5A6478', textDecorationLine: 'underline' },
    cardValue: { fontSize: 32, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },

    modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    modalBackBtn: { marginRight: 16 },
    modalBackArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    modalPageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    modalScrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    // Rejected Card
    rejectedCardOutline: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    cardHeaderInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    rejectedMainProblemText: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#0B3A2C' },
    linkText: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowIcon: { marginRight: 8 },
    grayText: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478' },
    darkText: { fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },
    etaLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 10 },
    accpetBtnSolid: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    accpetBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 18, fontWeight: '500' },
});

export default TechnicianHomeScreen;
