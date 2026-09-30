import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
    Modal,
    TextInput,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import OverviewStatCard from '../components/fmOverviewStatsCard';
import AvatarIcon from '../../assets/Avatar.svg';
import Svg, { Path, Circle } from 'react-native-svg';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, ResponsiveGrid, SplitPane } from '../../common/DesktopLayouts';
import DropdownSelect from '../../common/DropdownSelect';
import DateTimePickerModal from '../../common/DateTimePickerModal';
import MediaUploadField from '../../common/MediaUploadField';
import { fleetApi, mapsApi, getSession } from '../../utils/api';
import { getCurrentPosition } from '../../utils/geolocation';
import { useLanguage } from '../../i18n';
import SupportCard from '../../customerModule/components/SupportCard';

const PeopleIcon = () => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Circle cx="8" cy="8" r="3.2" stroke="#1E293B" strokeWidth="1.6" />
        <Path d="M2.5 19c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
        <Circle cx="16.5" cy="8.5" r="2.6" stroke="#1E293B" strokeWidth="1.6" />
        <Path d="M14.5 13.6c2.4.2 4.5 2.1 4.5 4.9" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
);

const PlusIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <Circle cx="10" cy="10" r="9" stroke="#FFFFFF" strokeWidth="1.6" />
        <Path d="M10 6V14M6 10H14" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
);

