import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import DocumentIcon from '../../assets/CardView.svg';
import MissionHistoryCard from '../components/fmMissionHistoryCard';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, ResponsiveGrid, SplitPane } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const STATUS_COLORS: Record<string, string> = {
    Deployable: '#188A4E',
    Assigned: '#0B3A2C',
    Maintenance: '#C53030',
};

const STATUS_LABELS: Record<string, string> = {
    Deployable: 'Deployable',
    Assigned: 'Assigned',
    Maintenance: 'Under Maintenance',
};

const normalizeStatus = (raw?: string): 'Deployable' | 'Assigned' | 'Maintenance' => {
    const s = String(raw || '').toLowerCase();
    if (s.includes('assigned') || s.includes('busy')) return 'Assigned';
    if (s.includes('maintenance')) return 'Maintenance';
    return 'Deployable';
};

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const resolveName = (obj: any, t: TranslateFn) => obj?.name || obj?.droneName || obj?.title || t('Not available');
const resolveId = (obj: any, t: TranslateFn) => obj?.droneId || obj?.id || obj?.identifier || t('Not available');
const resolveModel = (obj: any, t: TranslateFn) => obj?.modelNumber || obj?.model || obj?.modelNo || t('Not available');
const resolveCompany = (obj: any, t: TranslateFn) => obj?.company || obj?.manufacturer || obj?.brand || t('Not available');
const resolveYear = (obj: any, t: TranslateFn) => obj?.manufacturingYear || obj?.year || obj?.makeYear || t('Not available');
const resolveDroneType = (obj: any, t: TranslateFn) => obj?.type || obj?.droneType || obj?.serviceType || t('Not available');
const resolveDocName = (doc: any, t: TranslateFn) => doc?.name || doc?.documentName || doc?.title || t('Untitled Document');
const resolveMissionPilot = (m: any, t: TranslateFn) => m?.pilotName || m?.pilotLabel || m?.personLabel || m?.pilot?.name || t('Unknown Pilot');

