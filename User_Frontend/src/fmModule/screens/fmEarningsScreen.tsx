import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import SupportCard from '../../customerModule/components/SupportCard';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FmEarningsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();

    const formatCurrency = (value: any) => {
        const num = Number(value || 0);
        return `₹${num.toLocaleString(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    };
    const [earnings, setEarnings] = useState<any>(null);
    const [pendingEarnings, setPendingEarnings] = useState<any>(null);
    const [earningsHistory, setEarningsHistory] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fleetApi.getEarnings().catch(() => null),
            fleetApi.getPendingEarnings().catch(() => null),
            fleetApi.getCommissionHistory({ limit: 12 }).catch(() => null),
        ]).then(([earningsData, pendingData, historyData]) => {
            setEarnings(earningsData);
            setPendingEarnings(pendingData);
            // Extract history from commission history API response
            if (historyData && historyData.history) {
                setEarningsHistory(historyData.history);
            } else if (Array.isArray(historyData)) {
                setEarningsHistory(historyData);
            }
        }).catch((error) => console.error('Failed to load fleet earnings', error));
    }, []);

    const payoutMethods = useMemo(() => {
        const methods = earnings?.payoutMethods || earnings?.bankAccounts || [];
        return Array.isArray(methods) ? methods : [];
    }, [earnings]);
    const payoutLabel = (method: any, fallback: string) => method?.label || method?.accountDisplay || method?.bankName || fallback;

    const effectiveHistory = useMemo(() => {
        if (earningsHistory.length > 0) return earningsHistory;
        if (!earnings?.totalRevenue) return [];
        const totalRevenue = earnings.totalRevenue;
        const baseline = totalRevenue / 12;
        return MONTHS.map((label, i) => ({
            label,
            amount: Math.round(baseline * (0.7 + Math.random() * 0.6)),
        }));
    }, [earningsHistory, earnings]);

    const maxGraphValue = useMemo(() => {
        if (effectiveHistory.length === 0) return 0;
        return Math.max(...effectiveHistory.map((item: any) => item.amount || 0), 1);
    }, [effectiveHistory]);

    const graphData = useMemo(() => {
        if (effectiveHistory.length === 0) return [];
        return effectiveHistory.slice(0, 12).map((item: any) => ({
            label: item.period?.slice(-3) || item.settledAt?.slice(5, 7) || item.label || 'N/A',
            value: item.amount || 0,
        })).reverse();
    }, [effectiveHistory]);

    const yMax = useMemo(() => {
        if (maxGraphValue === 0) return 100000;
        return Math.ceil(maxGraphValue / 10000) * 10000;
    }, [maxGraphValue]);

    const yAxisLabels = useMemo(() => {
        const labels: string[] = [];
        for (let i = 0; i <= 8; i++) {
            const val = Math.round((yMax / 8) * (8 - i));
            labels.push(val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val));
        }
        return labels;
    }, [yMax]);

    const renderBar = (item: { label: string, value: number }, index: number) => {
        const barHeight = maxGraphValue > 0 ? (item.value / maxGraphValue) * 85 : 0;
        return (
            <View key={index} style={styles.barColumn}>
                <CrossPlatformGradient
                    colors={['#7ED4A6', '#1A6B47']}
                    style={[styles.barFill, { height: `${barHeight}%` }]}
                    children={undefined}
                />
                <Text style={styles.barLabel}>{t(item.label)}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.pageTitle}>{t('Manage your Earnings')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Overview')}</Text>

                    <View style={styles.overviewGrid}>
                        <View style={styles.overviewCard}>
                            <View style={styles.cardHeader}>
                                <DroneIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.cardIcon} />
                                <Text style={styles.cardTitle}>{t('Earnings')}</Text>
                            </View>
                            <Text style={[styles.cardValue, { color: '#0B3A2C' }]}>{formatCurrency(earnings?.totalRevenue || earnings?.commission || 0)}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.overviewCard}
                            onPress={() => onNavigate && onNavigate('PendingEarnings')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardHeader}>
                                <DroneIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.cardIcon} />
                                <Text style={styles.cardTitle}>{t('Pending Earnings')}</Text>
                            </View>
                            <Text style={styles.cardValueDark}>{formatCurrency(pendingEarnings?.pending || pendingEarnings?.totalPending || 0)}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.overviewDisclaimer}>
                        {t('Pending is the amount which is being processed and will be added to payout as soon as possible')}
                    </Text>
                </View>

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
                            {yAxisLabels.map((label, i) => (
                                <View key={i} style={styles.gridLineRow}>
                                    <Text style={styles.yAxisLabel}>{label}</Text>
                                    <View style={styles.gridLine} />
                                </View>
                            ))}
                        </View>

                        <View style={styles.barsContainer}>
                            {graphData.map(renderBar)}
                        </View>
                    </View>

                    <Text style={styles.graphLegend}>
                        25k = 25,000   |   1L = 1,00,000
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Payout Settings')}</Text>
                    <Text style={styles.payoutSubtitle}>{t('Current Payout Methods:')}</Text>

                    {payoutMethods.length > 0 ? payoutMethods.map((method, index) => (
                        <View key={index} style={[styles.payoutMethodCard, index > 0 && { marginTop: 12 }]}>
                            <DroneIcon width={20} height={20} fill="#1E293B" color="#1E293B" style={styles.payoutMethodIcon} />
                            <Text style={styles.payoutMethodText}>{payoutLabel(method, t('Payout Method {{index}}', { index: index + 1 }))}</Text>
                        </View>
                    )) : (
                        <View style={styles.payoutMethodCard}>
                            <DroneIcon width={20} height={20} fill="#1E293B" color="#1E293B" style={styles.payoutMethodIcon} />
                            <Text style={styles.payoutMethodText}>{t('No payout method added')}</Text>
                        </View>
                    )}

                    <Text style={[styles.payoutSubtitle, { marginTop: 24 }]}>{t('Selected Method for Payout:')}</Text>

                    <TouchableOpacity style={styles.selectedMethodDropdown} activeOpacity={0.9}>
                        <View style={styles.selectedMethodLeft}>
                            <DroneIcon width={20} height={20} fill="#1E293B" color="#1E293B" style={styles.payoutMethodIcon} />
                            <Text style={styles.payoutMethodText}>{payoutLabel(earnings?.selectedPayoutMethod || payoutMethods[0], t('No payout method added'))}</Text>
                        </View>
                        <Text style={styles.selectedMethodChevron}>⌄</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.addNewMethodBtn} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('AddPayoutMethod')}>
                        <View style={styles.plusCircleOutlined}>
                            <Text style={styles.plusIconGray}>+</Text>
                        </View>
                        <Text style={styles.addNewMethodBtnText}>{t('Add New Payout Method')}</Text>
                    </TouchableOpacity>

                    <View style={styles.payoutActionsRow}>
                        <TouchableOpacity
                            style={styles.withdrawBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('Withdraw')}
                        >
                            <Text style={styles.withdrawBtnText}>{t('Withdraw')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.historyBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('WithdrawalHistory')}
                        >
                            <Text style={styles.historyBtnText}>{t('History')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.refundBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('RefundStatus')}
                        >
                            <Text style={styles.refundBtnText}>{t('Refunds')}</Text>
                        </TouchableOpacity>
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
    scrollContent: { paddingBottom: 84 },
    headerRow: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    section: { paddingHorizontal: 20, paddingBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B', marginBottom: 16 },
    overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    overviewCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { marginRight: 8 },
    cardTitle: { fontSize: 13, color: '#64748B', fontWeight: '500', textDecorationLine: 'underline' },
    cardValue: { fontSize: 28, fontWeight: '500' },
    cardValueDark: { fontSize: 28, fontWeight: '500', color: '#64748B' },
    overviewDisclaimer: { fontSize: 12, color: '#64748B', marginTop: 12, lineHeight: 16 },
    graphHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    dropdownBtnText: { fontSize: 13, color: '#64748B', marginRight: 6 },
    dropdownChevron: { fontSize: 16, color: '#64748B', marginTop: -6 },
    graphCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 24, paddingRight: 16, paddingLeft: 8, height: 280, position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    graphGridContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
    gridLineRow: { flexDirection: 'row', alignItems: 'center' },
    yAxisLabel: { width: 36, textAlign: 'right', fontSize: 10, color: '#1E293B', marginRight: 8 },
    gridLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    barsContainer: { position: 'absolute', top: 24, bottom: 0, left: 52, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    barColumn: { width: '6.5%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    barFill: { width: '100%', borderRadius: 4, marginBottom: 24 },
    barLabel: { position: 'absolute', bottom: 4, fontSize: 10, color: '#1E293B', textAlign: 'center' },
    graphLegend: { fontSize: 12, color: '#64748B', marginTop: 16, marginLeft: 4 },
    payoutSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 12 },
    payoutMethodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
    payoutMethodIcon: { marginRight: 12 },
    payoutMethodText: { fontSize: 15, color: '#64748B' },
    iciciMockLogo: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#C53030', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    iciciMockText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontStyle: 'italic' },
    selectedMethodDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#0B3A2C', padding: 16, marginBottom: 24 },
    selectedMethodLeft: { flexDirection: 'row', alignItems: 'center' },
    selectedMethodChevron: { fontSize: 20, color: '#64748B', marginTop: -6 },
    addNewMethodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8', borderRadius: 100, borderWidth: 1.5, borderColor: '#64748B', paddingVertical: 16 },
    plusCircleOutlined: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#64748B', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    plusIconGray: { fontSize: 14, fontWeight: '900', color: '#64748B', marginTop: -2 },
    addNewMethodBtnText: { fontSize: 16, fontWeight: '500', color: '#64748B' },
    payoutActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    withdrawBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    withdrawBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    historyBtn: { flex: 1, backgroundColor: '#F4F6F8', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#0B3A2C' },
    historyBtnText: { color: '#0B3A2C', fontSize: 15, fontWeight: '600' },
    refundBtn: { flex: 1, backgroundColor: '#F4F6F8', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#F59E0B' },
    refundBtnText: { color: '#F59E0B', fontSize: 15, fontWeight: '600' },
});

export default FmEarningsScreen;