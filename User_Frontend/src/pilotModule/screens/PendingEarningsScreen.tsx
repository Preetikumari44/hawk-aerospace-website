import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
} from 'react-native';

import LocationPinIcon from '../../assets/location-pin.svg';
import { pilotApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale);
};

const PendingEarningsScreen: React.FC<{ onNavigate: any; routeParams?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [pendingItems, setPendingItems] = useState<any[]>([]);

    useEffect(() => {
        const onBackPress = () => {
            onNavigate('Earnings');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        pilotApi.getPendingEarnings()
            .then((data: any) => setPendingItems(Array.isArray(data) ? data : data?.items || data?.data || data?.missions || []))
            .catch((error: any) => console.error('Failed to load pending pilot earnings', error));
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate('Earnings')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.backArrow}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('All Pending Earnings')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
                {pendingItems.map((item, index) => (
                    <View key={item?.id || index} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.titleText}>{t(item?.serviceType || item?.title || 'Mission')}</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => onNavigate('ActiveMissionDetails', { missionId: item?.missionId || item?.id, mission: item })}>
                                <Text style={styles.viewDetailsText}>{t('View Details')}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.subTitleText}>
                            {t(item?.description || item?.summary || 'Pending settlement for completed mission')}
                        </Text>

                        <Text style={styles.whenWhereText}>
                            {t('When & Where: ')}<Text style={styles.whenWhereValue}>{t(formatDate(item?.scheduledDate || item?.completedAt || item?.date, locale))}</Text>
                        </Text>

                        <View style={styles.borderedBox}>
                            <LocationPinIcon width={16} height={16} fill="#1E293B" style={styles.pinIcon} />
                            <Text style={styles.boxTextDark}>{t(item?.address?.line1 || item?.address || item?.location?.address || 'Location pending')}</Text>
                        </View>

                        <View style={styles.borderedBox}>
                            <Text style={styles.boxTextLight}>
                                {t('Mission Earnings: ')}
                                <Text style={styles.boxTextDark}>{item?.amount || item?.pendingAmount || '0'}</Text>
                                <Text style={styles.pendingText}>{t(' (Pending)')}</Text>
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    scrollContent: {
        paddingTop: 10
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#F8FAFC',
    },
    backBtn: {
        marginRight: 16,
        justifyContent: 'center',
    },
    backArrow: {
        fontSize: 28,
        color: '#475569',
        fontWeight: '400',
        marginTop: -4
    },
    pageTitle: {
        fontSize: 22,
        fontFamily: 'Roboto-Medium',
        fontWeight: '500',
        color: '#334155'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    titleText: {
        fontSize: 18,
        fontFamily: 'Roboto-Medium',
        color: '#0B3A2C',
        fontWeight: '500',
        flex: 1,
        paddingRight: 10
    },
    viewDetailsText: {
        fontSize: 13,
        fontFamily: 'Roboto-Regular',
        color: '#0B3A2C',
        fontWeight: '400',
        textDecorationLine: 'underline'
    },
    subTitleText: {
        fontSize: 15,
        fontFamily: 'Roboto-Regular',
        color: '#475569',
        fontWeight: '400',
        lineHeight: 22,
        marginBottom: 16
    },
    whenWhereText: {
        fontSize: 14,
        fontFamily: 'Roboto-Regular',
        color: '#64748B',
        fontWeight: '400',
        marginBottom: 16
    },
    whenWhereValue: {
        color: '#0F172A',
        fontFamily: 'Roboto-Medium',
        fontWeight: '500'
    },
    borderedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12
    },
    pinIcon: {
        marginRight: 10
    },
    boxTextLight: {
        fontSize: 15,
        fontFamily: 'Roboto-Regular',
        color: '#64748B',
        fontWeight: '400'
    },
    boxTextDark: {
        fontSize: 15,
        fontFamily: 'Roboto-Medium',
        color: '#0F172A',
        fontWeight: '500',
        flexShrink: 1,
    },
    pendingText: {
        fontSize: 15,
        fontFamily: 'Roboto-Medium',
        color: '#D97706',
        fontWeight: '500'
    }
});

export default PendingEarningsScreen;
