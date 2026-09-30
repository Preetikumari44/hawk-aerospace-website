import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

interface IncomingRequestCardProps {
    layout?: 'carousel' | 'list';
    onNavigate?: any;
    onAccept?: () => void;
    onReject?: () => void;
    request?: any;
}

const formatDate = (value?: string, locale?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale || 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSlot = (request?: any) => request?.preferredTimeSlot || request?.timeSlot || request?.scheduledSlot || '';
const getAddress = (request?: any) => request?.address?.line1 || request?.address || request?.location?.address || '';

const IncomingRequestCard: React.FC<IncomingRequestCardProps> = ({ layout = 'carousel', onNavigate, onAccept, onReject, request }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? PEEK_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    // Fleet manager requests wrap the booking details under `bookingDetails`.
    const bd = request?.bookingDetails && typeof request?.bookingDetails === 'object' ? request.bookingDetails : request || {};
    const serviceType = bd.serviceType || bd.service || request?.serviceType || request?.title || t('Booking Request');
    const scheduledDate = bd.scheduledDate || request?.scheduledDate;
    const address = bd.address?.line1 || bd.address || bd.location?.address || request?.address?.line1 || request?.address || request?.location?.address || '';
    const estimatedCommission = bd.priceEstimation || request?.estimatedCommission || request?.commission || request?.priceEstimation;

    return (
        <View style={[styles.card, { width: cardWidth }, marginSpacing]}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{serviceType}</Text>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('IncomingRequestDetails', { request })}><Text style={styles.linkDetails}>{t('View Details')}</Text></TouchableOpacity>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Est. Commission: ')}<Text style={styles.boldDark}>{estimatedCommission || t('N/A')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.boldDark}>{formatDate(scheduledDate, locale) || t('Pending')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time Slot: ')}<Text style={styles.boldDark}>{formatSlot(bd) || t('To be scheduled')}</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{address || t('Location pending')}</Text>
            </View>

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
    card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#0B3A2C', flex: 1, paddingRight: 8 },
    linkDetails: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#0B3A2C', fontWeight: '500' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#64748B', flex: 1 },
    boldDark: { fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    etaLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#64748B', marginTop: 10 },
    actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    acceptBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    rejectBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#C53030', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    rejectBtnText: { color: '#C53030', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
});

export default IncomingRequestCard;