const PilotRequestCard = ({ request, onAccept, onReject }: { request?: any; onAccept?: () => void; onReject?: () => void }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.pilotReqCard}>
            <View style={styles.pilotReqTop}>
                <AvatarIcon width={48} height={48} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.pilotReqRow}>{t('Pilot Name: ')}<Text style={styles.boldDark}>{request?.pilotName || request?.name || t('Pilot')}</Text></Text>
                    <Text style={styles.pilotReqRow}>{t('Date: ')}<Text style={styles.boldDark}>{request?.createdAt ? new Date(request.createdAt).toLocaleDateString(locale) : t('Pending')}</Text></Text>
                    <Text style={styles.pilotReqRow}>{t('Distance: ')}<Text style={styles.boldDark}>{request?.distance || request?.distanceKm || t('N/A')}</Text></Text>
                </View>
            </View>
            <View style={styles.pilotReqBtnRow}>
                <TouchableOpacity style={styles.rejectBtn} activeOpacity={0.85} onPress={onReject}>
                    <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85} onPress={onAccept}>
                    <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const MaintenanceTicketCard = ({ ticket, onApprove, onReject }: { ticket?: any; onApprove?: () => void; onReject?: () => void }) => {
    const { t, locale } = useLanguage();
    return (
        <View style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>{ticket?.title || ticket?.mainProblem || t('Maintenance Ticket')}</Text>
            <Text style={styles.ticketDesc}>{ticket?.description || ticket?.problemDescription || t('Ticket details unavailable.')}</Text>
            <View style={styles.ticketDataRow}><Text style={styles.ticketLabel}>{t('Drone: ')}</Text><Text style={styles.ticketValue}>{ticket?.droneName || ticket?.droneId || t('N/A')}</Text></View>
            <View style={styles.ticketDataRow}><Text style={styles.ticketLabel}>{t('Pilot Name: ')}</Text><Text style={styles.ticketValue}>{ticket?.pilotName || ticket?.reportedBy || t('N/A')}</Text></View>
            <View style={styles.ticketDataRow}><Text style={styles.ticketLabel}>{t('Location: ')}</Text><Text style={styles.ticketValue} numberOfLines={1}>{ticket?.address?.line1 || ticket?.address || ticket?.location?.address || t('Location pending')}</Text></View>
            <View style={styles.ticketDataRow}><Text style={styles.ticketLabel}>{t('Date & Time: ')}</Text><Text style={styles.ticketValue}>{ticket?.scheduledDate ? new Date(ticket.scheduledDate).toLocaleString(locale) : t('Pending')}</Text></View>
            <View style={styles.ticketDataRow}><Text style={styles.ticketLabel}>{t('Mission ID: ')}</Text><Text style={styles.ticketValue}>{ticket?.missionId || ticket?.bookingId || t('N/A')}</Text></View>
            <View style={styles.pilotReqBtnRowReverse}>
                <TouchableOpacity style={styles.approveBtn} activeOpacity={0.85} onPress={onApprove}>
                    <Text style={styles.acceptBtnText}>{t('Approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} activeOpacity={0.85} onPress={onReject}>
                    <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ResourcesScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const isDesktop = useIsDesktop();
    const [pilots, setPilots] = useState<any[]>([]);
    const [drones, setDrones] = useState<any[]>([]);
    const [incomingPilotRequests, setIncomingPilotRequests] = useState<any[]>([]);
    const [maintenanceTickets, setMaintenanceTickets] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fleetApi.getPilots().catch(() => []),
            fleetApi.getDrones().catch(() => []),
            fleetApi.getFleetManagerRequests().catch(() => []),
            fleetApi.getResources().catch(() => null),
        ]).then(([pilotsData, dronesData, incomingData, ticketsData]) => {
            setPilots(Array.isArray(pilotsData) ? pilotsData : pilotsData?.items || pilotsData?.data || []);
            setDrones(Array.isArray(dronesData) ? dronesData : dronesData?.items || dronesData?.data || []);
            setIncomingPilotRequests(Array.isArray(incomingData) ? incomingData : incomingData?.items || incomingData?.data || []);
            const resourceTickets = ticketsData?.maintenanceTickets || ticketsData?.tickets || [];
            setMaintenanceTickets(Array.isArray(resourceTickets) ? resourceTickets : []);
        }).catch((error) => console.error('Failed to load fleet resources data', error));

        // Extra data for the maintenance ticket form
        fleetApi.getMissions().then((data: any) => {
            setMissions(Array.isArray(data) ? data : data?.items || data?.data || []);
        }).catch(() => { });
        fleetApi.getProfile().then((p: any) => {
            if (p?.name) setFmName(p.name);
        }).catch(async () => {
            const session = await getSession().catch(() => null);
            if (session?.user?.name) setFmName(session.user.name);
        });
    }, []);

    // ── Maintenance ticket form state ──────────────────────────────────
    const [missions, setMissions] = useState<any[]>([]);
    const [fmName, setFmName] = useState('');
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showDateTime, setShowDateTime] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [ticketForm, setTicketForm] = useState<any>({
        mainProblem: '',
        description: '',
        droneId: '',
        missionId: '',
        location: '',
        dateTime: '',
        media: '',
    });

    const missionOptions = useMemo(
        () =>
            missions
                .filter((m) =>
                    ['pending', 'confirmed', 'accepted', 'assigned', 'en_route', 'at_location', 'preflight', 'started', 'in_progress', 'completed'].includes(m?.status),
                )
                .map((m) => ({
                    value: m?.id || m?.missionId || m?.bookingId || '',
                    label: `${m?.serviceType || m?.title || 'Mission'} • ${m?.id || m?.missionId || m?.bookingId || ''} (${m?.status || ''})`,
                }))
                .filter((o) => o.value),
        [missions],
    );

    const droneOptions = useMemo(
        () =>
            drones
                .map((d) => ({
                    value: d?.id || d?.droneId || '',
                    label: `${d?.model || d?.name || 'Drone'} (${d?.id || d?.droneId || ''})`,
                }))
                .filter((o) => o.value),
        [drones],
    );

    const updateTicketField = (key: string, value: string) =>
        setTicketForm((prev: any) => ({ ...prev, [key]: value }));

    const useCurrentLocation = async () => {
        setLocationLoading(true);
        try {
            const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
            const { latitude, longitude } = pos.coords;
            let address = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
            try {
                const res = await mapsApi.reverseGeocode(latitude, longitude);
                if (res?.address) address = res.address;
            } catch {
                // keep coordinates fallback
            }
            updateTicketField('location', address);
        } catch {
            Alert.alert(t('Location'), t('Could not get your current location.'));
        } finally {
            setLocationLoading(false);
        }
    };

    const submitTicket = async () => {
        const f = ticketForm;
        if (!f.mainProblem.trim() || !f.description.trim() || !f.droneId || !f.location.trim() || !f.dateTime) {
            Alert.alert(t('Missing Fields'), t('Please fill in all mandatory fields (mission ID and upload media are optional).'));
            return;
        }
        setSubmitting(true);
        try {
            await fleetApi.createMaintenanceTicket({
                droneId: f.droneId,
                title: f.mainProblem.trim(),
                description: f.description.trim(),
                category: 'REPAIR',
                priority: 'NORMAL',
                missionId: f.missionId || undefined,
                location: f.location.trim(),
                dateTime: f.dateTime,
                reporterName: fmName,
                mediaUrls: f.media ? [f.media] : [],
            });
            Alert.alert(t('Ticket Submitted'), t('Your maintenance ticket has been submitted.'));
            setShowTicketModal(false);
            setTicketForm({ mainProblem: '', description: '', droneId: '', missionId: '', location: '', dateTime: '', media: '' });
        } catch (error) {
            console.error('Failed to create maintenance ticket', error);
            Alert.alert(t('Submission Failed'), (error as any)?.message || t('Could not submit the ticket.'));
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTimeForDisplay = (iso: string) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderTicketModal = () => (
        <>
            <Modal visible={showTicketModal} animationType="slide" onRequestClose={() => setShowTicketModal(false)}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeaderRow}>
                        <TouchableOpacity style={styles.modalBackBtn} onPress={() => setShowTicketModal(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.modalBackArrow}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalPageTitle}>{t('New Maintenance Ticket')}</Text>
                    </View>

                    <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContentPad} keyboardShouldPersistTaps="handled">
                        <Text style={styles.inputLabel}>{t('Main Problem')}<Text style={styles.reqStar}> *</Text></Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder={t('Enter the main problem')}
                            placeholderTextColor="#94A3B8"
                            value={ticketForm.mainProblem}
                            onChangeText={(val) => updateTicketField('mainProblem', val)}
                        />

                        <Text style={styles.inputLabel}>{t('Problem Description')}<Text style={styles.reqStar}> *</Text></Text>
                        <View style={styles.textAreaBox}>
                            <TextInput
                                style={styles.textAreaInput}
                                placeholder={t('Briefly describe the issue faced with the drone')}
                                placeholderTextColor="#94A3B8"
                                multiline={true}
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={ticketForm.description}
                                onChangeText={(val) => updateTicketField('description', val)}
                            />
                        </View>

                        <DropdownSelect
                            label={t('Drone ID')}
                            required
                            value={ticketForm.droneId}
                            options={droneOptions}
                            placeholder={t('Select drone')}
                            onSelect={(val) => updateTicketField('droneId', val)}
                        />

                        <DropdownSelect
                            label={t('Mission ID')}
                            value={ticketForm.missionId}
                            options={missionOptions}
                            placeholder={t('Select mission (optional)')}
                            onSelect={(val) => updateTicketField('missionId', val)}
                        />

                        <Text style={styles.inputLabel}>{t('Your Name')}<Text style={styles.reqStar}> *</Text></Text>
                        <View style={styles.prefillBox}>
                            <Text style={styles.prefillText}>{fmName || t('Not assigned')}</Text>
                        </View>

                        <Text style={styles.inputLabel}>{t('Location')}<Text style={styles.reqStar}> *</Text></Text>
                        <View style={styles.locationRow}>
                            <TextInput
                                style={[styles.formInput, { flex: 1 }]}
                                placeholder={t('Where is the ticket submitted from?')}
                                placeholderTextColor="#94A3B8"
                                value={ticketForm.location}
                                onChangeText={(val) => updateTicketField('location', val)}
                            />
                            <TouchableOpacity style={styles.currentLocBtn} onPress={useCurrentLocation} disabled={locationLoading}>
                                {locationLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.currentLocText}>{t('Current Location')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>{t('Date & Time')}<Text style={styles.reqStar}> *</Text></Text>
                        <TouchableOpacity style={styles.formInput} onPress={() => setShowDateTime(true)} activeOpacity={0.85}>
                            <Text style={ticketForm.dateTime ? styles.prefillText : styles.placeholderText}>
                                {ticketForm.dateTime ? formatDateTimeForDisplay(ticketForm.dateTime) : t('Select date and time')}
                            </Text>
                        </TouchableOpacity>

                        <MediaUploadField
                            value={ticketForm.media}
                            onChange={(val) => updateTicketField('media', val)}
                            label={t('Upload Media (Optional)')}
                        />
                    </ScrollView>

                    <View style={styles.modalFooterFixed}>
                        <TouchableOpacity style={styles.submitTicketBtn} activeOpacity={0.9} onPress={submitTicket} disabled={submitting}>
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitTicketBtnText}>{t('Submit Ticket')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            <DateTimePickerModal
                visible={showDateTime}
                initialValue={ticketForm.dateTime || null}
                onConfirm={(iso) => {
                    updateTicketField('dateTime', iso);
                    setShowDateTime(false);
                }}
                onClose={() => setShowDateTime(false)}
            />
        </>
    );

    const assignedPilots = useMemo(() => pilots.filter((item) => ['assigned', 'busy', 'on_mission'].includes(item?.status)), [pilots]);
    const availablePilots = useMemo(() => pilots.filter((item) => ['available', 'active'].includes(item?.status)), [pilots]);
    const offDutyPilots = useMemo(() => pilots.filter((item) => ['off_duty', 'inactive'].includes(item?.status)), [pilots]);
    const assignedDrones = useMemo(() => drones.filter((item) => ['assigned', 'in_use', 'busy'].includes(item?.status)), [drones]);
    const deployableDrones = useMemo(() => drones.filter((item) => ['deployable', 'available', 'ready'].includes(item?.status)), [drones]);
    const maintenanceDrones = useMemo(() => drones.filter((item) => ['maintenance', 'repair'].includes(item?.status)), [drones]);
    const closedTickets = useMemo(() => maintenanceTickets.filter((item) => item?.status === 'completed'), [maintenanceTickets]);
    const openTickets = useMemo(() => maintenanceTickets.filter((item) => item?.status !== 'completed'), [maintenanceTickets]);

    if (isDesktop) {
        return (
            <>
                <DesktopPageShell
                    header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                        <PeopleIcon />
                        <Text style={styles.pageTitle}>{t('Manage Your Resources')}</Text>
                    </View>}  >
                    <SplitPane
                        leftWeight={7} rightWeight={3}
                        left={
                            <>
                                <View style={{ marginBottom: 32 }}>
                                    <Text style={styles.sectionTitle}>{t('Pilot Status')}</Text>
                                    <ResponsiveGrid >
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Total Pilots')} value={String(pilots.length)} onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Available' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Assigned Pilots')} value={String(assignedPilots.length)} valueColor="#0B3A2C" onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Assigned' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Available Pilots')} value={String(availablePilots.length)} onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Available' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Off-Duty Pilots')} value={String(offDutyPilots.length)} valueColor="#C53030" onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Off-Duty' })} /></View>
                                    </ResponsiveGrid>
                                </View>

                                <View style={{ marginBottom: 32 }}>
                                    <Text style={styles.sectionTitle}>{t('Drone Status')}</Text>
                                    <ResponsiveGrid >
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Total Drones')} value={String(drones.length)} onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Deployable' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Assigned Drones')} value={String(assignedDrones.length)} valueColor="#0B3A2C" onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Assigned' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Deployable Drones')} value={String(deployableDrones.length)} onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Deployable' })} /></View>
                                        <View style={{ width: '23%' }}><OverviewStatCard title={t('Maintenance')} value={String(maintenanceDrones.length)} valueColor="#C53030" onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Maintenance' })} /></View>
                                    </ResponsiveGrid>
                                </View>

                                <Text style={styles.sectionTitle}>{t('Tickets raised by Pilot')}</Text>
                                <ResponsiveGrid >
                                    {openTickets.slice(0, 2).map((ticket, idx) => (
                                        <View key={idx} style={{ width: '48%' }}><MaintenanceTicketCard ticket={ticket} /></View>
                                    ))}
                                </ResponsiveGrid>
                            </>
                        }
                        right={
                            <>
                                <TouchableOpacity style={[styles.addResourceBtn, { marginBottom: 24 }]} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('AddResource')}>
                                    <PlusIcon />
                                    <Text style={styles.addResourceBtnText}>{'  '}{t('Add New Resource')}</Text>
                                </TouchableOpacity>

                                <Text style={styles.sectionTitle}>{t('Incoming Pilot Requests')}</Text>
                                {incomingPilotRequests.map((request, idx) => (
                                    <PilotRequestCard key={idx} request={request} />
                                ))}

                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.sectionTitle}>{t('Maintenance History')}</Text>
                                    <OverviewStatCard title={t('Closed Tickets')} value={String(closedTickets.length)} />
                                    <OverviewStatCard title={t('Open Tickets')} value={String(openTickets.length)} valueColor="#0B3A2C" />
                                    <TouchableOpacity style={[styles.newTicketBtn, { marginTop: 16 }]} activeOpacity={0.85} onPress={() => setShowTicketModal(true)}>
                                        <View style={styles.plusCircleOutline}><Text style={styles.plusIconText}>+</Text></View>
                                        <Text style={styles.newTicketBtnText}>{t('New Maintenance Ticket')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        }
                    />
                </DesktopPageShell>
                {renderTicketModal()}
            </>
        );
    }
    return (
        <>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <PeopleIcon />
                    <Text style={styles.pageTitle}>{t('Manage Your Resources')}</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* ─── PILOT STATUS ─── */}
                    <View style={styles.sectionPad}>
                        <Text style={styles.sectionTitle}>{t('Pilot Status')}</Text>
                        <View style={styles.grid}>
                            <OverviewStatCard title={t('Total Pilots')} value={String(pilots.length)} onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Available' })} />
                            <OverviewStatCard title={t('Assigned Pilots')} value={String(assignedPilots.length)} valueColor="#0B3A2C" onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Assigned' })} />
                            <OverviewStatCard title={t('Available Pilots')} value={String(availablePilots.length)} onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Available' })} />
                            <OverviewStatCard title={t('Off-Duty Pilots')} value={String(offDutyPilots.length)} valueColor="#C53030" onPress={() => onNavigate && onNavigate('YourPilots', { tab: 'Off-Duty' })} />
                        </View>
                    </View>

                    {/* ─── DRONE STATUS ─── */}
                    <View style={styles.sectionPad}>
                        <Text style={styles.sectionTitle}>{t('Drone Status')}</Text>
                        <View style={styles.grid}>
                            <OverviewStatCard title={t('Total Drones')} value={String(drones.length)} onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Deployable' })} />
                            <OverviewStatCard title={t('Assigned Drones')} value={String(assignedDrones.length)} valueColor="#0B3A2C" onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Assigned' })} />
                            <OverviewStatCard title={t('Deployable Drones')} value={String(deployableDrones.length)} onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Deployable' })} />
                            <OverviewStatCard title={t('Drones Under Maintenance')} value={String(maintenanceDrones.length)} valueColor="#C53030" onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Maintenance' })} />
                        </View>
                    </View>

                    {/* ─── ADD NEW RESOURCE ─── */}
                    <View style={styles.sectionPad}>
                        <TouchableOpacity
                            style={styles.addResourceBtn}
                            activeOpacity={0.85}
                            onPress={() => onNavigate && onNavigate('AddResource')}
                        >
                            <PlusIcon />
                            <Text style={styles.addResourceBtnText}>{'  '}{t('Add New Resource')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── INCOMING PILOT REQUESTS ─── */}
                    <View style={styles.sectionPad}>
                        {incomingPilotRequests.map((request, idx) => (
                            <PilotRequestCard key={idx} request={request} />
                        ))}
                    </View>

                    {/* ─── MAINTENANCE HISTORY ─── */}
                    <View style={styles.sectionPad}>
                        <Text style={styles.sectionTitle}>{t('Maintenance History')}</Text>
                        <View style={[styles.grid, { marginTop: 12 }]}>
                            <OverviewStatCard title={t('Closed Tickets')} value={String(closedTickets.length)} />
                            <OverviewStatCard title={t('Open Tickets')} value={String(openTickets.length)} valueColor="#0B3A2C" />
                        </View>
                    </View>

                    <View style={styles.sectionPad}>
                        <TouchableOpacity style={styles.newTicketBtn} activeOpacity={0.85} onPress={() => setShowTicketModal(true)}>
                            <View style={styles.plusCircleOutline}>
                                <Text style={styles.plusIconText}>+</Text>
                            </View>
                            <Text style={styles.newTicketBtnText}>{t('New Maintenance Ticket')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── TICKETS RAISED BY PILOT ─── */}
                    <View style={styles.sectionPad}>
                        <Text style={styles.sectionTitle}>{t('Tickets raised by Pilot')}</Text>
                        <View style={{ marginTop: 12 }}>
                            {openTickets.map((ticket, idx) => (
                                <MaintenanceTicketCard key={idx} ticket={ticket} />
                            ))}
                        </View>
                    </View>

                    <View style={{ paddingTop: 22 }}>
                        <SupportCard onNavigate={onNavigate} />
                    </View>

                </ScrollView>
            </View>
            {renderTicketModal()}
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 0) - 6, paddingBottom: 16, backgroundColor: '#F8FAFC', gap: 10 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingBottom: 84 },

    sectionPad: { paddingHorizontal: 20, paddingTop: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B', marginBottom: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 8 },

    addResourceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16 },
    addResourceBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },

    pilotReqCard: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    pilotReqTop: { flexDirection: 'row', alignItems: 'center' },
    pilotReqRow: { fontSize: 15, color: '#64748B', marginBottom: 2 },
    boldDark: { fontWeight: '600', color: '#1E293B' },
    pilotReqBtnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    pilotReqBtnRowReverse: { flexDirection: 'row-reverse', gap: 12, marginTop: 16, justifyContent: 'flex-end' },
    rejectBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#C53030', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    rejectBtnText: { color: '#C53030', fontSize: 16, fontWeight: '500' },
    acceptBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    approveBtn: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },

    newTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 100, borderWidth: 1.5, borderColor: '#64748B', paddingVertical: 16 },
    plusCircleOutline: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#64748B', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    plusIconText: { fontSize: 14, fontWeight: '500', color: '#64748B', marginTop: -2 },
    newTicketBtnText: { fontSize: 16, fontWeight: '500', color: '#64748B' },

    ticketCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#E2E8F0' },
    ticketTitle: { fontSize: 17, fontWeight: '600', color: '#0B3A2C', marginBottom: 6 },
    ticketDesc: { fontSize: 13, color: '#64748B', marginBottom: 14, lineHeight: 19 },
    ticketDataRow: { flexDirection: 'row', marginBottom: 4 },
    ticketLabel: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
    ticketValue: { fontSize: 14, color: '#64748B', flexShrink: 1 },

    modalContainer: { flex: 1, backgroundColor: '#F4F6F8' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    modalBackBtn: { marginRight: 16, justifyContent: 'center' },
    modalBackArrow: { fontSize: 26, color: '#475569', fontWeight: '400', marginTop: -4 },
    modalPageTitle: { fontSize: 22, fontWeight: '500', color: '#1E293B' },
    modalScroll: { flex: 1 },
    modalContentPad: { paddingHorizontal: 20, paddingBottom: 40 },
    inputLabel: { fontSize: 15, fontWeight: '500', color: '#475569', marginBottom: 8, marginTop: 16 },
    reqStar: { color: '#EF4444' },
    formInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, backgroundColor: '#FFFFFF', fontSize: 15, color: '#0F172A' },
    prefillBox: { justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, backgroundColor: '#F4F6F8' },
    prefillText: { fontSize: 15, fontWeight: '400', color: '#0F172A' },
    placeholderText: { fontSize: 15, fontWeight: '400', color: '#94A3B8' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    currentLocBtn: { backgroundColor: '#0B3A2C', borderRadius: 12, paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
    currentLocText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    textAreaBox: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', height: 120 },
    textAreaInput: { flex: 1, fontSize: 16, fontWeight: '400', color: '#1E293B' },
    modalFooterFixed: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    submitTicketBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    submitTicketBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

export default ResourcesScreen;
