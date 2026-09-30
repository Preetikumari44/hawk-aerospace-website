import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import PhoneIcon from '../../assets/phone.svg';
import AvatarIcon from '../../assets/Avatar.svg';
import DroneIcon from '../../assets/Missions-Inactive.svg';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTIVE_WIDTH = SCREEN_WIDTH - 40;

export type BookingStatus =
    | 'mission_accepted'
    | 'drone_assigned'
    | 'pilot_assigned'
    | 'pilot_in_transit'
    | 'service_started'
    | 'service_ended';

const STATUS_LABELS: Record<BookingStatus, string> = {
    mission_accepted: 'Mission Accepted',
    drone_assigned: 'Drone Assigned',
    pilot_assigned: 'Pilot Assigned',
    pilot_in_transit: 'Pilot In Transit',
    service_started: 'Service Started',
    service_ended: 'Service Ended',
};

const STATUS_ORDER: BookingStatus[] = [
    'mission_accepted',
    'drone_assigned',
    'pilot_assigned',
    'pilot_in_transit',
    'service_started',
    'service_ended',
];

interface ActiveMissionCardProps {
    layout?: 'carousel' | 'list';
    onNavigate?: any;
    status?: BookingStatus;
    mission?: any;
}

const BookingStatusBar = ({ status }: { status: BookingStatus }) => {
    const { t, locale } = useLanguage();
    const activeIndex = STATUS_ORDER.indexOf(status);
    return (
        <View style={styles.statusBarWrap}>
            <View style={styles.statusBarLine}>
                {STATUS_ORDER.map((_, idx) => {
                    const isCurrent = idx === activeIndex;
                    if (isCurrent) {
                        return (
                            <View key={idx} style={styles.statusActiveDotOuter}>
                                <DroneIcon width={16} height={16} fill="#0B3A2C" color="#0B3A2C" />
                            </View>
                        );
                    }
                    return <View key={idx} style={styles.statusDot} />;
                })}
            </View>
            <Text style={styles.statusLabel}>{t(STATUS_LABELS[status])}</Text>
        </View>
    );
};

const formatDate = (value?: string, locale?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale || 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getSlotLabel = (mission?: any) => mission?.preferredTimeSlot || mission?.timeSlot || '';
const getAddress = (mission?: any) => mission?.address?.line1 || mission?.address || mission?.location?.address || '';

const ActiveMissionCard: React.FC<ActiveMissionCardProps> = ({ layout = 'carousel', onNavigate, status = 'pilot_in_transit', mission }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? ACTIVE_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };
    const resolvedStatus = (mission?.uiStatus || status) as BookingStatus;

    return (
        <CrossPlatformGradient
            colors={['#072A20', '#072A20', '#072A20']}
            style={[styles.activeCard, { width: cardWidth }, marginSpacing]}
        >
            <View style={styles.titleRow}>
                <Text style={styles.activeCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
                <TouchableOpacity
                    style={styles.viewDetailsBtnOutlined}
                    activeOpacity={0.85}
                    onPress={() => onNavigate && onNavigate('BookingDetails', { status: resolvedStatus, mission })}
                >
                    <Text style={styles.viewDetailsTextWhite}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} style={styles.rowIcon} />
                <Text style={styles.whiteRowText}>{formatDate(mission?.scheduledDate, locale) || t('Pending')}</Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} style={styles.rowIcon} />
                <Text style={styles.whiteRowText}>{getSlotLabel(mission) || t('To be scheduled')}</Text>
            </View>
            <Text style={styles.reachLabel}>
                {t('Time to Reach: ')}<Text style={styles.reachValue}>{mission?.eta || mission?.estimatedArrival || t('30 min')}</Text>
            </Text>
            <TouchableOpacity style={styles.locationRow} activeOpacity={0.8}>
                <LocationPinIcon width={16} height={16} fill="#FFFFFF" color="#FFFFFF" style={styles.rowIcon} />
                <Text style={styles.locationText}>{getAddress(mission) || t('Location pending')}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>{t('Assigned Pilot')}</Text>
            <View style={styles.personRow}>
                <View style={styles.personLeft}>
                    <AvatarIcon width={32} height={32} style={{ marginRight: 10 }} />
                    <Text style={styles.personName}>
                        {mission?.assignedPilot
                            ? (mission?.pilotName || mission?.assignedPilotName || t('Assigned'))
                            : t('Not Assigned')}
                    </Text>
                </View>
                {mission?.assignedPilot && (
                    <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.85}>
                        <PhoneIcon width={16} height={16} fill="#FFFFFF" color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>{t('Assigned Drone')}</Text>
            <View style={styles.personRow}>
                <View style={styles.personLeft}>
                    <View style={styles.droneIconCircle}>
                        <DroneIcon width={18} height={18} fill="#FFFFFF" color="#FFFFFF" />
                    </View>
                    <View>
                        <Text style={styles.personName}>
                            {mission?.assignedDrone
                                ? (mission?.droneName || mission?.assignedDroneName || t('Assigned'))
                                : t('Not Assigned')}
                        </Text>
                        <Text style={styles.droneIdText}>{mission?.assignedDrone || '--'}</Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16, marginBottom: 4 }]}>{t('Booking Status')}</Text>
            <BookingStatusBar status={resolvedStatus} />
        </CrossPlatformGradient>
    );
};

const styles = StyleSheet.create({
    activeCard: { borderRadius: 28, padding: 24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    activeCardTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    whiteRowText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#FFFFFF' },
    reachLabel: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#CBD5E1', marginTop: 10 },
    reachValue: { fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    locationText: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#FFFFFF', textDecorationLine: 'underline', flex: 1 },
    sectionLabel: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#CBD5E1', marginBottom: 8 },
    personRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    personLeft: { flexDirection: 'row', alignItems: 'center' },
    personName: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    droneIdText: { fontSize: 13, fontFamily: 'Roboto-Regular', color: '#CBD5E1', marginTop: 2 },
    droneIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    phonePillBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    viewDetailsBtnOutlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    viewDetailsTextWhite: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    statusBarWrap: { alignItems: 'center', marginTop: 4 },
    statusBarLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
    statusActiveDotOuter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    statusLabel: { fontSize: 13, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF', marginTop: 10 },
});

export default ActiveMissionCard;
