import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import CalendarIcon from '../../assets/calendar.svg';
import LocationPinIcon from '../../assets/location-pin.svg';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTIVE_WIDTH = SCREEN_WIDTH - 40;

interface ActiveTicketCardProps {
    layout?: 'carousel' | 'list';
    onStartRepair?: () => void;
    onViewDetails?: () => void;
    ticket?: any;
}

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const ActiveTicketCard: React.FC<ActiveTicketCardProps> = ({ layout = 'carousel', onStartRepair, onViewDetails, ticket }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? ACTIVE_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    return (
        <CrossPlatformGradient
            colors={['#072A20', '#072A20', '#072A20']}
            style={[styles.activeCard, { width: cardWidth }, marginSpacing]}
        >
            <Text style={styles.title}>{t(ticket?.title || ticket?.mainProblem || 'Active Ticket')}</Text>
            <Text style={styles.subtitle}>{t(ticket?.description || ticket?.problemDescription || 'Repair in progress.')}</Text>

            <View style={styles.iconRow}>
                <CalendarIcon width={16} height={16} fill="#FFFFFF" style={styles.rowIcon} />
                <Text style={styles.whiteText}>{t(formatDate(ticket?.scheduledDate || ticket?.date, locale))}</Text>
            </View>

            <Text style={styles.reachLabel}>
                {t('Time to Reach: ')} <Text style={styles.reachValue}>{t(ticket?.eta || ticket?.estimatedArrival || '30 min')}</Text>
            </Text>

            <TouchableOpacity style={styles.locationRow} activeOpacity={0.8}>
                <LocationPinIcon width={16} height={16} fill="#FFFFFF" style={styles.rowIcon} />
                <Text style={styles.locationText} numberOfLines={2}>{t(ticket?.address?.line1 || ticket?.address || ticket?.location?.address || 'Location pending')}</Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.startBtnOutlined} activeOpacity={0.85} onPress={onStartRepair}>
                    <Text style={styles.startBtnText}>{t('Start Repair')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.viewDetailsBtnSolid} activeOpacity={0.85} onPress={onViewDetails}>
                    <Text style={styles.viewDetailsTextDark}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>
        </CrossPlatformGradient>
    );
};

const styles = StyleSheet.create({
    activeCard: { borderRadius: 28, padding: 24},
    title: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
    subtitle: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#CBD5E1', lineHeight: 20, marginBottom: 8 },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rowIcon: { marginRight: 4 },
    whiteText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#FFFFFF' },
    reachLabel: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#CBD5E1', marginBottom: 8 },
    reachValue: { fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#FFFFFF' },
    locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    locationText: { fontSize: 12, fontFamily: 'Roboto-Medium', color: '#FFFFFF', flex: 1, lineHeight: 20 },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    startBtnOutlined: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FFFFFF', borderRadius: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    viewDetailsBtnSolid: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    viewDetailsTextDark: { color: '#072A20', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '600' },
});

export default ActiveTicketCard;
