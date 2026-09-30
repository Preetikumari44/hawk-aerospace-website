import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import SupportCard from '../../customerModule/components/SupportCard';
import PromoCard from '../components/PromoCard';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { aggregatorApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import ScreenContainer from '../../customerModule/components/ScreenContainer';
import COLORS from '../../customerModule/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CommissionData {
    earned?: number;
    pending?: number;
    history?: { label: string; value: number }[];
    payoutMethods?: { bank: string; account: string; isDefault?: boolean }[];
}

const CommissionScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [commission, setCommission] = useState<CommissionData>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [commissionData, historyData] = await Promise.all([
                    aggregatorApi.getCommission().catch(() => null),
                    aggregatorApi.getCommissionHistory().catch(() => null),
                ]);

                const rawHistory = historyData?.items ?? historyData ?? [];
                setCommission({
                    earned: commissionData?.commissionEarned ?? commissionData?.totalCommission ?? commissionData?.earned ?? 0,
                    pending: commissionData?.pendingCommission ?? commissionData?.pending ?? 0,
                    history: Array.isArray(rawHistory)
                        ? rawHistory.map((item: any) => ({
                            label: item?.settledAt?.slice(0, 10) ?? item?.label ?? item?.month ?? item?.date ?? '',
                            value: item?.totalAmount ?? item?.commissionAmount ?? item?.value ?? 0,
                        }))
                        : [],
                    payoutMethods: commissionData?.payoutMethods ?? [],
                });
            } catch (error) {
                console.error('Failed to load commission data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const GRAPH_DATA = commission.history && commission.history.length > 0
        ? commission.history
        : [];

    const maxValue = Math.max(...GRAPH_DATA.map(d => d.value), 1);

    const yMax = Math.ceil(maxValue / 10000) * 10000;
    const yLabels: string[] = [];
    for (let i = 0; i <= 8; i++) {
        const val = Math.round((yMax / 8) * (8 - i));
        yLabels.push(val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val));
    }

    const renderBar = (item: { label: string, value: number }, index: number) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * 85 : 0;
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

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}><Text style={styles.pageTitle}>{t('Manage your Earnings')}</Text></View>
                <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0B3A2C" /></View>
            </View>
        );
    }

    const formatCurrency = (amount?: number) => {
        if (amount == null) return '0';
        if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
        return String(amount);
    };

    const earned = commission.earned ?? 0;
    const pending = commission.pending ?? 0;

    return (
        <ScreenContainer backgroundColor={COLORS.white}>
            <View style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.headerRow}>
                        <Text style={styles.pageTitle}>{t('Manage your Earnings')}</Text>
                    </View>


                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('Overview')}</Text>
                        <View style={styles.overviewGrid}>
                            <View style={styles.overviewCard}>
                                <View style={styles.cardHeader}>
                                    <DroneIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.cardIcon} />
                                    <Text style={styles.cardTitle}>{t('Commission Earned')}</Text>
                                </View>
                                <Text style={[styles.cardValue, { color: '#0B3A2C' }]}>{formatCurrency(earned)}</Text>
                                {/*<Text style={{ fontSize: 12, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 4 }}>
                              {earned.toLocaleString(locale)}
                            </Text>*/}
                            </View>

                            <TouchableOpacity
                                style={styles.overviewCard}
                                onPress={() => onNavigate && onNavigate('PendingEarnings')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardHeader}>
                                    <DroneIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.cardIcon} />
                                    <Text style={styles.cardTitle}>{t('Pending Commission')}</Text>
                                </View>
                                <Text style={styles.cardValueDark}>{formatCurrency(pending)}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.overviewDisclaimer}>
                            {t('Pending is the amount which is being processed and will be added to payout as soon as possible')}
                        </Text>
                    </View>

                    {GRAPH_DATA.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.graphHeaderRow}>
                                <Text style={styles.sectionTitle}>{t('Commission Graph')}</Text>
                                <TouchableOpacity style={styles.dropdownBtn} activeOpacity={0.8}>
                                    <Text style={styles.dropdownBtnText}>{t('Last 1 year')}</Text>
                                    <Text style={styles.dropdownChevron}>⌄</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.graphCard}>
                                <View style={styles.graphGridContainer}>
                                    {yLabels.map((label, i) => (
                                        <View key={i} style={styles.gridLineRow}>
                                            <Text style={styles.yAxisLabel}>{label}</Text>
                                            <View style={styles.gridLine} />
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.barsContainer}>
                                    {GRAPH_DATA.map(renderBar)}
                                </View>
                            </View>

                            <Text style={styles.graphLegend}>
                                {t('25k = 25,000   |   1L = 1,00,0000')}
                            </Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('Rewards')}</Text>
                        <PromoCard />
                        <SupportCard onNavigate={onNavigate} />
                    </View>

                </ScrollView>
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F6F8' },
    scrollContent: { paddingTop: 12, paddingBottom: 64 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#F4F6F8' },
    pageTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    section: { paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
    sectionTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478', marginBottom: 12 },
    overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    overviewCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center',
        //marginBottom: 12
    },
    cardIcon: { marginRight: 8 },
    cardTitle: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#5A6478', fontWeight: '500' },
    cardValue: { fontSize: 36, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    cardValueDark: { fontSize: 36, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
    overviewDisclaimer: { fontSize: 12, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 12, lineHeight: 16 },
    graphHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    dropdownBtnText: { fontSize: 13, fontFamily: 'Roboto-Medium', color: '#5A6478', marginRight: 6 },
    dropdownChevron: { fontSize: 16, color: '#5A6478', marginTop: -6 },
    graphCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 24, paddingRight: 16, paddingLeft: 8, height: 280, position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    graphGridContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
    gridLineRow: { flexDirection: 'row', alignItems: 'center' },
    yAxisLabel: { width: 36, textAlign: 'right', fontSize: 10, fontFamily: 'Roboto-Regular', color: '#1E293B', marginRight: 8 },
    gridLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    barsContainer: { position: 'absolute', top: 24, bottom: 0, left: 52, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    barColumn: { width: '6.5%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    barFill: { width: '100%', borderRadius: 4, marginBottom: 24 },
    barLabel: { position: 'absolute', bottom: 4, fontSize: 10, fontFamily: 'Roboto-Regular', color: '#1E293B', textAlign: 'center' },
    graphLegend: { fontSize: 12, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 16, marginLeft: 4 },
    payoutSubtitle: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#5A6478', marginBottom: 12 },
    payoutMethodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
    payoutMethodIcon: { marginRight: 12 },
    payoutMethodText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#5A6478' },
    iciciMockLogo: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#C53030', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    iciciMockText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontStyle: 'italic' },
    selectedMethodDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#0B3A2C', padding: 16, marginBottom: 24 },
    selectedMethodLeft: { flexDirection: 'row', alignItems: 'center' },
    selectedMethodChevron: { fontSize: 20, color: '#5A6478', marginTop: -6 },
    addNewMethodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F8', borderRadius: 100, borderWidth: 1.5, borderColor: '#5A6478', paddingVertical: 16 },
    plusCircleOutlined: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#5A6478', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    plusIconGray: { fontSize: 14, fontWeight: '900', color: '#5A6478', marginTop: -2 },
    addNewMethodBtnText: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#5A6478' },
});

export default CommissionScreen;
