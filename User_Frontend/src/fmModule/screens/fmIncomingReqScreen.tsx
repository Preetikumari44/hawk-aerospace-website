import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler, Alert } from 'react-native';
import IncomingRequestCard from '../components/fmIncomingReqCard';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, ResponsiveGrid } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { connectSocket } from '../../utils/socket';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const IncomingRequestsScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [requests, setRequests] = useState<any[]>([]);

    const loadRequests = useCallback(() => {
        fleetApi.getFleetManagerRequests().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.items || data?.data || [];
            setRequests(items);
        }).catch((error: any) => console.error('Failed to load fleet incoming requests', error));
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // ⭐ Real-time refresh: when another fleet manager accepts the booking the
    // other pending requests are cancelled server-side; reload immediately so
    // this FM's list updates without a manual refresh.
    useEffect(() => {
        let cancelled = false;
        let sock: any = null;
        const refresh = () => { if (!cancelled) loadRequests(); };
        connectSocket().then((s) => {
            if (cancelled || !s) return;
            sock = s;
            sock.on('fleetManager:request:accepted', refresh);
            sock.on('fleetManager:request:cancelled', refresh);
            sock.on('fleetManager:request:rejected', refresh);
            sock.on('fleetManager:request:sent', refresh);
            sock.on('booking:fleetManager:assigned', refresh);
        });
        return () => {
            cancelled = true;
            if (sock) {
                sock.off('fleetManager:request:accepted', refresh);
                sock.off('fleetManager:request:cancelled', refresh);
                sock.off('fleetManager:request:rejected', refresh);
                sock.off('fleetManager:request:sent', refresh);
                sock.off('booking:fleetManager:assigned', refresh);
            }
        };
    }, [loadRequests]);

    const handleAccept = useCallback((request: any) => {
        const requestId = request?.requestId || request?.id;
        const bookingId = request?.bookingId;
        if (!requestId || !bookingId) return;
        Alert.alert(
            t('Accept Booking'),
            t('Accept this booking request?'),
            [
                { text: t('No'), style: 'cancel' },
                {
                    text: t('Yes, Accept'),
                    style: 'default',
                    onPress: () => {
                        fleetApi.acceptFleetManagerRequest(requestId, bookingId)
                            .then((res: any) => {
                                const acceptedBooking = res?.booking || res?.data?.booking || res?.mission || null;
                                Alert.alert(t('Booking Accepted'), t('Booking assigned to you successfully.'));
                                loadRequests();
                                onNavigate && onNavigate('BookingDetails', {
                                    status: 'mission_accepted',
                                    mission: acceptedBooking || { ...(request || {}), bookingId, id: bookingId },
                                    bookingId,
                                });
                            })
                            .catch((error: any) => {
                                Alert.alert(t('Accept Failed'), error?.message || t('Could not accept the booking.'));
                                loadRequests();
                            });
                    },
                },
            ],
        );
    }, [onNavigate, loadRequests, t]);

    const handleReject = useCallback((request: any) => {
        const requestId = request?.requestId || request?.id;
        const bookingId = request?.bookingId;
        if (!requestId || !bookingId) return;
        fleetApi.rejectFleetManagerRequest(requestId, bookingId, 'Declined from app')
            .then(() => loadRequests())
            .catch((error: any) => {
                console.error('Failed to reject request', error);
                loadRequests();
            });
    }, [loadRequests]);

    useEffect(() => {
        const onBackPress = () => {
            onNavigate && onNavigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const requestCount = useMemo(() => String(requests.length).padStart(2, '0'), [requests.length]);

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>Incoming Requests ({requestCount})</Text>
                </View>}>
                <ResponsiveGrid>
                    {requests.map((request, idx) => (
                        <View key={idx} style={{ width: '48%' }}>
                            <IncomingRequestCard layout="list" onNavigate={onNavigate} request={request} onAccept={() => handleAccept(request)} onReject={() => handleReject(request)} />
                        </View>
                    ))}
                </ResponsiveGrid>
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Incoming Requests ({requestCount})</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
                {requests.map((request, idx) => (
                    <View key={idx} style={{ marginBottom: 20 }}>
                        <IncomingRequestCard layout="list" onNavigate={onNavigate} request={request} onAccept={() => handleAccept(request)} onReject={() => handleReject(request)} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },
});

export default IncomingRequestsScreen;
