import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

interface AssignedMissionCardProps {
    layout?: 'carousel' | 'list';
    mission?: any;
    onAccept?: () => void;
    onReject?: () => void;
    onViewDetails?: () => void;
}

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const AssignedMissionCard: React.FC<AssignedMissionCardProps> = ({ layout = 'carousel', mission, onAccept, onReject, onViewDetails }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? PEEK_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    return (
        <View style={[styles.assignedCard, { width: cardWidth }, marginSpacing]}>
            <View style={styles.assignedCardHeader}>
                <Text style={styles.assignedCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
                <TouchableOpacity onPress={onViewDetails}><Text style={styles.linkDetails}>{t('View Details')}</Text></TouchableOpacity>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Earnings: ')}<Text style={styles.boldDark}>{mission?.estimatedEarnings || mission?.priceEstimation || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.boldDark}>{t(formatDate(mission?.scheduledDate, locale))}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.boldDark}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#5A6478" color="#5A6478" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </View>
            <Text style={styles.etaLabel}>
                {t('ETA From Home: ')}<Text style={styles.boldDark}>{mission?.eta || mission?.estimatedArrival || t('45 min')}</Text>
            </Text>
            <View style={styles.actionBtnRow}>
                <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85} onPress={onAccept}>
                    <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} activeOpacity={0.85} onPress={onReject}>
                    <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    assignedCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    assignedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    assignedCardTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#0B3A2C', flex: 1, paddingRight: 8 },
    linkDetails: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478', flex: 1 },
    boldDark: { fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    etaLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#5A6478', marginTop: 10 },
    actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    acceptBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    rejectBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#C53030', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    rejectBtnText: { color: '#C53030', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
});

export default AssignedMissionCard;
