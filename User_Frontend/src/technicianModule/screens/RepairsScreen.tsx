import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    LayoutAnimation,
    UIManager,
    Platform
} from 'react-native';

import ActiveTicketCard from '../components/ActiveTicketCard';
import NextTicketCard from '../components/NextTicketCard';
import IncomingTicketCard from '../components/IncomingTicketCard';
import SupportCard from '../../customerModule/components/SupportCard';
import { IncomingDetailsModal, IncomingViewAllModal } from '../components/IncomingModals';
import ArrowBackwardIcon from '../../assets/ArrowBackWardIcon.svg';
import ClockIcon from '../../assets/clock.svg';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { technicianApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const calDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type TabType = 'Active' | 'Upcoming' | 'Completed';
type DutyType = 'full_active' | 'morning_off' | 'evening_off' | 'full_off' | null;

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const CompletedTicketCard = ({ ticket }: { ticket?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.completedCard}>
            <View style={styles.compHeaderRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.compMainProb}>{t(ticket?.title || ticket?.mainProblem || 'Completed Ticket')}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.compViewDetails}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.iconRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Est. Earnings: ')} <Text style={styles.boldDark}>{t(ticket?.amount || ticket?.estimatedEarnings || 'N/A')}</Text></Text>
            </View>

            <View style={styles.iconRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Date: ')} <Text style={styles.boldDark}>{t(formatDate(ticket?.scheduledDate || ticket?.date, locale))}</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <ClockIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Time: ')} <Text style={styles.boldDark}>{t(ticket?.timeSlot || ticket?.scheduledSlot || 'Pending')}</Text></Text>
            </View>

            <View style={styles.iconRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText} numberOfLines={1}>{t(ticket?.address?.line1 || ticket?.address || ticket?.location?.address || 'Location pending')}</Text>
            </View>
        </View>
    );
};

