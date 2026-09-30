import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

interface NextTicketCardProps {
    layout?: 'carousel' | 'list';
    onStartTransit?: () => void;
    onViewDetails?: () => void;
    ticket?: any;
}

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const NextTicketCard: React.FC<NextTicketCardProps> = ({ layout = 'carousel', onStartTransit, onViewDetails, ticket }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? PEEK_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    return (
        <View style={[styles.card, { width: cardWidth }, marginSpacing]}>
            <Text style={styles.title}>{t(ticket?.title || ticket?.mainProblem || 'Upcoming Ticket')}</Text>

            <View style={styles.iconRow}>
                <RupeeIcon width={12} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Est. Earnings: ')} <Text style={styles.boldDark}>{t(ticket?.estimatedEarnings || ticket?.amount || 'N/A')}</Text></Text>
            </View>

            <View style={styles.iconRow}>
                <CalendarIcon width={12} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText}>{t('Date: ')} <Text style={styles.boldDark}>{t(formatDate(ticket?.scheduledDate || ticket?.date, locale))}</Text></Text>
            </View>

            <View style={styles.iconRow}>
                <LocationPinIcon width={12} height={16} fill="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayText} numberOfLines={1}>{t(ticket?.address?.line1 || ticket?.address || ticket?.location?.address || 'Location pending')}</Text>
            </View>

            <Text style={styles.etaLabel}>
                {t('ETA From Home: ')} <Text style={styles.boldDark}>{t(ticket?.eta || ticket?.estimatedArrival || '45 min')}</Text>
            </Text>

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.startBtnSolid} activeOpacity={0.85} onPress={onStartTransit}>
                    <Text style={styles.startBtnText}>{t('Start Transit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.viewDetailsBtnOutlined} activeOpacity={0.85} onPress={onViewDetails}>
                    <Text style={styles.viewDetailsTextBlue}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24 },
    title: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#0B3A2C', marginBottom: 12 },
    iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    rowIcon: { marginRight: 6 },
    grayText: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478', flex: 1 },
    boldDark: { fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B' },
    etaLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 8 },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    startBtnSolid: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    viewDetailsBtnOutlined: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#0B3A2C', borderRadius: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    viewDetailsTextBlue: { color: '#0B3A2C', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
});

export default NextTicketCard;
