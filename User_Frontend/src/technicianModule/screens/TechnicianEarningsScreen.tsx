import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DroneIcon from '../../assets/Missions-Inactive.svg';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import SupportCard from '../../customerModule/components/SupportCard';
import ArrowBackwardIcon from '../../assets/ArrowBackWardIcon.svg';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { technicianApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const Y_AXIS_LABELS = ['2L', '1.75L', '1.5L', '1.25L', '1L', '75k', '50k', '25k', '00'];

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const PendingEarningCard = ({ item }: { item?: any }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.cardOutline}>
            <View style={styles.cardHeader}>
                <Text style={styles.mainProblemText}>{t(item?.title || item?.mainProblem || 'Ticket')}</Text>
                <TouchableOpacity><Text style={styles.linkText}>{t('View Details')}</Text></TouchableOpacity>
            </View>
            <View style={styles.iconRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Earnings: ')} <Text style={styles.darkText}>{t(item?.amount || item?.pendingAmount || '0')}</Text> <Text style={styles.orangeText}>({t('Pending')})</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Date: ')} <Text style={styles.darkText}>{t(formatDate(item?.scheduledDate || item?.date, locale))}</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <ClockIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Time: ')} <Text style={styles.darkText}>{t(item?.timeSlot || item?.scheduledSlot || 'Pending')}</Text></Text>
            </View>
            <View style={styles.iconRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText} numberOfLines={1}>{t(item?.address?.line1 || item?.address || item?.location?.address || 'Location pending')}</Text>
            </View>
        </View>
    );
};

const TechnicianEarningsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [isPendingModalVisible, setPendingModalVisible] = useState(false);
    const [earnings, setEarnings] = useState<any>(null);
    const [pendingEarnings, setPendingEarnings] = useState<any[]>([]);
    const [graphData, setGraphData] = useState<{ label: string; value: number }[]>([]);
    const [loadingGraph, setLoadingGraph] = useState(true);

    useEffect(() => {
        Promise.all([
            technicianApi.getEarnings().catch(() => null),
            technicianApi.getPendingEarnings().catch(() => []),
        ]).then(([earningsData, pendingData]) => {
            setEarnings(earningsData);
            setPendingEarnings(Array.isArray(pendingData) ? pendingData : pendingData?.items || pendingData?.data || []);
            const monthlyData =
                earningsData?.monthlyEarnings ||
                earningsData?.earningsData ||
                earningsData?.graphData ||
                [];
            if (Array.isArray(monthlyData) && monthlyData.length > 0) {
                setGraphData(monthlyData);
            } else {
                technicianApi.getEarningHistory().then((history: any) => {
                    const items = Array.isArray(history) ? history : history?.items || history?.data || [];
                    setGraphData(items);
                }).catch(() => {});
            }
        }).catch((error) => console.error('Failed to load technician earnings', error))
        .finally(() => setLoadingGraph(false));
    }, []);

    const renderBar = (item: { label: string, value: number }, index: number) => {
        return (
            <View key={index} style={styles.barColumn}>
                <CrossPlatformGradient
                    colors={['#7ED4A6', '#1A6B47']}
                    style={[
                        styles.barFill,
                        { height: `${item.value}%` }
                    ]} children={undefined} />
                <Text style={styles.barLabel}>{item.label}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}><Text style={styles.pageTitle}>{t('Manage your Earnings')}</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Overview')}</Text>
                    <View style={styles.overviewGrid}>
                        <View style={styles.overviewCard}>
                            <View style={styles.cardHeaderSmall}>
                                <DroneIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} />
                                <Text style={styles.cardTitleSmall}>{t('Earnings')}</Text>
                            </View>
                            <Text style={[styles.cardValue, { color: '#0B3A2C' }]}>{earnings?.totalEarnings || earnings?.total || '0'}</Text>
                        </View>
                        <TouchableOpacity style={styles.overviewCard} onPress={() => setPendingModalVisible(true)} activeOpacity={0.8}>
                            <View style={styles.cardHeaderSmall}>
                                <DroneIcon width={16} height={16} fill="#5A6478" style={styles.cardIcon} />
                                <Text style={styles.cardTitleSmall}>{t('Pending Earnings')}</Text>
                            </View>
                            <Text style={styles.cardValueDark}>{pendingEarnings?.reduce((sum, item) => sum + Number(item?.amount || item?.pendingAmount || 0), 0) || 0}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.overviewDisclaimer}>{t('Pending is the amount which is being processed and will be added to payout as soon as possible')}</Text>
                </View>

                {/* Graph & Payout sections matching Pilot design */}
                <View style={styles.section}>
                    <View style={styles.graphHeaderRow}>
                        <Text style={styles.sectionTitle}>{t('Earnings Graph')}</Text>
                        <TouchableOpacity style={styles.dropdownBtn} activeOpacity={0.8}>
                            <Text style={styles.dropdownBtnText}>{t('Last 1 year')}</Text>
                            <Text style={styles.dropdownChevron}>⌄</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.graphCard}>
                        <View style={styles.graphGridContainer}>
                            {Y_AXIS_LABELS.map((label, i) => (
                                <View key={i} style={styles.gridLineRow}>
                                    <Text style={styles.yAxisLabel}>{label}</Text>
                                    <View style={styles.gridLine} />
                                </View>
                            ))}
                        </View>
                        <View style={styles.barsContainer}>{loadingGraph ? <Text style={styles.noDataText}>{t('Loading...')}</Text> : graphData.length > 0 ? graphData.map(renderBar) : <Text style={styles.noDataText}>{t('No earnings data available')}</Text>}</View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Rewards')}</Text>
                    <SupportCard onNavigate={onNavigate} />
                </View>
            </ScrollView>

            {/* PENDING EARNINGS MODAL */}
            <Modal visible={isPendingModalVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.modalBackBtn} onPress={() => setPendingModalVisible(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <ArrowBackwardIcon width={24} height={24} />
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('All Pending Earnings')}</Text>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                        {pendingEarnings.map((item, index) => (
                            <PendingEarningCard key={item?.id || index} item={item} />
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scrollContent: { paddingBottom: 64 },
    headerRow: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    pageTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    section: { paddingHorizontal: 20, paddingBottom: 28 },
    sectionTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478', marginBottom: 16 },
    overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    overviewCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    cardHeaderSmall: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { marginRight: 8 },
    cardTitleSmall: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#5A6478', fontWeight: '500' },
    cardValue: { fontSize: 36, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    cardValueDark: { fontSize: 36, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
    overviewDisclaimer: { fontSize: 12, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 12, lineHeight: 16 },

    // Graph Styles
    graphHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    dropdownBtnText: { fontSize: 13, fontFamily: 'Roboto-Medium', color: '#5A6478', marginRight: 6 },
    dropdownChevron: { fontSize: 16, color: '#5A6478', marginTop: -6 },
    graphCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 24, paddingRight: 16, paddingLeft: 8, height: 280, position: 'relative' },
    graphGridContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
    gridLineRow: { flexDirection: 'row', alignItems: 'center' },
    yAxisLabel: { width: 36, textAlign: 'right', fontSize: 10, fontFamily: 'Roboto-Regular', color: '#1E293B', marginRight: 8 },
    gridLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    barsContainer: { position: 'absolute', top: 24, bottom: 0, left: 52, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    barColumn: { width: '6.5%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    barFill: { width: '100%', borderRadius: 4, marginBottom: 24 },
    barLabel: { position: 'absolute', bottom: 4, fontSize: 10, fontFamily: 'Roboto-Regular', color: '#1E293B', textAlign: 'center' },
    noDataText: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#94A3B8', textAlign: 'center', flex: 1, alignSelf: 'center' },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    modalBackBtn: { marginRight: 16 },
    modalBackArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    modalPageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    modalScrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    // Card Styles
    cardOutline: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    mainProblemText: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#0B3A2C' },
    linkText: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowIcon: { marginRight: 8 },
    grayText: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478' },
    darkText: { fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },
    orangeText: { fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#D97706' },
});

export default TechnicianEarningsScreen;