const RepairsScreen: React.FC<{ onNavigate?: (screen: string) => void; routeParams?: any }> = ({ onNavigate, routeParams }) => {
    const { t, locale } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabType>('Active');
    const [selectedDates, setSelectedDates] = useState<number[]>([]);
    const [selectedDuty, setSelectedDuty] = useState<DutyType>(null);

    // Modal states
    const [isIncomingDetailsVisible, setIncomingDetailsVisible] = useState(false);
    const [isIncomingViewAllVisible, setIncomingViewAllVisible] = useState(false);
    const [tickets, setTickets] = useState<any[]>([]);
    const [incomingTickets, setIncomingTickets] = useState<any[]>([]);

    React.useEffect(() => {
        Promise.all([
            technicianApi.getTickets().catch(() => []),
            technicianApi.getIncomingTickets().catch(() => []),
        ]).then(([ticketsData, incomingData]) => {
            setTickets(Array.isArray(ticketsData) ? ticketsData : ticketsData?.items || ticketsData?.data || []);
            setIncomingTickets(Array.isArray(incomingData) ? incomingData : incomingData?.items || incomingData?.data || []);
        }).catch((error: any) => console.error('Failed to load technician repairs data', error));
    }, []);

    const activeTickets = tickets.filter((ticket) => ['accepted', 'in_progress', 'repairing'].includes(ticket?.status));
    const upcomingTickets = tickets.filter((ticket) => ['assigned', 'pending', 'scheduled'].includes(ticket?.status));
    const completedTickets = tickets.filter((ticket) => ticket?.status === 'completed');

    // Apply route parameters if navigated via quick links
    React.useEffect(() => {
        if (routeParams && routeParams.initialTab) {
            setActiveTab(routeParams.initialTab);
        }
    }, [routeParams]);

    const handleTabChange = (tab: TabType) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(tab);
    };

    const toggleDate = (day: number) => {
        if (selectedDates.includes(day)) {
            setSelectedDates(selectedDates.filter(d => d !== day));
        } else {
            setSelectedDates([...selectedDates, day]);
        }
    };

    const renderCalendarGrid = () => {
        const totalDays = 31;
        const startOffset = 2; // Starts on Tuesday (index 2)
        const grid = [];

        // Empty cells before day 1
        for (let i = 0; i < startOffset; i++) {
            grid.push(<View key={`empty-${i}`} style={styles.calCell} />);
        }

        // Days 1-31
        for (let day = 1; day <= totalDays; day++) {
            const isSelected = selectedDates.includes(day);
            const hasDot = [7, 8, 9, 10, 11, 12, 14, 15, 21, 22, 23, 24, 25, 28, 29, 30, 31].includes(day);

            grid.push(
                <TouchableOpacity
                    key={day}
                    style={styles.calCell}
                    onPress={() => toggleDate(day)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.calNumCircle, isSelected && styles.calNumCircleSelected]}>
                        <Text style={[styles.calNum, isSelected && styles.calNumSelected]}>{day}</Text>
                    </View>
                    {hasDot && <View style={[styles.calDotBlue, isSelected && { backgroundColor: 'transparent' }]} />}
                </TouchableOpacity>
            );
        }
        return grid;
    };

    const renderSharedBottomSection = () => (
        <>
            {/* INCOMING REQUESTS CAROUSEL */}
            <View style={styles.carouselSection}>
                <View style={[styles.sectionHeaderRow, { paddingHorizontal: 20 }]}>
                    <Text style={styles.sectionTitle}>{t('Incoming Requests (04)')}</Text>
                    {/* NEW: Trigger View All Modal */}
                    <TouchableOpacity onPress={() => setIncomingViewAllVisible(true)}>
                        <Text style={styles.linkBlue}>{t('View All')}</Text>
                    </TouchableOpacity>
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
                            layout="carousel"
                            ticket={ticket}
                            onAccept={() => technicianApi.acceptTicket(ticket.id).catch((error: any) => console.error('Failed to accept ticket', error))}
                            onReject={() => technicianApi.rejectTicket(ticket.id, { reason: 'Rejected from app' }).catch((error: any) => console.error('Failed to reject ticket', error))}
                            onViewDetails={() => setIncomingDetailsVisible(true)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* INTERACTIVE CALENDAR & SCHEDULE */}
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
                        {calDays.map((d, i) => <Text key={i} style={styles.calDayLabel}>{t(d)}</Text>)}
                    </View>

                    <View style={styles.calGrid}>
                        {renderCalendarGrid()}
                    </View>
                    <View style={styles.calDivider} />

                    {/* DUTY SELECTOR */}
                    <View style={styles.dutySelectorRow}>
                        {[
                            { id: 'full_active', label: 'Full Day\nActive' },
                            { id: 'morning_off', label: 'Morning\nOff-Duty' },
                            { id: 'evening_off', label: 'Evening\nOff-Duty' },
                            { id: 'full_off', label: 'Full Day\nOff-Duty' }
                        ].map((item) => {
                            const isSelected = selectedDuty === item.id;
                            const isFullActive = item.id === 'full_active';

                            const activeColor = isFullActive ? '#0B3A2C' : '#BA1A1A';
                            const circleColor = isSelected ? activeColor : '#CBD5E1';
                            const textColor = isSelected ? activeColor : '#5A6478';

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.legendItem}
                                    onPress={() => setSelectedDuty(item.id as DutyType)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.legendCircleLg, { backgroundColor: circleColor }]} />
                                    <Text style={[styles.legendText, { color: textColor }]}>{t(item.label)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>

            <View style={styles.sectionHeaderPadding}>
                <Text style={styles.tasksLabel}>{t('Tickets for the Day')}</Text>
            </View>

            {/* SUPPORT CARD */}
            <View style={styles.sectionHeaderPadding}>
                <SupportCard onNavigate={onNavigate} />
            </View>
        </>
    );

    return (
        <View style={styles.container}>
            {/* APP BAR */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('Home')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowBackwardIcon width={24} height={24} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Your Tickets')}</Text>
            </View>

            {/* TABS (PILL BASED) */}
            <View style={styles.tabContainer}>
                <View style={styles.tabPillWrapper}>
                    {['Active', 'Upcoming', 'Completed'].map((tab) => {
                        const isActive = activeTab === tab;

                        // Apply unique asymmetric border-radius rules per requirements
                        let customBorderRadiusStyle = {};
                        if (isActive) {
                            customBorderRadiusStyle = { borderRadius: 28 };
                        } else {
                            if (tab === 'Upcoming') {
                                customBorderRadiusStyle = { borderRadius: 8 };
                            } else if (tab === 'Active') {
                                customBorderRadiusStyle = {
                                    borderTopLeftRadius: 28,
                                    borderBottomLeftRadius: 28,
                                    borderTopRightRadius: 8,
                                    borderBottomRightRadius: 8,
                                };
                            } else if (tab === 'Completed') {
                                customBorderRadiusStyle = {
                                    borderTopLeftRadius: 8,
                                    borderBottomLeftRadius: 8,
                                    borderTopRightRadius: 28,
                                    borderBottomRightRadius: 28,
                                };
                            }
                        }

                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tabBtn,
                                    isActive && styles.tabBtnActive,
                                    customBorderRadiusStyle
                                ]}
                                onPress={() => handleTabChange(tab as TabType)}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                                    {t(tab)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.listSection}>
                    {activeTab === 'Active' && activeTickets.map((ticket, i) => (
                        <ActiveTicketCard key={`active-${ticket?.id || i}`} layout="list" ticket={ticket} onStartRepair={() => technicianApi.updateTicketStage(ticket.id, { stage: 'in_progress' }).catch((error: any) => console.error('Failed to update ticket stage', error))} />
                    ))}

                    {activeTab === 'Upcoming' && upcomingTickets.map((ticket, i) => (
                        <NextTicketCard key={`upcoming-${ticket?.id || i}`} layout="list" ticket={ticket} onStartTransit={() => technicianApi.acceptTicket(ticket.id).catch((error: any) => console.error('Failed to accept ticket', error))} />
                    ))}

                    {activeTab === 'Completed' && completedTickets.map((ticket, i) => (
                        <CompletedTicketCard key={`completed-${ticket?.id || i}`} ticket={ticket} />
                    ))}
                </View>

                {renderSharedBottomSection()}

            </ScrollView>
            <IncomingDetailsModal visible={isIncomingDetailsVisible} onClose={() => setIncomingDetailsVisible(false)} />
            <IncomingViewAllModal visible={isIncomingViewAllVisible} onClose={() => setIncomingViewAllVisible(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 84 },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16, justifyContent: 'center' },
    backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
    pageTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },

    // Tabs
    tabContainer: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    tabPillWrapper: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 1,
        gap: 2,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0', // Distinct, clean background for all inactive states
        },
    tabBtnActive: {
        backgroundColor: '#1E293B' // Matches the dark shade in the reference image
    },
    tabBtnText: {
        fontSize: 15,
        fontFamily: 'Roboto-Medium',
        fontWeight: '600',
        color: '#5A6478'
    },
    tabBtnTextActive: {
        color: '#FFFFFF'
    },

    // Layout
    listSection: { paddingHorizontal: 20 },
    carouselSection: { paddingTop: 24 },
    sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 24 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sectionTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },
    linkBlue: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },

    // Completed Ticket Card
    completedCard: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    compHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    compMainProb: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#0B3A2C', marginBottom: 6 },
    compDesc: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#1E293B' },
    compViewDetails: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500', marginTop: 4 },
    compDataRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    compLabel: { width: 110, fontSize: 15, fontFamily: 'Roboto-Regular', color: '#64748B' },
    compValue: { flex: 1, fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    rowIcon: { marginRight: 8 },
    grayText: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#5A6478' },
    boldDark: { fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },

    // Calendar & Schedule
    calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    calBigDate: { fontSize: 26, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', marginBottom: 16 },
    calDivider: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 16 },
    calMonthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    calMonthText: { fontSize: 13, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
    calArrowsRow: { flexDirection: 'row', gap: 24 },
    calArrow: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
    calDaysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    calDayLabel: { width: '14.28%', textAlign: 'center', fontSize: 14, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },

    calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 12 },
    calCell: { width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'center' },
    calNumCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    calNumCircleSelected: { backgroundColor: '#0B3A2C' },
    calNum: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1E293B' },
    calNumSelected: { color: '#FFFFFF', fontWeight: '500' },
    calDotBlue: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0B3A2C', marginTop: 2, position: 'absolute', bottom: 2 },

    // Duty Selector
    dutySelectorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 },
    legendItem: { alignItems: 'center', flex: 1 },
    legendCircleLg: { width: 44, height: 44, borderRadius: 22, marginBottom: 8 },
    legendText: { fontSize: 11, fontFamily: 'Roboto-Medium', fontWeight: '600', textAlign: 'center', lineHeight: 16 },

    tasksLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#5A6478' },
});

export default RepairsScreen;