const DroneDetailsScreen: React.FC<{
    onNavigate?: any;
    status?: 'Deployable' | 'Assigned' | 'Maintenance';
    drone?: any;
    routeParams?: any;
}> = ({ onNavigate, status: propStatus = 'Deployable', drone: propDrone, routeParams }) => {
    const { t } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [drone, setDrone] = useState<any>(propDrone || routeParams?.drone || null);

    useEffect(() => {
        const onBackPress = () => {
            onNavigate && onNavigate('YourDrones');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        if (drone) return;
        const droneId = routeParams?.droneId || routeParams?.drone?.id || routeParams?.drone?.droneId;
        if (droneId) {
            fleetApi.getDrone(droneId).then(setDrone).catch(() => {
                fleetApi.getDrones().then((data: any) => {
                    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
                    const found = items.find((d: any) => d.id === droneId || d.droneId === droneId);
                    if (found) setDrone(found);
                }).catch(() => {});
            });
        }
    }, [drone, routeParams?.droneId]);

    const effectiveStatus: 'Deployable' | 'Assigned' | 'Maintenance' =
        drone?.status || drone?.availability
            ? normalizeStatus(drone.status || drone.availability)
            : propStatus;

    const isDesktop = useIsDesktop();
    const documents = drone?.documents || drone?.docs || [];
    const missions = drone?.missions || drone?.missionHistory || [];

    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('YourDrones')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Drone Details')}</Text>
                </View>}       >
                <SplitPane
                    leftWeight={4} rightWeight={6}
                    left={
                        <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={styles.profileRow}>
                                <View style={styles.iconCircle}><DroneIcon width={24} height={24} fill="#0B3A2C" color="#0B3A2C" /></View>
                                <Text style={styles.name}>{resolveName(drone, t)}</Text>
                            </View>
                            <Text style={styles.dataLabel}>{t('Current Status:')} <Text style={[styles.statusValue, { color: STATUS_COLORS[effectiveStatus] }]}>{t(STATUS_LABELS[effectiveStatus])}</Text></Text>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Drone ID')}</Text><Text style={styles.dataValue}>{resolveId(drone, t)}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Drone Type')}</Text><Text style={styles.dataValue}>{t(resolveDroneType(drone, t))}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Model Number')}</Text><Text style={styles.dataValue}>{resolveModel(drone, t)}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Company')}</Text><Text style={styles.dataValue}>{resolveCompany(drone, t)}</Text></View>

                            {effectiveStatus === 'Deployable' && (
                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={styles.assignBtn} onPress={() => onNavigate && onNavigate('IncomingRequests')}><Text style={styles.assignBtnText}>{t('Assign Mission')}</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.removeBtn}><Text style={styles.removeBtnText}>{t('Remove Drone')}</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    }
                    right={
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{t('Documents')}</Text>
                            <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
                                {documents.map((doc: any, idx: number) => (
                                    <View key={idx} style={styles.docRow}>
                                        <DocumentIcon width={16} height={16} fill="#64748B" color="#64748B" />
                                        <Text style={styles.docText}>{resolveDocName(doc, t)}</Text>
                                    </View>
                                ))}
                                {documents.length === 0 && <Text style={styles.emptyText}>{t('No documents available')}</Text>}
                                <TouchableOpacity style={styles.addDocBtn}><Text style={styles.addDocBtnText}>{t('Add New Document')}</Text></TouchableOpacity>
                            </View>

                            <Text style={styles.sectionTitle}>{t('Total Missions')}</Text>
                            <ResponsiveGrid>
                                {missions.map((m: any, idx: number) => (
                                    <View key={idx} style={{ width: '48%' }}><MissionHistoryCard personLabel={resolveMissionPilot(m, t)} /></View>
                                ))}
                                {missions.length === 0 && <Text style={styles.emptyText}>{t('No mission history available')}</Text>}
                            </ResponsiveGrid>
                        </>
                    }
                />
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('YourDrones')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Drone Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                <View style={styles.profileRow}>
                    <View style={styles.iconCircle}>
                        <DroneIcon width={24} height={24} fill="#0B3A2C" color="#0B3A2C" />
                    </View>
                    <Text style={styles.name}>{resolveName(drone, t)}</Text>
                </View>

                <Text style={styles.dataLabel}>{t('Current Status:')}
                    <Text style={[styles.statusValue, { color: STATUS_COLORS[effectiveStatus] }]}> {t(STATUS_LABELS[effectiveStatus])}</Text>
                </Text>

                {effectiveStatus === 'Assigned' && (
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Mission Name:')}</Text>
                        <Text style={[styles.dataValue, styles.underlineBlue]}>{drone?.missionName || drone?.mission?.name || t('Not available')}</Text>
                    </View>
                )}

                {effectiveStatus === 'Maintenance' && (
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Maintenance Ticket ID')}</Text>
                        <Text style={[styles.dataValue, styles.underlineBlue]}>{drone?.maintenanceTicket || drone?.ticketId || drone?.maintenance?.ticketId || t('Not available')}</Text>
                    </View>
                )}

                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Drone ID')}</Text><Text style={styles.dataValue}>{resolveId(drone, t)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Drone Type')}</Text><Text style={styles.dataValue}>{t(resolveDroneType(drone, t))}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Model Number')}</Text><Text style={styles.dataValue}>{resolveModel(drone, t)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Company')}</Text><Text style={styles.dataValue}>{resolveCompany(drone, t)}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Manufacturing Year')}</Text><Text style={styles.dataValue}>{resolveYear(drone, t)}</Text></View>

                {effectiveStatus === 'Deployable' && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.assignBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('IncomingRequests')}
                        >
                            <Text style={styles.assignBtnText}>{t('Assign Mission')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeBtn} activeOpacity={0.85}>
                            <Text style={styles.removeBtnText}>{t('Remove Drone')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.sectionTitle}>{t('Documents')}</Text>
                {documents.map((doc: any, idx: number) => (
                    <View key={idx} style={styles.docRow}>
                        <DocumentIcon width={16} height={16} fill="#64748B" color="#64748B" />
                        <Text style={styles.docText}>{resolveDocName(doc, t)}</Text>
                    </View>
                ))}
                {documents.length === 0 && <Text style={styles.emptyText}>{t('No documents available')}</Text>}
                <TouchableOpacity style={styles.addDocBtn} activeOpacity={0.85}>
                    <Text style={styles.addDocBtnText}>{t('Add New Document')}</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{t('Total Missions')}</Text>
                {missions.map((m: any, idx: number) => (
                    <MissionHistoryCard key={idx} personLabel={resolveMissionPilot(m, t)} />
                ))}
                {missions.length === 0 && <Text style={styles.emptyText}>{t('No mission history available')}</Text>}

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

    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    name: { fontSize: 18, fontWeight: '500', color: '#1E293B' },

    dataLabel: { fontSize: 14, color: '#64748B', marginBottom: 4, marginTop: 4 },
    statusValue: { fontWeight: '600' },
    dataBlockTight: { marginBottom: 14, marginTop: 10 },
    dataValue: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    underlineBlue: { color: '#0B3A2C', textDecorationLine: 'underline' },

    btnRow: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 28 },
    assignBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    assignBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
    removeBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C53030', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    removeBtnText: { color: '#C53030', fontSize: 15, fontWeight: '500' },

    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 24, marginBottom: 14 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    docText: { fontSize: 15, color: '#334155' },
    addDocBtn: { borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    addDocBtnText: { fontSize: 15, fontWeight: '500', color: '#475569' },
    emptyText: { fontSize: 14, color: '#94A3B8', paddingVertical: 12 },
});

export default DroneDetailsScreen;
