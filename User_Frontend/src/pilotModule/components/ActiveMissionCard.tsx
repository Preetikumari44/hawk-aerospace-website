import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';

import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTIVE_WIDTH = SCREEN_WIDTH - 40;

interface ActiveMissionCardProps {
    layout?: 'carousel' | 'list';
    onNavigate?: any;
    mission?: any;
    onStartMission?: () => void;
}

const formatDate = (value?: string, locale?: string) => {
    if (!value) return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const ActiveMissionCard: React.FC<ActiveMissionCardProps> = ({ layout = 'carousel', onNavigate, mission, onStartMission }) => {
    const { t, locale } = useLanguage();
    const cardWidth = layout === 'carousel' ? ACTIVE_WIDTH : '100%';
    const marginSpacing = layout === 'carousel' ? { marginRight: 16 } : { marginBottom: 16 };

    return (
        <CrossPlatformGradient
            colors={['#072A20', '#072A20', '#072A20']}
            style={[styles.activeCard, { width: cardWidth }, marginSpacing]}
        >
            <Text style={styles.activeCardTitle}>{mission?.serviceType || mission?.title || t('Mission')}</Text>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={16} height={16} style={styles.rowIcon} />
                <Text style={styles.whiteRowText}>{t(formatDate(mission?.scheduledDate, locale))}</Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={16} height={16} style={styles.rowIcon} />
                <Text style={styles.whiteRowText}>{mission?.preferredTimeSlot || mission?.timeSlot || t('To be scheduled')}</Text>
            </View>
            <Text style={styles.reachLabel}>
                {t('Time to Reach: ')}<Text style={styles.reachValue}>{mission?.eta || mission?.estimatedArrival || t('30 min')}</Text>
            </Text>
            <TouchableOpacity style={styles.locationRow} activeOpacity={0.8}>
                <LocationPinIcon width={16} height={16} fill="#FFFFFF" color="#FFFFFF" style={styles.rowIcon} />
                <Text style={styles.locationText}>{mission?.address?.line1 || mission?.address || mission?.location?.address || t('Location pending')}</Text>
            </TouchableOpacity>
            <Text style={styles.stepsLabel}>
                {t('Next Steps: ')}<Text style={styles.stepsValue}>{mission?.nextStep || t('Collect Drone from Fleet Manager')}</Text>
            </Text>
            <View style={styles.actionBtnRow}>
                <TouchableOpacity style={styles.startBtn} activeOpacity={0.85} onPress={onStartMission}>
                    <Text style={styles.startBtnText}>{t('Start Mission')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.viewDetailsBtnOutlined}
                    activeOpacity={0.85}
                    onPress={() => onNavigate && onNavigate('ActiveMissionDetails', { missionId: mission?.id, mission })}
                >
                    <Text style={styles.viewDetailsTextWhite}>{t('View Details')}</Text>
                </TouchableOpacity>
            </View>
        </CrossPlatformGradient>
    );
};

const styles = StyleSheet.create({
    activeCard: { borderRadius: 16, padding: 20, elevation: 4, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20 },
    activeCardTitle: { fontSize: 24, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF', marginBottom: 14 },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    whiteRowText: { fontSize: 15, fontFamily: 'Roboto-Medium', color: '#FFFFFF' },
    reachLabel: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#CBD5E1', marginTop: 10 },
    reachValue: { fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    locationText: { fontSize: 14, fontFamily: 'Roboto-Medium', color: '#FFFFFF', textDecorationLine: 'underline', flex: 1 },
    stepsLabel: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#CBD5E1' },
    stepsValue: { fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#FFFFFF' },
    actionBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    startBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#0B3A2C', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    viewDetailsBtnOutlined: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FFFFFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    viewDetailsTextWhite: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
});

export default ActiveMissionCard;
