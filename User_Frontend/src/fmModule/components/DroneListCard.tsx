import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';

interface DroneListCardProps {
    status?: 'Deployable' | 'Assigned' | 'Under Maintenance';
    onPress?: () => void;
    drone?: any;
}

const STATUS_COLORS: Record<string, string> = {
    Deployable: '#188A4E',
    Assigned: '#0B3A2C',
    'Under Maintenance': '#C53030',
};

const DroneListCard: React.FC<DroneListCardProps> = ({ status = 'Deployable', onPress, drone }) => {
    const { t, locale } = useLanguage();
    const droneName = drone?.model || drone?.name || drone?.droneName || t('Drone');
    const droneId = drone?.id || drone?.droneId || '--';
    const droneType = drone?.type || '--';
    const missions = drone?.totalFlightHours || 0;
    const isDesktop = useIsDesktop();

    if (isDesktop) {
        return (
            <TouchableOpacity style={[styles.card, styles.desktopCard]} activeOpacity={0.85} onPress={onPress}>
                <View style={[styles.topRow, { flex: 2 }]}>
                    <View style={styles.iconCircle}><DroneIcon width={22} height={22} fill="#0B3A2C" color="#0B3A2C" /></View>
                    <Text style={styles.name}>{droneName}</Text>
                </View>
                <View style={{ flex: 1.5 }}><Text style={styles.label}>{t('ID: ')}<Text style={styles.value}>{droneId}</Text></Text></View>
                <View style={{ flex: 1.5 }}><Text style={styles.label}>{t('Type: ')}<Text style={styles.value}>{t(droneType)}</Text></Text></View>
                <View style={{ flex: 1 }}><Text style={styles.label}>{t('Flight Hours: ')}<Text style={styles.value}>{missions}h</Text></Text></View>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={[styles.value, styles.desktopStatusPill, { color: STATUS_COLORS[status], backgroundColor: `${STATUS_COLORS[status]}15` }]}>{t(status)}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            <View style={styles.topRow}>
                <View style={styles.iconCircle}>
                    <DroneIcon width={22} height={22} fill="#0B3A2C" color="#0B3A2C" />
                </View>
                <Text style={styles.name}>{droneName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}><Text style={styles.label}>{t('Type:')}</Text><Text style={styles.value}>{t(droneType)}</Text></View>
            <View style={styles.dataRow}><Text style={styles.label}>{t('Flight Hours:')}</Text><Text style={styles.value}>{missions}h</Text></View>
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
    topRow: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    name: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
    dataRow: { flexDirection: 'row', marginBottom: 6 },
    label: { fontSize: 15, fontWeight: '400', color: '#64748B', marginRight: 6 },
    value: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
});

export default DroneListCard;
