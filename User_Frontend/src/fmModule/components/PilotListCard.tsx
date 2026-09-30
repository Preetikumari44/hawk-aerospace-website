import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AvatarIcon from '../../assets/Avatar.svg';
import PhoneIcon from '../../assets/phone.svg';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';

interface PilotListCardProps {
    status?: 'Available' | 'Assigned' | 'Off-Duty';
    onPress?: () => void;
    showPhone?: boolean;
    pilot?: any;
}

const STATUS_COLORS: Record<string, string> = {
    Available: '#188A4E',
    Assigned: '#0B3A2C',
    'Off-Duty': '#C53030',
};

const PilotListCard: React.FC<PilotListCardProps> = ({ status = 'Available', onPress, showPhone = true, pilot }) => {
    const { t, locale } = useLanguage();
    const pilotName = pilot?.name || pilot?.fullName || t('Pilot Name');
    const pilotId = pilot?.id || pilot?.uid || pilot?.pilotId || 'PLT-165472-JY7';
    const rating = pilot?.rating || pilot?.averageRating || '0.00';
    const flights = pilot?.totalFlights || pilot?.missionsCount || pilot?.totalMissions || '0000';
    const missions = pilot?.totalMissions || pilot?.missionsCount || '016';
    const isDesktop = useIsDesktop();

    if (isDesktop) {
        return (
            <TouchableOpacity style={[styles.card, styles.desktopCard]} activeOpacity={0.85} onPress={onPress}>
                <View style={[styles.leftRow, { flex: 2.5 }]}>
                    <AvatarIcon width={44} height={44} style={{ marginRight: 12 }} />
                    <View>
                        <Text style={styles.name}>{pilotName}</Text>
                        <Text style={styles.rating}>{t('Rating {{rating}} ({{flights}}) flights', { rating, flights })}</Text>
                    </View>
                </View>
                <View style={{ flex: 1.5 }}><Text style={styles.label}>{t('ID: ')}<Text style={styles.value}>{pilotId}</Text></Text></View>
                <View style={{ flex: 1 }}><Text style={styles.label}>{t('Missions: ')}<Text style={styles.value}>{missions}</Text></Text></View>
                <View style={{ flex: 1.5, alignItems: 'center' }}>
                    <Text style={[styles.value, styles.desktopStatusPill, { color: STATUS_COLORS[status], backgroundColor: `${STATUS_COLORS[status]}15` }]}>{t(status)}</Text>
                </View>
                <View style={{ flex: 0.5, alignItems: 'flex-end' }}>
                    {showPhone && (
                        <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.8}><PhoneIcon width={18} height={18} fill="#1E293B" color="#1E293B" /></TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            <View style={styles.topRow}>
                <View style={styles.leftRow}>
                    <AvatarIcon width={44} height={44} style={{ marginRight: 12 }} />
                    <View>
                        <Text style={styles.name}>{pilotName}</Text>
                        <Text style={styles.rating}>{t('Rating {{rating}} ({{flights}}) flights', { rating, flights })}</Text>
                    </View>
                </View>
                {showPhone && (
                    <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.8}>
                        <PhoneIcon width={18} height={18} fill="#1E293B" color="#1E293B" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}><Text style={styles.label}>{t('Pilot ID:')}</Text><Text style={styles.value}>{pilotId}</Text></View>
            <View style={styles.dataRow}><Text style={styles.label}>{t('Total Missions:')}</Text><Text style={styles.value}>{missions}</Text></View>
            <View style={styles.dataRow}>
                <Text style={styles.label}>{t('Current Status:')}</Text>
                <Text style={[styles.value, { color: STATUS_COLORS[status] }]}>{t(status)}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    desktopCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 },
    desktopStatusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    leftRow: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    rating: { fontSize: 13, color: '#64748B', marginTop: 2 },
    phoneBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
    dataRow: { flexDirection: 'row', marginBottom: 6 },
    label: { fontSize: 15, fontWeight: '400', color: '#64748B', marginRight: 6 },
    value: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
});

export default PilotListCard;
