import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import AvatarIcon from '../../assets/Avatar.svg';
import PhoneIcon from '../../assets/phone.svg';
import DocumentIcon from '../../assets/CardView.svg';
import MissionHistoryCard from '../components/fmMissionHistoryCard';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, SplitPane, ResponsiveGrid } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const STATUS_COLORS: Record<string, string> = {
    Available: '#188A4E',
    Assigned: '#0B3A2C',
    'Off-Duty': '#C53030',
};

const PilotDetailsScreen: React.FC<{ onNavigate?: any; status?: 'Available' | 'Assigned' | 'Off-Duty'; pilot?: any; pilotId?: string; routeParams?: any }> = ({ onNavigate, status: statusProp, pilot: pilotProp, pilotId, routeParams }) => {
    const { t } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const resolvedPilot = pilotProp || routeParams?.pilot || null;
    const [pilotData, setPilotData] = useState<any>(resolvedPilot);
    const [loading, setLoading] = useState(!resolvedPilot && !!pilotId);

    const pilot = pilotData?.pilot || pilotData || pilotProp || routeParams?.pilot || {};
    const responseMissions = pilotData?.missions || [];
    const responseStats = pilotData?.stats || {};
    const status = statusProp || pilot?.status || pilot?.availability || 'Available';
    const pilotName = pilot?.name || pilot?.fullName || t('Unknown Pilot');
    const pilotIdentifier = pilot?.id || pilot?.uid || pilot?.pilotId || '';
    const rating = pilot?.rating || pilot?.averageRating || '0.00';
    const flights = pilot?.totalFlights || pilot?.missionsCount || pilot?.totalMissions || '0';
    const phoneNumber = pilot?.phone || pilot?.phoneNumber || pilot?.mobile || pilot?.profileData?.phone || pilot?.profileData?.mobile || '';
    const email = pilot?.email || pilot?.profileData?.email || '';
    const licenseNumber = pilot?.licenseNumber || pilot?.license || pilotIdentifier;
    const joiningDate = pilot?.joiningDate || pilot?.joinedAt || pilot?.createdAt || pilot?.updatedAt || '';
    const missionName = pilot?.currentMission?.name || pilot?.currentMission || '';
    const documents = pilot?.documents || [];
    const missions = responseMissions.length > 0 ? responseMissions : (pilot?.missions || []);
    // ── Service types + specializations from every known doc shape ──
    // (users docs: profileData.serviceTypes / profileData.specializations;
    // pilots collection: serviceTypes / certifications / specializations).
    const serviceTypes: string[] = (
        pilot?.serviceTypes ||
        pilot?.profileData?.serviceTypes ||
        []
    );
    const specializations: string[] = (
        pilot?.specializations ||
        pilot?.profileData?.specializations ||
        pilot?.certifications ||
        pilot?.profileData?.certifications ||
        []
    );
    const serviceTypesText = Array.isArray(serviceTypes) && serviceTypes.length > 0
        ? serviceTypes.join(', ')
        : t('N/A');
    const specializationsText = Array.isArray(specializations) && specializations.length > 0
        ? specializations.join(', ')
        : t('N/A');

    useEffect(() => {
        const onBackPress = () => {
            onNavigate && onNavigate('YourPilots');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        if (!resolvedPilot && pilotId) {
            setLoading(true);
            fleetApi.getPilot(pilotId).then((data: any) => {
                setPilotData(data);
            }).catch((error: any) => {
                console.error('Failed to load pilot details', error);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [pilotId, resolvedPilot]);

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('YourPilots')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Pilot Details')}</Text>
                </View>}           >
                <SplitPane
                    leftWeight={4} rightWeight={6}
                    left={
                        <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <View style={styles.profileRow}>
                                <AvatarIcon width={48} height={48} style={{ marginRight: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{pilotName}</Text>
                                    <Text style={styles.rating}>⭐ {t('Rating {{rating}} ({{flights}}) flights', { rating, flights })}</Text>
                                </View>
                                <TouchableOpacity style={styles.phoneBtn}><PhoneIcon width={18} height={18} fill="#1E293B" color="#1E293B" /></TouchableOpacity>
                            </View>

                            <Text style={styles.dataLabel}>{t('Current Status:')} <Text style={[styles.statusValue, { color: STATUS_COLORS[status] }]}> {t(status)}</Text></Text>

                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Pilot ID')}</Text><Text style={styles.dataValue}>{pilotIdentifier || t('N/A')}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Phone Number')}</Text><Text style={styles.dataValue}>{phoneNumber || t('N/A')}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Email ID')}</Text><Text style={styles.dataValue}>{email || t('N/A')}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Service Types')}</Text><Text style={styles.dataValue}>{serviceTypesText}</Text></View>
                            <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Specializations')}</Text><Text style={styles.dataValue}>{specializationsText}</Text></View>

                            {status === 'Available' && (
                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={styles.removeBtn}><Text style={styles.removeBtnText}>{t('Remove Pilot')}</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.assignBtn} onPress={() => onNavigate && onNavigate('IncomingRequests')}><Text style={styles.assignBtnText}>{t('Assign Mission')}</Text></TouchableOpacity>
                                </View>
                            )}
                            {status === 'Off-Duty' && (
                                <View style={[styles.btnRow, { marginTop: 20 }]}>
                                    <TouchableOpacity style={styles.removeBtnFull}><Text style={styles.removeBtnText}>{t('Remove Pilot')}</Text></TouchableOpacity>
                                </View>
                            )}
                        </View>
                    }
                    right={
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{t('Documents')}</Text>
                            <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
                                {documents.length === 0 ? (
                                    <Text style={styles.emptyText}>{t('No documents available')}</Text>
                                ) : (
                                    documents.map((doc: any, idx: number) => (
                                        <View key={idx} style={styles.docRow}>
                                            <DocumentIcon width={16} height={16} fill="#64748B" color="#64748B" />
                                            <Text style={styles.docText}>{doc?.name || doc?.title || doc?.fileName || t('Document')}</Text>
                                        </View>
                                    ))
                                )}
                                <TouchableOpacity style={styles.addDocBtn}><Text style={styles.addDocBtnText}>{t('Add New Document')}</Text></TouchableOpacity>
                            </View>

                            <Text style={styles.sectionTitle}>{t('Total Missions')}</Text>
                            <ResponsiveGrid >
                                {missions.length === 0 ? (
                                    <Text style={styles.emptyText}>{t('No missions yet')}</Text>
                                ) : (
                                    missions.map((mission: any, idx: number) => (
                                        <View key={idx} style={{ width: '48%' }}><MissionHistoryCard personLabel={mission?.personLabel || `${mission?.pilotName || pilotName} (${mission?.pilotId || pilotIdentifier})`} /></View>
                                    ))
                                )}
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
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('YourPilots')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Pilot Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                <View style={styles.profileRow}>
                    <AvatarIcon width={48} height={48} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{pilotName}</Text>
                        <Text style={styles.rating}>⭐ {t('Rating {{rating}} ({{flights}}) flights', { rating, flights })}</Text>
                    </View>
                    <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.8}>
                        <PhoneIcon width={18} height={18} fill="#1E293B" color="#1E293B" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.dataLabel}>{t('Current Status:')}
                    <Text style={[styles.statusValue, { color: STATUS_COLORS[status] }]}> {t(status)}</Text>
                </Text>

                {status === 'Assigned' && (
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Mission Name:')}</Text>
                        <Text style={[styles.dataValue, styles.underlineBlue]}>{missionName || t('N/A')}</Text>
                    </View>
                )}

                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Pilot ID')}</Text><Text style={styles.dataValue}>{pilotIdentifier || t('N/A')}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Phone Number')}</Text><Text style={styles.dataValue}>{phoneNumber || t('N/A')}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('License Number')}</Text><Text style={styles.dataValue}>{licenseNumber || t('N/A')}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Service Types')}</Text><Text style={styles.dataValue}>{serviceTypesText}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Specializations')}</Text><Text style={styles.dataValue}>{specializationsText}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Email ID')}</Text><Text style={styles.dataValue}>{email || t('N/A')}</Text></View>
                <View style={styles.dataBlockTight}><Text style={styles.dataLabel}>{t('Joining Date')}</Text><Text style={styles.dataValue}>{joiningDate || t('N/A')}</Text></View>

                {status === 'Available' && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.removeBtn} activeOpacity={0.85}>
                            <Text style={styles.removeBtnText}>{t('Remove Pilot')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.assignBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('IncomingRequests')}
                        >
                            <Text style={styles.assignBtnText}>{t('Assign Mission')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {status === 'Off-Duty' && (
                    <View style={[styles.btnRow, { marginTop: 20 }]}>
                        <TouchableOpacity style={styles.removeBtnFull} activeOpacity={0.85}>
                            <Text style={styles.removeBtnText}>{t('Remove Pilot')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.sectionTitle}>{t('Documents')}</Text>
                {documents.length === 0 ? (
                    <Text style={styles.emptyText}>{t('No documents available')}</Text>
                ) : (
                    documents.map((doc: any, idx: number) => (
                        <View key={idx} style={styles.docRow}>
                            <DocumentIcon width={16} height={16} fill="#64748B" color="#64748B" />
                            <Text style={styles.docText}>{doc?.name || doc?.title || doc?.fileName || t('Document')}</Text>
                        </View>
                    ))
                )}
                <TouchableOpacity style={styles.addDocBtn} activeOpacity={0.85}>
                    <Text style={styles.addDocBtnText}>{t('Add New Document')}</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>{t('Total Missions')}</Text>
                {missions.length === 0 ? (
                    <Text style={styles.emptyText}>{t('No missions yet')}</Text>
                ) : (
                    missions.map((mission: any, idx: number) => (
                        <MissionHistoryCard key={idx} personLabel={mission?.personLabel || `${mission?.pilotName || pilotName} (${mission?.pilotId || pilotIdentifier})`} />
                    ))
                )}

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
    name: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
    rating: { fontSize: 13, color: '#64748B', marginTop: 2 },
    phoneBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },

    dataLabel: { fontSize: 14, color: '#64748B', marginBottom: 4, marginTop: 4 },
    statusValue: { fontWeight: '600' },
    dataBlockTight: { marginBottom: 14, marginTop: 10 },
    dataValue: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    underlineBlue: { color: '#0B3A2C', textDecorationLine: 'underline' },

    btnRow: { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 28 },
    removeBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C53030', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    removeBtnFull: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C53030', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    removeBtnText: { color: '#C53030', fontSize: 15, fontWeight: '500' },
    assignBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    assignBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 24, marginBottom: 14 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    docText: { fontSize: 15, color: '#334155' },
    addDocBtn: { borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    addDocBtnText: { fontSize: 15, fontWeight: '500', color: '#475569' },
    emptyText: { fontSize: 14, color: '#94A3B8', paddingVertical: 12 },
});

export default PilotDetailsScreen;
