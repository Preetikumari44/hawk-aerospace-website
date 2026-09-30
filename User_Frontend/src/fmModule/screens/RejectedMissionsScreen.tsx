import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler, ActivityIndicator } from 'react-native';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

interface RejectedMission {
  id: string;
  title?: string;
  serviceType?: string;
  estimatedCommission?: number;
  commission?: number;
  date?: string;
  scheduledDate?: string;
  timeSlot?: string;
  location?: string;
  etaMinutes?: number;
  status?: string;
}

// ── Safe text helpers: backend location/address fields can be objects
// ({ lat, lng } / { line1, ... }). Rendering an object inside <Text>
// crashes the app (red screen / force close) — always coerce to string.
const toText = (value: any, fallback = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
        return String(
            value?.line1 || value?.address || value?.label || value?.name || fallback,
        );
    }
    return String(value);
};

const resolveAddress = (mission: any): string => {
    return (
        toText(mission?.address?.line1) ||
        toText(mission?.address) ||
        toText(mission?.location?.address) ||
        toText(mission?.bookingDetails?.location?.address) ||
        toText(mission?.location) ||
        ''
    );
};

const resolveDate = (mission: any): string => {
    return toText(mission?.scheduledDate || mission?.date || mission?.bookingDetails?.scheduledDate);
};

const resolveTimeSlot = (mission: any): string => {
    return toText(
        mission?.preferredTimeSlot || mission?.timeSlot || mission?.scheduledSlot,
    );
};

const resolveCommission = (mission: any): string => {
    const raw = mission?.estimatedCommission ?? mission?.commission ?? mission?.priceEstimation ?? mission?.bookingDetails?.estimatedCommission;
    if (raw === null || raw === undefined || raw === '') return '';
    return typeof raw === 'number' ? raw.toLocaleString() : String(raw);
};

const RejectedCard = ({ mission, onAccept, onViewDetails }: { mission: RejectedMission; onAccept?: () => void; onViewDetails?: () => void }) => {
    const { t, locale } = useLanguage();
    const address = resolveAddress(mission);
    const dateStr = resolveDate(mission);
    const slot = resolveTimeSlot(mission);
    const commission = resolveCommission(mission);
    return (
    <View style={styles.card}>
        <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
                {toText((mission as any)?.serviceType || (mission as any)?.title, 'Land Mapping')}
            </Text>
            <TouchableOpacity style={styles.viewDetailsBtn} activeOpacity={0.85} onPress={onViewDetails}>
                <Text style={styles.viewDetailsText}>{t('View Details')}</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.iconDataRow}>
            <RupeeIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
            <Text style={styles.grayRowText} numberOfLines={1}>
              {t('Est. Commission: ')}<Text style={styles.boldDark}>{commission || t('Not available')}</Text>
            </Text>
        </View>
        <View style={styles.iconDataRow}>
            <CalendarIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
            <Text style={styles.grayRowText} numberOfLines={1}>
              {t('Date: ')}<Text style={styles.boldDark}>{dateStr || t('Not available')}</Text>
            </Text>
        </View>
        <View style={styles.iconDataRow}>
            <ClockIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
            <Text style={styles.grayRowText} numberOfLines={1}>
              {t('Time Slot: ')}<Text style={styles.boldDark}>{slot || t('Not available')}</Text>
            </Text>
        </View>
        <View style={styles.iconDataRow}>
            <LocationPinIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.rowIcon} />
            <Text style={styles.grayRowText} numberOfLines={1}>{address || t('Location not specified')}</Text>
        </View>
        <Text style={styles.etaText} numberOfLines={1}>{t('ETA From Home: ')}<Text style={styles.boldDark}>{mission.etaMinutes ? t('{{etaMinutes}} min', { etaMinutes: mission.etaMinutes }) : t('Not available')}</Text></Text>
        <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85} onPress={onAccept}>
            <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
        </TouchableOpacity>
    </View>
    );
};

const normalizeList = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    return data?.missions || data?.items || data?.data || [];
};

const RejectedMissionsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const [rejectedMissions, setRejectedMissions] = useState<RejectedMission[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();

    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('Home'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        let cancelled = false;
        Promise.allSettled([
            fleetApi.getMissions().catch(() => []),
            fleetApi.getRejectedMissions().catch(() => []),
            (fleetApi as any).getFleetManagerRequestHistory
                ? (fleetApi as any).getFleetManagerRequestHistory().catch(() => [])
                : Promise.resolve([]),
        ]).then(([missionsRes, rejectedRes, historyRes]) => {
            if (cancelled) return;
            const missions = normalizeList(
                missionsRes.status === 'fulfilled' ? missionsRes.value : [],
            );
            const rejectedEndpoint = normalizeList(
                rejectedRes.status === 'fulfilled' ? rejectedRes.value : [],
            );
            const history = normalizeList(
                historyRes.status === 'fulfilled' ? historyRes.value : [],
            );
            const rejectedHistory = history.filter((item: any) =>
                ['rejected', 'timeout', 'cancelled'].includes(String(item?.status || '').toLowerCase()),
            );
            // Merge + dedupe by booking/request id so every rejected mission
            // shows up even if it never became an assigned mission.
            const seen = new Set<string>();
            const merged: any[] = [];
            const pushUnique = (item: any) => {
                const key = String(
                    item?.bookingId || item?.booking?.id || item?.id || item?.requestId || JSON.stringify(item).slice(0, 48),
                );
                if (seen.has(key)) return;
                seen.add(key);
                merged.push(item);
            };
            missions
                .filter((item: any) =>
                    ['cancelled', 'rejected'].includes(String(item?.status || '').toLowerCase()),
                )
                .forEach(pushUnique);
            rejectedEndpoint.forEach(pushUnique);
            rejectedHistory.forEach(pushUnique);
            setRejectedMissions(merged);
            setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.pageHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>
                  {t('Rejected Missions ({{count}})', { count: String(rejectedMissions.length).padStart(2, '0') })}
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
                {loading ? (
                  <ActivityIndicator size="large" color="#0B3A2C" style={{ marginTop: 40 }} />
                ) : rejectedMissions.length === 0 ? (
                  <Text style={styles.emptyText}>{t('No rejected missions.')}</Text>
                ) : (
                  rejectedMissions.map((mission: any, idx) => {
                    const bookingId = mission?.bookingId || mission?.booking?.id || mission?.id;
                    return (
                    <RejectedCard
                        key={mission?.id || mission?.requestId || bookingId || idx}
                        mission={mission}
                        onAccept={() => onNavigate && onNavigate('BookingDetails', { status: 'mission_accepted', mission, bookingId })}
                        onViewDetails={() => onNavigate && onNavigate('IncomingRequestDetails', { request: mission })}
                    />
                    );
                  })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    pageHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },
    emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 40 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '500', color: '#0B3A2C', flex: 1, paddingRight: 8 },
    viewDetailsBtn: { borderWidth: 1.5, borderColor: '#0B3A2C', borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14 },
    viewDetailsText: { fontSize: 14, fontWeight: '500', color: '#0B3A2C' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, color: '#64748B', flex: 1 },
    boldDark: { fontWeight: '600', color: '#1E293B' },
    etaText: { fontSize: 15, color: '#64748B', marginTop: 10, marginBottom: 16 },
    acceptBtn: { backgroundColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

export default RejectedMissionsScreen;
