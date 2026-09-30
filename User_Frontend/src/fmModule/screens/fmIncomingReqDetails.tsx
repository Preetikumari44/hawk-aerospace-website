import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, SplitPane } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const IncomingRequestDetailsScreen: React.FC<{ onNavigate?: any; routeParams?: any }> = ({ onNavigate, routeParams }) => {
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();

    const formatDate = (value?: string) => {
        if (!value) return t('N/A');
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const pick = <T,>(obj: any, ...keys: string[]): T => {
        for (const key of keys) {
            const parts = key.split('.');
            let val = obj;
            for (const part of parts) {
                if (val == null) break;
                val = val[part];
            }
            if (val != null && val !== '') return val as T;
        }
        return t('N/A') as T;
    };

    const [request, setRequest] = useState<any>(routeParams?.request || null);
    const [loading, setLoading] = useState(!routeParams?.request);

    useEffect(() => {
        const onBackPress = () => {
            onNavigate && onNavigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        const reqId = routeParams?.request?.requestId || routeParams?.request?.id || routeParams?.request?._id || routeParams?.request?.serviceId;
        if (reqId) {
            fleetApi.getFleetManagerRequests().then((data: any) => {
                const items = Array.isArray(data) ? data : data?.items || data?.data || [];
                const found = items.find((item: any) =>
                    item.requestId === reqId || item.id === reqId || item._id === reqId || item.serviceId === reqId
                );
                if (found) setRequest(found);
            }).catch(() => {
                /* keep existing data from routeParams */
            }).finally(() => setLoading(false));
        } else if (routeParams?.request) {
            setLoading(false);
        } else {
            fleetApi.getFleetManagerRequests().then((data: any) => {
                const items = Array.isArray(data) ? data : data?.items || data?.data || [];
                if (items.length > 0) setRequest(items[0]);
            }).catch(() => {/* no data available */}).finally(() => setLoading(false));
        }
    }, [routeParams]);

    // Fleet manager requests wrap booking details under `bookingDetails`.
    const r = { ...(request || {}), ...(request?.bookingDetails && typeof request?.bookingDetails === 'object' ? request.bookingDetails : {}) };
    const service = pick<string>(r, 'serviceType', 'service', 'title');
    const subService = pick<string>(r, 'subServiceType', 'subService');
    const infrastructureType = pick<string>(r, 'infrastructureType', 'areaType', 'infrastructure');
    const location = pick<string>(r, 'address.line1', 'address', 'location.address');
    const dateStr = r.scheduledDate ? formatDate(r.scheduledDate) : t('N/A');
    const slot = r.preferredTimeSlot || r.timeSlot || r.scheduledSlot || '';
    const dateTime = slot ? `${dateStr}, ${slot}` : dateStr;
    const landArea = pick<string>(r, 'landArea', 'area', 'landAreaInAcres');
    const drawnLandArea = pick<string>(r, 'drawnLandArea', 'drawnArea');
    const estimatedServiceTime = pick<string>(r, 'estimatedServiceTime', 'serviceTime', 'estimatedDuration');
    const serviceId = pick<string>(r, 'serviceId', 'id', '_id');
    const missionIdVal = pick<string>(r, 'missionId', 'mission.id', 'mission._id');
    const estimatedMissionCompletionTime = pick<string>(r, 'estimatedCompletionTime', 'completionTime');
    const customerName = pick<string>(r, 'customerName', 'customer.name', 'user.name');
    const estimatedCommission = pick<string>(r, 'estimatedCommission', 'commission', 'priceEstimation');
    const total = pick<string>(r, 'total', 'totalAmount', 'estimatedPrice', 'estimatedCommission');
    const paymentStatus = r.paymentStatus || 'Pending';

    const handleAccept = () => {
        const requestId = r.requestId || r.id;
        const bookingId = r.bookingId;
        if (requestId && bookingId) {
            fleetApi.acceptFleetManagerRequest(requestId, bookingId)
                .then((res: any) => {
                    const acceptedBooking = res?.booking || (res?.data as any)?.booking || null;
                    onNavigate && onNavigate('BookingDetails', {
                        status: 'mission_accepted',
                        mission: acceptedBooking || { ...(request || {}), bookingId, id: bookingId },
                        bookingId,
                    });
                })
                .catch((error: any) => {
                    console.error('Failed to accept request', error);
                    onNavigate && onNavigate('BookingDetails', {
                        status: 'mission_accepted',
                        mission: { ...(request || {}), bookingId, id: bookingId },
                        bookingId,
                    });
                });
        } else {
            onNavigate && onNavigate('BookingDetails', {
                status: 'mission_accepted',
                mission: request || {}
            });
        }
    };

    const handleReject = () => {
        const requestId = r.requestId || r.id;
        const bookingId = r.bookingId;
        if (requestId && bookingId) {
            fleetApi.rejectFleetManagerRequest(requestId, bookingId, 'Declined from details')
                .catch((error: any) => console.error('Failed to reject request', error))
                .finally(() => onNavigate && onNavigate('Home'));
        } else {
            onNavigate && onNavigate('Home');
        }
    };

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Mission Details')}</Text>
                </View>}  >
                <SplitPane
                    leftWeight={6} rightWeight={4}
                    left={
                        <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={styles.sectionTitle}>{t('Mission Details')}</Text>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Service')}</Text><Text style={styles.dataValue}>{t(service)}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Sub-Service')}</Text><Text style={styles.dataValue}>{t(subService)}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Location')}</Text><Text style={[styles.dataValue, styles.underlineText]}>{location}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Date & Time')}</Text><Text style={styles.dataValue}>{dateTime}</Text></View>

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>{t('Customer Details')}</Text>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Name')}</Text><Text style={styles.dataValue}>{customerName}</Text></View>
                        </View>
                    }
                    right={
                        <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={styles.financialRow}><Text style={styles.dataLabel}>{t('Estimated Commission')}</Text><Text style={styles.dataValueBold}>₹ {estimatedCommission}</Text></View>
                            <View style={styles.dashedDivider} />
                            <View style={styles.financialRow}><Text style={styles.totalTextLabel}>{t('Total')}</Text><Text style={styles.totalTextValue}>₹ {total}</Text></View>
                            <Text style={styles.dataLabel}>{t('Customer Payment Status:')}</Text>
                            <Text style={styles.paymentPendingText}>{t('Payment {{status}}', { status: t(paymentStatus) })}</Text>

                            <View style={[styles.btnRow, { marginTop: 32 }]}>
                                <TouchableOpacity style={styles.acceptBtnSolid} onPress={handleAccept}><Text style={styles.acceptBtnText}>{t('Accept')}</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.rejectBtnOutlined} onPress={handleReject}><Text style={styles.rejectBtnText}>{t('Reject')}</Text></TouchableOpacity>
                            </View>
                        </View>
                    }
                />
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Mission Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                <Text style={styles.sectionTitle}>{t('Mission Details')}</Text>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Service')}</Text><Text style={styles.dataValue}>{t(service)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Sub-Service')}</Text><Text style={styles.dataValue}>{t(subService)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Infrastructure Type')}</Text><Text style={styles.dataValue}>{t(infrastructureType)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Date & Time')}</Text><Text style={styles.dataValue}>{dateTime}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Location')}</Text><Text style={[styles.dataValue, styles.underlineText]}>{location}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Land Area in Acres')}</Text><Text style={styles.dataValue}>{landArea}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Drawn Land Area  in Acres')}</Text><Text style={styles.dataValue}>{drawnLandArea}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Estimated Service Time')}</Text><Text style={styles.dataValue}>{estimatedServiceTime}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Service ID')}</Text><Text style={styles.dataValue}>{serviceId}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Mission ID')}</Text><Text style={styles.dataValue}>{missionIdVal}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Estimated Mission Completion Time')}</Text><Text style={styles.dataValue}>{estimatedMissionCompletionTime}</Text></View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>{t('Customer Details')}</Text>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Name')}</Text><Text style={styles.dataValue}>{customerName}</Text></View>

                <View style={styles.divider} />

                <View style={styles.financialRow}>
                    <Text style={styles.dataLabel}>{t('Estimated Commission')}</Text>
                    <Text style={styles.dataValueBold}>₹ {estimatedCommission}</Text>
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.financialRow}>
                    <Text style={styles.totalTextLabel}>{t('Total')}</Text>
                    <Text style={styles.totalTextValue}>₹ {total}</Text>
                </View>
                <Text style={styles.dataLabel}>{t('Customer Payment Status:')}</Text>
                <Text style={styles.paymentPendingText}>{t('Payment {{status}}', { status: t(paymentStatus) })}</Text>

                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.acceptBtnSolid} activeOpacity={0.85} onPress={handleAccept}>
                        <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtnOutlined} activeOpacity={0.85} onPress={handleReject}>
                        <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    dataBlockTight: { marginBottom: 14, marginTop: 10 },
    dataLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 },
    dataValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    underlineText: { textDecorationLine: 'underline' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
    dashedDivider: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 14 },

    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dataValueBold: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    totalTextLabel: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    totalTextValue: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    paymentPendingText: { fontSize: 16, fontWeight: '700', color: '#C53030', marginBottom: 8 },

    btnRow: { gap: 14, marginTop: 16, paddingBottom: 24 },
    acceptBtnSolid: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    rejectBtnOutlined: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#C53030', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    rejectBtnText: { color: '#C53030', fontSize: 16, fontWeight: '500' },
});

export default IncomingRequestDetailsScreen;
