import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import ActiveMissionCard from '../components/fmActiveMissionCard';
import IncomingRequestCard from '../components/fmIncomingReqCard';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, ResponsiveGrid, SplitPane } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import SupportCard from '../../customerModule/components/SupportCard';

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const UpcomingMissionCard = ({ mission, onNavigate }: { mission: any; onNavigate?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.genericCard}>
            <View style={styles.assignedCardHeader}>
                <Text style={styles.assignedCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Commission: ')}<Text style={styles.darkTextMedium}>{mission?.estimatedCommission || mission?.priceEstimation || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.darkTextMedium}>{t(formatDate(mission?.scheduledDate, locale))}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.darkTextMedium}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </View>
            <TouchableOpacity style={styles.viewDetailsFullBtn} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('BookingDetails', { mission })}>
                <Text style={styles.viewDetailsTextBlue}>{t('View Details')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const CompletedMissionCard = ({ mission, onNavigate }: { mission: any; onNavigate?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.genericCard}>
            <View style={styles.assignedCardHeader}>
                <Text style={styles.assignedCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
                <View style={styles.completedPill}>
                    <Text style={styles.completedPillText}>{t('✓ Completed')}</Text>
                </View>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Commission: ')}<Text style={styles.darkTextMedium}>{mission?.estimatedCommission || mission?.priceEstimation || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.darkTextMedium}>{t(formatDate(mission?.scheduledDate, locale))}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.darkTextMedium}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </View>
            <TouchableOpacity style={styles.viewDetailsFullBtn} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('BookingDetails', { mission })}>
                <Text style={styles.viewDetailsTextBlue}>{t('View Details')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const MissionsScreen: React.FC<{ onNavigate?: any; initialTab?: 'Active' | 'Upcoming' | 'Completed'; routeParams?: any }> = ({ onNavigate, initialTab, routeParams }) => {
    const { t, locale } = useLanguage();
    const requestedTab = initialTab || routeParams?.tab;
    const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'Completed'>(
        requestedTab === 'Completed' ? 'Completed' : requestedTab === 'Upcoming' ? 'Upcoming' : 'Active',
    );
    const screenTabs = ['Active', 'Upcoming', 'Completed'];
    const [missions, setMissions] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const isDesktop = useIsDesktop();

    // Allow deep-linking to a specific tab (e.g. Completed card → Completed tab).
    useEffect(() => {
        if (requestedTab === 'Active' || requestedTab === 'Upcoming' || requestedTab === 'Completed') {
            setActiveTab(requestedTab);
        }
    }, [requestedTab]);

    useEffect(() => {
        fleetApi.getMissions().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.missions || data?.items || data?.data || [];
            setMissions(items);
        }).catch((error: any) => console.error('Failed to load fleet missions', error));

        fleetApi.getFleetManagerRequests().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.missions || data?.items || data?.data || [];
            setIncomingRequests(items);
        }).catch((error: any) => console.error('Failed to load fleet incoming requests', error));
    }, []);

    const activeMissions = useMemo(() => missions.filter((item) => ['confirmed', 'in_progress', 'pilot_assigned'].includes(item?.status)), [missions]);
    const upcomingMissions = useMemo(() => missions.filter((item) => ['pending', 'scheduled'].includes(item?.status)), [missions]);
    const completedMissions = useMemo(() => missions.filter((item) => ['completed', 'cancelled'].includes(item?.status)), [missions]);

    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" style={{ marginRight: 8 }} />
                    <Text style={styles.pageTitle}>{t('Your Missions')}</Text>
                </View>}         >
                <SplitPane
                    leftWeight={7} rightWeight={3}
                    left={
                        <>
                            <View style={[styles.tabContainer, { paddingHorizontal: 0, width: 400 }]}>
                                <View style={styles.tabPillWrapper}>
                                    {/* Map existing tabs here exactly as mobile */}
                                    {screenTabs.map((tab) => {
                                        const isActive = activeTab === tab;
                                        return (
                                            <TouchableOpacity key={tab} style={[styles.tabBtn, isActive && styles.tabBtnActive]} onPress={() => setActiveTab(tab as any)}>
                                                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t(tab)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <ResponsiveGrid>
                                {activeTab === 'Active' && activeMissions.map((mission, i) => (
                                    <View key={i} style={{ width: '48%' }}><ActiveMissionCard layout="list" onNavigate={onNavigate} mission={mission} status={i === 0 ? 'pilot_in_transit' : 'service_started'} /></View>
                                ))}
                                {activeTab === 'Upcoming' && upcomingMissions.map((mission, i) => (
                                    <View key={i} style={{ width: '48%' }}><UpcomingMissionCard mission={mission} onNavigate={onNavigate} /></View>
                                ))}
                                {activeTab === 'Completed' && completedMissions.map((mission, i) => (
                                    <View key={i} style={{ width: '48%' }}><CompletedMissionCard mission={mission} onNavigate={onNavigate} /></View>
                                ))}
                            </ResponsiveGrid>
                        </>
                    }
                    right={
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>{t('Incoming ({{count}})', { count: incomingRequests.length })}</Text>
                                <TouchableOpacity onPress={() => onNavigate && onNavigate('IncomingRequests')}>
                                    <Text style={styles.linkBlue}>{t('View All')}</Text>
                                </TouchableOpacity>
                            </View>
                            {incomingRequests.slice(0, 4).map((request, index) => (
                                <View key={index} style={{ marginBottom: 16 }}>
                                    <IncomingRequestCard layout="list" onNavigate={onNavigate} request={request} />
                                </View>
                            ))}
                        </>
                    }
                />
            </DesktopPageShell>
        );
    }

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

                {/* ─── 2. DYNAMIC TAB CONTENT (Active Missions list, one below the other) ─── */}
                <View style={styles.listSection}>
                    {activeTab === 'Active' && activeMissions.map((mission, i) => (
                        <ActiveMissionCard key={i} layout="list" onNavigate={onNavigate} mission={mission} status={i === 0 ? 'pilot_in_transit' : 'service_started'} />
                    ))}

                    {activeTab === 'Upcoming' && upcomingMissions.map((mission, i) => (
                        <UpcomingMissionCard key={i} mission={mission} onNavigate={onNavigate} />
                    ))}

                    {activeTab === 'Completed' && completedMissions.map((mission, i) => (
                        <CompletedMissionCard key={i} mission={mission} onNavigate={onNavigate} />
                    ))}
                </View>

                {/* ─── 3. INCOMING REQUESTS (List, one below the other) ─── */}
                <View style={styles.sectionHeaderPadding}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>{t('Incoming Requests ({{count}})', { count: incomingRequests.length })}</Text>
                        <TouchableOpacity onPress={() => onNavigate && onNavigate('IncomingRequests')}>
                            <Text style={styles.linkBlue}>{t('View All')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 4 }}>
                        {incomingRequests.slice(0, 2).map((request, index) => (
                            <View key={index} style={{ marginBottom: 16 }}>
                                <IncomingRequestCard layout="list" onNavigate={onNavigate} request={request} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ paddingTop: 22 }}>
                    <SupportCard onNavigate={onNavigate} />
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingBottom: 84 },

    tabContainer: { paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
    tabPillWrapper: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 100, padding: 4, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
    tabBtnActive: { backgroundColor: '#1E293B' },
    tabBtnText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    tabBtnTextActive: { color: '#FFFFFF' },
    listSection: { paddingHorizontal: 20 },

    sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 24 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
    linkBlue: { fontSize: 14, fontWeight: '500', color: '#0B3A2C' },

    genericCard: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    assignedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    assignedCardTitle: { fontSize: 20, fontWeight: '500', color: '#0B3A2C' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, fontWeight: '400', color: '#64748B' },
    darkTextMedium: { color: '#1E293B', fontWeight: '500' },
    completedPill: { backgroundColor: '#ECFDF3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
    completedPillText: { color: '#027A48', fontSize: 12, fontWeight: '500' },
    viewDetailsFullBtn: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    viewDetailsTextBlue: { color: '#0B3A2C', fontSize: 16, fontWeight: '500' },
});

export default MissionsScreen;
