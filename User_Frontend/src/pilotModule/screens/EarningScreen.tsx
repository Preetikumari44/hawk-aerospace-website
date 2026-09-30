import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import SupportCard from '../../customerModule/components/SupportCard';
import { Card, Button } from '../ui/ui';
import OverviewCard from '../ui/OverviewCard';
import { colors } from '../ui/colors';
import { spacing, radii, typography } from '../ui/theme';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { pilotApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const Y_AXIS_LABELS = ['2L', '1.75L', '1.5L', '1.25L', '1L', '75k', '50k', '25k', '00'];

const EarningScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const [earnings, setEarnings] = useState<any>(null);
    const [pendingEarnings, setPendingEarnings] = useState<any>(null);
    const [graphData, setGraphData] = useState<{ label: string; value: number }[]>([]);
    const [loadingGraph, setLoadingGraph] = useState(true);

    useEffect(() => {
        Promise.all([
            pilotApi.getEarnings().catch(() => null),
            pilotApi.getPendingEarnings().catch(() => null),
            pilotApi.getEarningsSummary().catch(() => null),
        ]).then(([earningsData, pendingData, summaryData]) => {
            const summary = summaryData?.data || summaryData || {};
            setEarnings(earningsData);
            setPendingEarnings(pendingData);

            // Merge summary data if available
            if (earningsData && summary && Object.keys(summary).length > 0) {
                setEarnings({
                    ...earningsData,
                    totalEarnings: summary.totalEarnings !== undefined ? summary.totalEarnings : earningsData?.totalEarnings,
                    pendingEarnings: summary.pendingEarnings !== undefined ? summary.pendingEarnings : earningsData?.pendingEarnings,
                });
            }

            const monthlyData =
                earningsData?.monthlyEarnings ||
                earningsData?.earningsData ||
                earningsData?.graphData ||
                [];
            if (Array.isArray(monthlyData) && monthlyData.length > 0) {
                setGraphData(monthlyData);
            } else {
                pilotApi.getEarningHistory().then((history: any) => {
                    const items = Array.isArray(history) ? history : history?.items || history?.data || [];
                    setGraphData(items);
                }).catch(() => { });
            }
        }).catch((error) => console.error('Failed to load pilot earnings', error))
            .finally(() => setLoadingGraph(false));
    }, []);

    const payoutMethods = useMemo(() => {
        const methods = earnings?.payoutMethods || earnings?.bankAccounts || [];
        return Array.isArray(methods) ? methods : [];
    }, [earnings]);
    const payoutLabel = (method: any, fallback: string) => method?.label || method?.accountDisplay || method?.bankName || fallback;

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
            <View style={styles.headerRow}>
                <Text style={styles.pageTitle}>{t('Manage your Earnings')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Overview')}</Text>

                    <View style={styles.overviewGrid}>
                        <OverviewCard
                            tone="dark"
                            label={t('Earnings')}
                            value={String(earnings?.totalEarnings || earnings?.total || '0')}
                        />
                        <TouchableOpacity
                            style={styles.overviewTouch}
                            onPress={() => onNavigate && onNavigate('PendingEarnings')}
                            activeOpacity={0.8}
                        >
                            <OverviewCard
                                label={t('Pending Earnings')}
                                value={String(pendingEarnings?.totalPending || pendingEarnings?.total || '0')}
                            />
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

                    <Card style={styles.graphCard}>
                        <View style={styles.graphGridContainer}>
                            {Y_AXIS_LABELS.map((label, i) => (
                                <View key={i} style={styles.gridLineRow}>
                                    <Text style={styles.yAxisLabel}>{label}</Text>
                                    <View style={styles.gridLine} />
                                </View>
                            ))}
                        </View>

                        <View style={styles.barsContainer}>
                            {loadingGraph ? <Text style={styles.noDataText}>{t('Loading...')}</Text> : graphData.length > 0 ? graphData.map(renderBar) : <Text style={styles.noDataText}>{t('No earnings data available')}</Text>}
                        </View>
                    </Card>

                    <Text style={styles.graphLegend}>
                        {t('25k = 25,000   |   1L = 1,00,0000')}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Payout Settings')}</Text>

                    <Card style={styles.payoutCard}>
                        <Text style={styles.payoutSubtitle}>{t('Current Payout Methods:')}</Text>
                        <View style={styles.methodRow}>
                            <Text style={styles.payoutMethodText}>{payoutLabel(payoutMethods[0], t('No payout method added'))}</Text>
                        </View>
                        <View style={[styles.methodRow, styles.methodRowLast]}>
                            <Text style={styles.payoutMethodText}>{payoutLabel(payoutMethods[1], t('No secondary method'))}</Text>
                        </View>

                        <Text style={[styles.payoutSubtitle, { marginTop: spacing.xl }]}>{t('Selected Method for Payout:')}</Text>
                        <TouchableOpacity style={styles.selectedMethodDropdown} activeOpacity={0.9}>
                            <Text style={styles.payoutMethodText}>{payoutLabel(earnings?.selectedPayoutMethod || payoutMethods[0], t('No payout method added'))}</Text>
                            <Text style={styles.selectedMethodChevron}>⌄</Text>
                        </TouchableOpacity>

                        <Button
                            label={'+  ' + t('Add New Payout Method')}
                            variant="secondary"
                            onPress={() => onNavigate && onNavigate('AddPayoutMethod')}
                        />

                        <View style={styles.payoutActionsRow}>
                            <Button label={t('Withdraw')} variant="primary" fullWidth onPress={() => onNavigate && onNavigate('Withdraw')} />
                            <Button label={t('History')} variant="outline" fullWidth onPress={() => onNavigate && onNavigate('WithdrawalHistory')} />
                            <Button label={t('Refunds')} variant="outline" fullWidth onPress={() => onNavigate && onNavigate('RefundStatus')} />
                        </View>
                    </Card>
                </View>

                {/*<View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('Rewards')}</Text>
                </View>*/}
                <SupportCard onNavigate={onNavigate} />

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.creamBackground },
    scrollContent: { paddingBottom: 84 },
    headerRow: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.creamBackground },
    pageTitle: { ...typography.h1, color: colors.textPrimary },
    section: { paddingHorizontal: 20, paddingBottom: 28 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
    overviewGrid: { flexDirection: 'row', gap: spacing.md },
    overviewTouch: { flex: 1, flexDirection: 'row' },
    overviewDisclaimer: { ...typography.small, fontSize: 12, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 16 },
    graphHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardWhite, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    dropdownBtnText: { ...typography.smallMedium, color: colors.textSecondary, marginRight: 6 },
    dropdownChevron: { fontSize: 16, color: colors.textSecondary, marginTop: -6 },
    graphCard: { paddingVertical: 24, paddingRight: 16, paddingLeft: 8, height: 280, position: 'relative' },
    graphGridContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: 24 },
    gridLineRow: { flexDirection: 'row', alignItems: 'center' },
    yAxisLabel: { width: 36, textAlign: 'right', fontSize: 10, fontFamily: 'Roboto-Regular', color: colors.textSecondary, marginRight: 8 },
    gridLine: { flex: 1, height: 1, backgroundColor: colors.border },
    barsContainer: { position: 'absolute', top: 24, bottom: 0, left: 52, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    barColumn: { width: '6.5%', height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    barFill: { width: '100%', borderRadius: 4, marginBottom: 24 },
    barLabel: { position: 'absolute', bottom: 4, fontSize: 10, fontFamily: 'Roboto-Regular', color: colors.textSecondary, textAlign: 'center' },
    graphLegend: { ...typography.small, fontSize: 12, color: colors.textSecondary, marginTop: spacing.lg, marginLeft: 4 },
    noDataText: { ...typography.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', flex: 1, alignSelf: 'center' },
    payoutCard: { padding: spacing.lg },
    payoutSubtitle: { ...typography.smallMedium, color: colors.textSecondary, marginBottom: spacing.sm },
    methodRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    methodRowLast: { borderBottomWidth: 0 },
    payoutMethodText: { ...typography.bodyMedium, color: colors.textPrimary },
    selectedMethodDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardWhite, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.forestGreen, padding: spacing.lg, marginBottom: spacing.lg },
    selectedMethodChevron: { fontSize: 20, color: colors.textSecondary, marginTop: -6 },
    payoutActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});

export default EarningScreen;
