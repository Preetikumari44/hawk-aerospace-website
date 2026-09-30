import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, BackHandler, Image, Modal, Alert, TextInput,
} from 'react-native';

import DroneIcon from '../../assets/Missions-Inactive.svg';
import AvatarIcon from '../../assets/Avatar.svg';
import PhoneIcon from '../../assets/phone.svg';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';
import { DesktopPageShell, SplitPane } from '../../common/DesktopLayouts';
import { fleetApi, chatApi } from '../../utils/api';
import SupportCard from '../../customerModule/components/SupportCard';
import TrackingMap from '../../customerModule/components/TrackingMap';
import WeatherSummaryCard from '../../customerModule/components/WeatherSummaryCard';
import FlyingRestrictionSummaryCard from '../../customerModule/components/FlyingRestrictionSummaryCard';

type BookingStatus =
    | 'mission_accepted'
    | 'drone_assigned'
    | 'pilot_assigned'
    | 'pilot_in_transit'
    | 'service_started'
    | 'service_ended_payment_pending'
    | 'service_ended_payment_completed'
    | 'service_ended_commission_pending'
    | 'service_ended_commission_credited';

const STATUS_NODE_INDEX: Record<BookingStatus, number> = {
    mission_accepted: 0,
    drone_assigned: 0,
    pilot_assigned: 1,
    pilot_in_transit: 2,
    service_started: 3,
    service_ended_payment_pending: 4,
    service_ended_payment_completed: 4,
    service_ended_commission_pending: 4,
    service_ended_commission_credited: 4,
};

const STATUS_LABEL: Record<BookingStatus, string> = {
    mission_accepted: 'Mission Accepted',
    drone_assigned: 'Mission Accepted',
    pilot_assigned: 'Pilot Assigned',
    pilot_in_transit: 'Pilot In Transit',
    service_started: 'Service Started',
    service_ended_payment_pending: 'Service Ended',
    service_ended_payment_completed: 'Service Ended',
    service_ended_commission_pending: 'Service Ended',
    service_ended_commission_credited: 'Service Ended',
};

const TOTAL_NODES = 5;

const MissionStatusBar = ({ status }: { status: BookingStatus }) => {
    const { t } = useLanguage();
    const activeIndex = STATUS_NODE_INDEX[status];
    return (
        <View style={styles.statusBarCard}>
            <View style={styles.statusBarLineWrap}>
                <View style={styles.statusBarTrack} />
                <View style={styles.statusBarDotsRow}>
                    {Array.from({ length: TOTAL_NODES }).map((_, idx) => {
                        const isCurrent = idx === activeIndex;
                        return isCurrent ? (
                            <View key={idx} style={styles.statusActiveDotOuter}>
                                <DroneIcon width={18} height={18} fill="#0B3A2C" color="#0B3A2C" />
                            </View>
                        ) : (
                            <View key={idx} style={styles.statusDot} />
                        );
                    })}
                </View>
            </View>
            <Text style={styles.statusLabel}>{t(STATUS_LABEL[status])}</Text>
        </View>
    );
};

const BookingDetailsScreen: React.FC<{ onNavigate?: any; initialStatus?: BookingStatus; routeParams?: any }> = ({
    onNavigate,
    initialStatus = 'mission_accepted',
    routeParams,
}) => {
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [mission, setMission] = useState<any>(null);
    const [pilotData, setPilotData] = useState<any>(null);
    const [droneData, setDroneData] = useState<any>(null);
    const [drones, setDrones] = useState<any[]>([]);
    const [pilots, setPilots] = useState<any[]>([]);
    const [weatherData, setWeatherData] = useState<any>(null);
    const [restrictionsData, setRestrictionsData] = useState<any>(null);
    const [trackingData, setTrackingData] = useState<any>(null);
    const [status, setStatus] = useState<BookingStatus>(initialStatus);
    const [showDroneSheet, setShowDroneSheet] = useState(false);
    const [showPilotSheet, setShowPilotSheet] = useState(false);
    // ── Drone handover verification ──
    const [returnCodeInput, setReturnCodeInput] = useState('');
    const [verifyingReturn, setVerifyingReturn] = useState(false);

    // bookingId-first resolution: an FM "request" object carries the booking id
    // in `bookingId` while its own `id` is the request id (NOT the booking).
    // Preferring `bookingId` guarantees getMission/recommendations/weather
    // all query the real booking doc — otherwise every field renders N/A.
    const missionId =
        routeParams?.bookingId ||
        routeParams?.mission?.bookingId ||
        routeParams?.mission?.booking?.id ||
        routeParams?.mission?.mission?.bookingId ||
        routeParams?.mission?.id ||
        routeParams?.mission?.missionId ||
        routeParams?.mission?._id;

    const mapBookingStatus = (doc: any) => {
        const status = doc?.status;
        if (!status) return;

        // Derive the assignment step from what is actually assigned so old
        // bookings (e.g. confirmed + drone already assigned, pilot missing)
        // still show the correct "Assign Pilot" step.
        if (status === 'pending' || status === 'accepted' || status === 'confirmed') {
            const hasD = !!doc?.assignedDrone || !!doc?.assignedDroneId;
            const hasP = !!doc?.assignedPilot || !!doc?.assignedPilotId;
            if (hasD && hasP) return setStatus('pilot_assigned');
            if (hasD) return setStatus('drone_assigned');
            return setStatus('mission_accepted');
        }

        const mapped: Record<string, BookingStatus> = {
            drone_assigned: 'drone_assigned',
            pilot_assigned: 'pilot_assigned',
            pilot_in_transit: 'pilot_in_transit',
            in_progress: 'service_started',
            service_started: 'service_started',
            completed: 'service_ended_payment_pending',
            payment_pending: 'service_ended_payment_pending',
            payment_completed: 'service_ended_payment_completed',
            commission_pending: 'service_ended_commission_pending',
            commission_credited: 'service_ended_commission_credited',
        };
        if (mapped[status]) setStatus(mapped[status]);
    };

    useEffect(() => {
        // Immediately populate from routeParams so UI is never blank.
        // Accept-flow params may carry the lightweight FM *request* object
        // (bookingId + nested bookingDetails) — merge the nested details so
        // service/location/date render instantly even before the fetch lands.
        if (routeParams?.mission) {
            const raw = routeParams.mission?.mission || routeParams.mission;
            const nested = raw?.bookingDetails && typeof raw.bookingDetails === 'object' ? raw.bookingDetails : {};
            const bookingDoc = { ...nested, ...raw };
            if (!bookingDoc.id && (raw?.bookingId || routeParams?.bookingId)) {
                bookingDoc.id = raw.bookingId || routeParams.bookingId;
            }
            setMission(bookingDoc);
            setPilotData(routeParams.mission?.pilot || null);
            setDroneData(routeParams.mission?.drone || null);
            mapBookingStatus(bookingDoc);
        }
    }, []);

    useEffect(() => {
        if (!missionId) return;
        fleetApi.getMission(missionId).then((data: any) => {
            const bookingDoc = data?.mission || data;
            setMission(bookingDoc);
            setPilotData(data?.pilot || null);
            setDroneData(data?.drone || null);
            mapBookingStatus(bookingDoc);
        }).catch(() => {
            // routeParams already used as initial value, nothing more to do
        });
    }, [missionId]);

    useEffect(() => {
        if (!missionId) return;
        // ⭐ Show only compatible (same service type) and available/deployable
        // pilots & drones from this fleet manager's own roster/inventory.
        // If the recommendations endpoint returns an empty list (e.g. strict
        // server-side ownership/type filters), fall back to the full roster
        // filtered client-side by the mission service type so the FM can
        // still see and assign their drones/pilots.
        const serviceOf = (m: any) => m?.serviceType || mission?.serviceType;
        const matchesService = (itemService: any, bookingService: any) => {
            if (!bookingService) return true;
            if (!itemService) return true;
            const a = String(itemService).toLowerCase();
            const b = String(bookingService).toLowerCase();
            return a === b || a === 'multi_purpose' || a === 'multi-purpose' || a === 'all';
        };
        const normalizeList = (data: any) =>
            Array.isArray(data) ? data : data?.items || data?.data || [];
        const loadDroneFallback = () => {
            fleetApi.getDrones().then((data: any) => {
                const items = normalizeList(data);
                const svc = serviceOf(mission);
                const compatible = items.filter((d: any) =>
                    matchesService(d?.type || d?.droneType || d?.serviceType, svc),
                );
                setDrones(compatible.length > 0 ? compatible : items);
            }).catch(() => { });
        };
        const loadPilotFallback = () => {
            fleetApi.getPilots().then((data: any) => {
                const items = normalizeList(data);
                const svc = serviceOf(mission);
                const compatible = items.filter((p: any) => {
                    const types = p?.serviceTypes || p?.profileData?.serviceTypes || [];
                    if (!Array.isArray(types) || types.length === 0) return true;
                    return types.some((s: any) => matchesService(s, svc));
                });
                setPilots(compatible.length > 0 ? compatible : items);
            }).catch(() => { });
        };
        fleetApi.getDroneRecommendations(missionId).then((data: any) => {
            const items = normalizeList(data);
            if (items.length > 0) {
                setDrones(items);
            } else {
                loadDroneFallback();
            }
        }).catch(() => {
            loadDroneFallback();
        });
        fleetApi.getPilotRecommendations(missionId).then((data: any) => {
            const items = normalizeList(data);
            if (items.length > 0) {
                setPilots(items);
            } else {
                loadPilotFallback();
            }
        }).catch(() => {
            loadPilotFallback();
        });
    }, [missionId]);

    useEffect(() => {
        if (!missionId) return;
        const showWeather = ['mission_accepted', 'drone_assigned', 'pilot_assigned'].includes(status);
        if (!showWeather) return;
        fleetApi.getBookingWeather(missionId).then(setWeatherData).catch(() => { });
        fleetApi.getBookingRestrictions(missionId).then(setRestrictionsData).catch(() => { });
    }, [missionId, status]);

    useEffect(() => {
        if (!missionId) return;
        const showTrackingMap = ['pilot_in_transit', 'service_started'].includes(status);
        if (!showTrackingMap) return;
        fleetApi.getBookingTracking(missionId).then(setTrackingData).catch(() => { });
        const interval = setInterval(() => {
            fleetApi.getBookingTracking(missionId).then(setTrackingData).catch(() => { });
        }, 30000);
        return () => clearInterval(interval);
    }, [missionId, status]);

    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('Home'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const weather = weatherData || mission?.weatherCheck;
    const restrictions = restrictionsData || mission?.flyingRestriction;
    const drone = droneData || mission?.assignedDrone;
    const pilot = pilotData || mission?.assignedPilot;
    const customer = {}; // Customer details fetched separately if needed
    const pricing = mission?.priceBreakdown || mission;

    // ⭐ Determine assignment state from the actual booking data so we never
    // show "Assign Drone" when a drone is already assigned (or "Assign Pilot"
    // when a pilot is already assigned).
    const hasAssignedDrone = !!(mission?.assignedDrone || mission?.assignedDroneId) || !!(droneData && typeof droneData === 'object');
    const hasAssignedPilot = !!(mission?.assignedPilot || mission?.assignedPilotId) || !!(pilotData && typeof pilotData === 'object');

    const showWeatherAndZone =
        status === 'mission_accepted' ||
        status === 'drone_assigned' ||
        status === 'pilot_assigned';
    const showMap = status === 'pilot_in_transit' || status === 'service_started';
    const isServiceEnded = status.startsWith('service_ended');
    const assignmentInProgress = showWeatherAndZone;
    const needsDroneAssignment = assignmentInProgress && !hasAssignedDrone;
    const needsPilotAssignment = assignmentInProgress && hasAssignedDrone && !hasAssignedPilot;
    const paymentCompleted =
        status === 'service_ended_payment_completed' ||
        status === 'service_ended_commission_pending' ||
        status === 'service_ended_commission_credited';
    const commissionStage =
        status === 'service_ended_commission_pending' ||
        status === 'service_ended_commission_credited';
    const commissionCredited = status === 'service_ended_commission_credited';

    // Normalize backend weather/restrictions payloads to the exact shape used
    // by the shared customerModule cards so the UI matches the customer screen.
    const weatherForCard = {
        status: String(weather?.status || 'green').toLowerCase(),
        temperature: weather?.metrics?.temperatureC ?? weather?.temperature ?? 28,
        windSpeed: weather?.metrics?.windSpeedKmh ?? weather?.windSpeed ?? 12,
        humidity: weather?.metrics?.humidityPct ?? weather?.humidity ?? 40,
        forecast: weather?.summary || weather?.forecast || '',
    };
    const restrictionsForCard = {
        status: String(restrictions?.status || 'green').toLowerCase(),
        summary: restrictions?.summary || (Array.isArray(restrictions?.restrictions) ? restrictions.restrictions.join(', ') : ''),
        reasons: restrictions?.reasons || [],
        zones: restrictions?.zones || [],
        nearestZone: restrictions?.nearestZone ? {
            name: restrictions.nearestZone.name,
            type: restrictions.nearestZone.type,
            distanceKm: restrictions.nearestZone.distanceKm,
        } : (restrictions?.zone ? { name: restrictions.zone } : null),
        checkedAt: restrictions?.checkedAt,
    };

    const handleAssignDrone = (droneId: string) => {
        const apply = (code?: string) => {
            setShowDroneSheet(false);
            setStatus('drone_assigned');
            setMission((prev: any) => ({
                ...(prev || {}),
                assignedDrone: droneId,
                ...(code ? { handoverIssueCode: code, handoverIssueVerified: false } : {}),
            }));
        };
        if (missionId) {
            fleetApi.assignFleetManagerDrone(missionId, droneId)
                .then((data: any) => {
                    if (data?.drone) setDroneData(data.drone);
                    const code = data?.handoverIssueCode || data?.booking?.handoverIssueCode;
                    if (data?.booking) setMission(data.booking);
                    apply(code);
                    if (code) {
                        Alert.alert(t('Drone Code Generated'), t('Share this code with the pilot: {{code}}', { code }));
                    }
                })
                .catch(() => apply());
        } else {
            apply();
        }
    };

    const handleAssignPilot = (pilotId: string) => {
        const apply = () => {
            setShowPilotSheet(false);
            setStatus('pilot_assigned');
            setMission((prev: any) => ({ ...(prev || {}), assignedPilot: pilotId }));
        };
        if (missionId) {
            fleetApi.assignFleetManagerPilot(missionId, pilotId)
                .then((data: any) => {
                    if (data?.pilot) setPilotData(data.pilot);
                    apply();
                })
                .catch(() => apply());
        } else {
            apply();
        }
    };

    const handleVerifyReturn = () => {
        const bookingId = mission?.bookingId || mission?.id || missionId;
        const code = returnCodeInput.trim().toUpperCase();
        if (!bookingId || code.length !== 4 || verifyingReturn) return;
        setVerifyingReturn(true);
        fleetApi.verifyDroneReturn(bookingId, code)
            .then((data: any) => {
                const updated = data?.booking || data;
                if (updated && typeof updated === 'object') setMission(updated);
                setReturnCodeInput('');
                mapBookingStatus({ ...(mission || {}), ...updated, status: 'completed' });
                Alert.alert(t('Service Completed'), t('Drone return verified successfully.'));
            })
            .catch((error: any) => {
                Alert.alert(
                    t('Verification Failed'),
                    error?.message || t('Incorrect return code. Ask the pilot for the code shown on their screen.'),
                );
            })
            .finally(() => setVerifyingReturn(false));
    };

    const isDesktop = useIsDesktop();

    // ── Drone handover UI state ──
    const showIssueCode = hasAssignedDrone && !!mission?.handoverIssueCode && !mission?.handoverIssueVerified && !isServiceEnded;
    const needsReturnVerification = !!mission?.handoverReturnCode && !mission?.handoverReturnVerified && !isServiceEnded;
    const canVerifyReturn = returnCodeInput.trim().length === 4 && !verifyingReturn;

    const renderIssueCodeCard = () => (
        <View style={styles.handoverCard}>
            <Text style={styles.handoverTitle}>{t('Drone Handover Code')}</Text>
            <Text style={styles.handoverCode}>{mission?.handoverIssueCode}</Text>
            <Text style={styles.handoverHint}>
                {mission?.handoverIssueVerified
                    ? t('Pilot verified — drone handed over.')
                    : t('Share this code with the pilot in person. They need it to start the mission.')}
            </Text>
        </View>
    );

    const renderReturnVerifyCard = () => (
        <View style={styles.handoverCard}>
            <Text style={styles.handoverTitle}>{t('Drone Return Verification')}</Text>
            <Text style={styles.handoverHint}>
                {t('The pilot ended the service. Ask for the 4-character return code on their screen and enter it below to complete the service.')}
            </Text>
            <TextInput
                style={styles.handoverInput}
                value={returnCodeInput}
                onChangeText={(v) => setReturnCodeInput(v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase())}
                placeholder={t('Enter return code')}
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={4}
                editable={!verifyingReturn}
            />
            <TouchableOpacity
                style={[styles.assignBtn, !canVerifyReturn && styles.assignBtnDisabled]}
                disabled={!canVerifyReturn}
                activeOpacity={0.85}
                onPress={handleVerifyReturn}
            >
                <Text style={styles.assignBtnText}>{t(verifyingReturn ? 'Verifying...' : 'Verify & Complete Service')}</Text>
            </TouchableOpacity>
        </View>
    );

    const handleSupportChat = useCallback(async () => {
        try {
            const conversation = await chatApi.createConversation({
                participantUid: 'admin',
                participantRole: 'admin',
                type: 'support',
            });
            if (conversation?.id) {
                onNavigate?.('ChatScreen', { conversationId: conversation.id, type: 'support' });
            } else {
                Alert.alert(t('Error'), t('Could not start support chat. Please try again.'));
            }
        } catch (error) {
            console.error('[BookingDetailsScreen] Failed to open support chat:', error);
            Alert.alert(t('Error'), t('Could not reach support right now. Please try again.'));
        }
    }, [onNavigate, t]);

    const handleCancelBooking = useCallback(() => {
        const bookingId = mission?.bookingId || routeParams?.bookingId || missionId;
        if (!bookingId) return;
        Alert.alert(
            t('Cancel Booking'),
            t('Are you sure you want to cancel this booking?'),
            [
                { text: t('No'), style: 'cancel' },
                {
                    text: t('Yes, Cancel'),
                    style: 'destructive',
                    onPress: () => {
                        fleetApi.cancelBooking(bookingId, 'Cancelled by fleet manager')
                            .then(() => {
                                Alert.alert(
                                    t('Booking Cancelled'),
                                    t('The booking has been cancelled successfully.'),
                                );
                                onNavigate?.('Home');
                            })
                            .catch((error: any) => {
                                Alert.alert(
                                    t('Cancellation Failed'),
                                    error?.message || t('Could not cancel the booking. Please try again.'),
                                );
                            });
                    },
                },
            ],
        );
    }, [mission, missionId, routeParams?.bookingId, onNavigate, t]);

    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Home')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Booking Details')}</Text>
                </View>}  >
                <SplitPane
                    leftWeight={5} rightWeight={5}
                    left={
                        <>
                            <Text style={styles.bookingStatusLabel}>{isServiceEnded ? t('Mission Status') : t('Booking Status')}</Text>
                            <MissionStatusBar status={status} />

                            {/* CTA blocks */}
                            {needsDroneAssignment && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={styles.assignLabel}>{t('Assign a Drone for this Mission')}</Text>
                                    <TouchableOpacity style={styles.assignBtn} onPress={() => setShowDroneSheet(true)}><Text style={styles.assignBtnText}>{t('Assign Drone')}</Text></TouchableOpacity>
                                </View>
                            )}
                            {needsPilotAssignment && (
                                <View style={{ marginBottom: 24 }}>
                                    <Text style={styles.assignLabel}>{t('Assign Pilot for this Mission')}</Text>
                                    <TouchableOpacity style={styles.assignBtn} onPress={() => setShowPilotSheet(true)}><Text style={styles.assignBtnText}>{t('Assign Pilot')}</Text></TouchableOpacity>
                                </View>
                            )}

                            {showIssueCode && (
                                <View style={{ marginBottom: 24 }}>
                                    {renderIssueCodeCard()}
                                </View>
                            )}
                            {needsReturnVerification && (
                                <View style={{ marginBottom: 24 }}>
                                    {renderReturnVerifyCard()}
                                </View>
                            )}

                            {showWeatherAndZone && <WeatherSummaryCard weatherData={weatherForCard} serviceDate={mission?.scheduledDate || mission?.date} />}
                            {showWeatherAndZone && <FlyingRestrictionSummaryCard restrictions={restrictionsForCard} />}

                            {!isServiceEnded && status !== 'service_started' && (
                                <View style={{ marginBottom: 24 }}>
                                    <TouchableOpacity style={styles.cancelBookingBtn} onPress={handleCancelBooking}>
                                        <Text style={styles.cancelBookingBtnText}>{t('Cancel Booking')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {showMap && (
                                <View style={[styles.mapCard, { height: 400 }]}>
                                    <View style={styles.liveTrackingBadge}><Text style={styles.liveTrackingText}>{t('Live Tracking')}</Text></View>
                                    <TrackingMap
                                        customerLocation={
                                            trackingData?.location || mission?.location
                                        }
                                        pilotLocation={
                                            trackingData?.pilotLocation
                                        }
                                        customerAddress={mission?.address}
                                        pilotName={mission?.assignedPilotName}
                                    />
                                </View>
                            )}

                            {/* Single shared 24x7 support card (customerModule) */}
                            {!isServiceEnded && (
                                <SupportCard onNavigate={onNavigate} />
                            )}
                        </>
                    }
                    right={
                        <View style={{ backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={styles.sectionHeaderDark}>{t('Mission Details')}</Text>
                            <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Booking #')}</Text><Text style={styles.dataValue}>{mission?.bookingNumber || t('N/A')}</Text></View>
                            <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Service')}</Text><Text style={styles.dataValue}>{mission?.serviceType ? t(mission.serviceType) : t('N/A')}</Text></View>
                            <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Location')}</Text><Text style={[styles.dataValue, styles.underline]}>{mission?.address || t('N/A')}</Text></View>
                            {mission?.detailedAddress?.addressLine1 && <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Address Line 1')}</Text><Text style={styles.dataValue}>{mission.detailedAddress.addressLine1}</Text></View>}
                            {mission?.detailedAddress?.addressLine2 && <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Address Line 2')}</Text><Text style={styles.dataValue}>{mission.detailedAddress.addressLine2}</Text></View>}
                            {mission?.detailedAddress?.city && <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('City')}</Text><Text style={styles.dataValue}>{mission.detailedAddress.city}</Text></View>}
                            {mission?.detailedAddress?.state && <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('State')}</Text><Text style={styles.dataValue}>{mission.detailedAddress.state}</Text></View>}
                            {mission?.detailedAddress?.pincode && <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Pincode')}</Text><Text style={styles.dataValue}>{mission.detailedAddress.pincode}</Text></View>}
                            <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Status')}</Text><Text style={styles.dataValue}>{mission?.status ? t(mission.status) : t('N/A')}</Text></View>
                            <View style={styles.divider} />

                            <Text style={styles.sectionHeaderDark}>{t('Customer')}</Text>
                            <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('ID')}</Text><Text style={styles.dataValue}>{mission?.customerUid || t('N/A')}</Text></View>
                            <View style={styles.divider} />

                            {drone && typeof drone === 'object' && (
                                <>
                                    <Text style={styles.sectionHeaderDark}>{t('Drone Details')}</Text>
                                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Model')}</Text><Text style={styles.dataValue}>{drone.model || t('N/A')}</Text></View>
                                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Type')}</Text><Text style={styles.dataValue}>{drone.type ? t(drone.type) : t('N/A')}</Text></View>
                                    <View style={styles.divider} />
                                </>
                            )}

                            {pilot && typeof pilot === 'object' && (
                                <>
                                    <Text style={styles.sectionHeaderDark}>{t('Pilot Details')}</Text>
                                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Name')}</Text><Text style={styles.dataValue}>{pilot.name || t('N/A')}</Text></View>
                                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Phone')}</Text><Text style={styles.dataValue}>{pilot.phone || t('N/A')}</Text></View>
                                    <View style={styles.divider} />
                                </>
                            )}
                        </View>
                    }
                />

                <Modal visible={showDroneSheet} animationType="slide" transparent onRequestClose={() => setShowDroneSheet(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowDroneSheet(false)} />
                        <View style={styles.bottomSheet}>
                            <View style={styles.sheetHandle} />
                            <View style={styles.sheetHeaderRow}>
                                <TouchableOpacity onPress={() => setShowDroneSheet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.backArrow}>←</Text>
                                </TouchableOpacity>
                                <Text style={styles.sheetTitle}>{t('Select Drone')}</Text>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {drones.length > 0 ? drones.map((droneItem, idx) => (
                                    <TouchableOpacity key={droneItem.id || droneItem.droneId || droneItem.uid || idx} style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignDrone(droneItem.id || droneItem.droneId || droneItem.uid)}>
                                        <View style={styles.sheetDroneCircle}>
                                            <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" />
                                        </View>
                                        <View>
                                            <Text style={styles.sheetItemTitle}>{droneItem.model || droneItem.name || t('Drone ({{type}})', { type: droneItem.type || droneItem.droneType || t('N/A') })}</Text>
                                            <Text style={styles.sheetItemSub}>{droneItem.id || droneItem.droneId || droneItem.uid || t('--')} · {droneItem.type || droneItem.droneType ? t(droneItem.type || droneItem.droneType) : t('--')} · {droneItem.status ? t(droneItem.status) : t('--')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )) : (
                                    <View style={styles.sheetListRow}>
                                        <View style={styles.sheetDroneCircle}>
                                            <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" />
                                        </View>
                                        <View>
                                            <Text style={styles.sheetItemTitle}>{t('No Drones Available')}</Text>
                                            <Text style={styles.sheetItemSub}>{t('Add drones to your fleet first')}</Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
                <Modal visible={showPilotSheet} animationType="slide" transparent onRequestClose={() => setShowPilotSheet(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPilotSheet(false)} />
                        <View style={styles.bottomSheet}>
                            <View style={styles.sheetHandle} />
                            <View style={styles.sheetHeaderRow}>
                                <TouchableOpacity onPress={() => setShowPilotSheet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.backArrow}>←</Text>
                                </TouchableOpacity>
                                <Text style={styles.sheetTitle}>{t('Select Pilot')}</Text>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {pilots.length > 0 ? pilots.map((pilotItem, idx) => (
                                    <TouchableOpacity key={pilotItem.id || pilotItem.uid || pilotItem.pilotId || idx} style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignPilot(pilotItem.id || pilotItem.uid || pilotItem.pilotId)}>
                                        <AvatarIcon width={44} height={44} style={{ marginRight: 14 }} />
                                        <View>
                                            <Text style={styles.sheetItemTitle}>{pilotItem.name || pilotItem.fullName || t('Pilot')}</Text>
                                            <Text style={styles.sheetItemSub}>{pilotItem.phone || pilotItem.mobile || t('--')} · {(pilotItem.serviceTypes || pilotItem.profileData?.serviceTypes || []).slice(0, 2).join(', ') || (pilotItem.status ? t(pilotItem.status) : t('--'))}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )) : (
                                    <View style={styles.sheetListRow}>
                                        <AvatarIcon width={44} height={44} style={{ marginRight: 14 }} />
                                        <View>
                                            <Text style={styles.sheetItemTitle}>{t('No Pilots Available')}</Text>
                                            <Text style={styles.sheetItemSub}>{t('Add pilots to your fleet first')}</Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('Home')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Booking Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                {/* STATUS STEPPER */}
                <Text style={styles.bookingStatusLabel}>
                    {isServiceEnded ? t('Mission Status') : t('Booking Status')}
                </Text>
                <MissionStatusBar status={status} />

                {/* ASSIGN DRONE CTA */}
                {needsDroneAssignment && (
                    <>
                        <Text style={styles.assignLabel}>{t('Assign a Drone for this Mission')}</Text>
                        <TouchableOpacity style={styles.assignBtn} activeOpacity={0.85} onPress={() => setShowDroneSheet(true)}>
                            <Text style={styles.assignBtnText}>{t('Assign Drone')}</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                    </>
                )}

                {/* ASSIGN PILOT CTA */}
                {needsPilotAssignment && (
                    <>
                        <Text style={styles.assignLabel}>{t('Assign Pilot for this Mission')}</Text>
                        <TouchableOpacity style={styles.assignBtn} activeOpacity={0.85} onPress={() => setShowPilotSheet(true)}>
                            <Text style={styles.assignBtnText}>{t('Assign Pilot')}</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                    </>
                )}

                {/* DRONE HANDOVER CODE (FM → pilot) */}
                {showIssueCode && (
                    <>
                        {renderIssueCodeCard()}
                        <View style={styles.divider} />
                    </>
                )}

                {/* DRONE RETURN VERIFICATION (pilot → FM) */}
                {needsReturnVerification && (
                    <>
                        {renderReturnVerifyCard()}
                        <View style={styles.divider} />
                    </>
                )}

                {/* LIVE TRACKING MAP */}
                {showMap && (
                    <View style={styles.mapCard}>
                        <View style={styles.liveTrackingBadge}>
                            <Text style={styles.liveTrackingText}>{t('Live Tracking')}</Text>
                        </View>
                        <TrackingMap
                            customerLocation={
                                trackingData?.location || mission?.location
                            }
                            pilotLocation={
                                trackingData?.pilotLocation
                            }
                            customerAddress={mission?.address}
                            pilotName={mission?.assignedPilotName}
                        />
                    </View>
                )}

                {/* DRONE DETAILS */}
                {drone && typeof drone === 'object' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeaderDark}>{t('Drone Details')}</Text>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Model')}</Text><Text style={styles.dataValue}>{drone.model || t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Drone ID')}</Text><Text style={styles.dataValue}>{drone.id || drone.uid || t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Type')}</Text><Text style={styles.dataValue}>{drone.type ? t(drone.type) : t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Status')}</Text><Text style={styles.dataValue}>{drone.status ? t(drone.status) : t('N/A')}</Text></View>
                        <View style={styles.divider} />
                    </View>
                )}

                {/* PILOT DETAILS */}
                {pilot && typeof pilot === 'object' && (
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.sectionHeaderDark}>{t('Pilot Details')}</Text>
                        </View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Name')}</Text><Text style={styles.dataValue}>{pilot.name || mission?.assignedPilotName || t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Phone')}</Text><Text style={styles.dataValue}>{pilot.phone || t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Email')}</Text><Text style={styles.dataValue}>{pilot.email || t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Status')}</Text><Text style={styles.dataValue}>{pilot.status ? t(pilot.status) : t('N/A')}</Text></View>
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Pilot ID')}</Text><Text style={styles.dataValue}>{pilot.id || pilot.uid || t('N/A')}</Text></View>
                        <View style={styles.divider} />
                    </View>
                )}

                {/* CUSTOMER DETAILS */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeaderDark}>{t('Customer Details')}</Text>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Customer ID')}</Text><Text style={styles.dataValue}>{mission?.customerUid || mission?.createdBy || t('N/A')}</Text></View>
                    <View style={styles.divider} />
                </View>

                {/* MISSION DETAILS */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeaderDark}>{t('Mission Details')}</Text>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Booking #')}</Text><Text style={styles.dataValue}>{mission?.bookingNumber || t('N/A')}</Text></View>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Service')}</Text><Text style={styles.dataValue}>{mission?.serviceType ? t(mission.serviceType) : t('N/A')}</Text></View>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Sub-Service')}</Text><Text style={styles.dataValue}>{mission?.serviceDetails?.sprayingSubType ? t(mission.serviceDetails.sprayingSubType) : mission?.serviceDetails?.mappingType ? t(mission.serviceDetails.mappingType) : mission?.serviceDetails?.seedingSubType ? t(mission.serviceDetails.seedingSubType) : mission?.serviceDetails?.monitoringSubType ? t(mission.serviceDetails.monitoringSubType) : mission?.serviceDetails?.surveillanceType ? t(mission.serviceDetails.surveillanceType) : mission?.serviceDetails?.videographyType ? t(mission.serviceDetails.videographyType) : mission?.serviceDetails?.deliverySubType ? t(mission.serviceDetails.deliverySubType) : t('N/A')}</Text></View>
                    {mission?.serviceType !== 'videography' && mission?.serviceType !== 'surveillance' && (
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Crop / Area Type')}</Text><Text style={styles.dataValue}>{mission?.cropType ? t(mission.cropType) : t('N/A')}</Text></View>
                    )}
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Location')}</Text><Text style={[styles.dataValue, styles.underline]}>{mission?.address || t('N/A')}</Text></View>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Date & Time')}</Text><Text style={[styles.dataValue, styles.underline]}>{mission?.scheduledDate ? new Date(mission.scheduledDate).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) + (mission?.preferredTimeSlot ? ', ' + t(mission.preferredTimeSlot) : '') : t('N/A')}</Text></View>
                    {mission?.serviceType !== 'videography' && mission?.serviceType !== 'surveillance' && (
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Area')}</Text><Text style={styles.dataValue}>{mission?.area?.value ? `${mission.area.value} ${mission.area.unit}` : t('N/A')}</Text></View>
                    )}
                    {mission?.serviceType === 'videography' && (
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Minutes')}</Text><Text style={styles.dataValue}>{mission?.serviceDetails?.quantity ? `${mission.serviceDetails.quantity} min` : t('N/A')}</Text></View>
                    )}
                    {mission?.serviceType === 'surveillance' && (
                        <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Visits')}</Text><Text style={styles.dataValue}>{mission?.serviceDetails?.quantity || t('N/A')}</Text></View>
                    )}
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Stage')}</Text><Text style={styles.dataValue}>{mission?.stage != null ? t('Stage {{stage}}/7', { stage: mission.stage }) : t('N/A')}</Text></View>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Status')}</Text><Text style={styles.dataValue}>{mission?.status ? t(mission.status) : t('N/A')}</Text></View>
                    <View style={styles.dataRow}><Text style={styles.dataLabel}>{t('Booking ID')}</Text><Text style={styles.dataValue}>{mission?.id || t('N/A')}</Text></View>
                    <View style={styles.divider} />
                </View>

                {/* WEATHER FORECAST (customerModule UI) */}
                {showWeatherAndZone && (
                    <WeatherSummaryCard weatherData={weatherForCard} serviceDate={mission?.scheduledDate || mission?.date} />
                )}

                {/* FLYING RESTRICTIONS CHECK (customerModule UI) */}
                {showWeatherAndZone && (
                    <FlyingRestrictionSummaryCard restrictions={restrictionsForCard} />
                )}

                {/* PRICING */}
                <View style={styles.section}>
                    <View style={styles.rowBetween}><Text style={styles.dataLabel}>{t('Base Amount')}</Text><Text style={styles.pricingValue}>₹ {pricing?.baseAmount ?? mission?.priceEstimation ?? t('N/A')}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.dataLabel}>{t('Travel Charges')}</Text><Text style={styles.pricingValue}>₹ {pricing?.travelCharges ?? 0}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.dataLabel}>{t('Additional Charges')}</Text><Text style={styles.pricingValue}>₹ {pricing?.additionalCharges ?? 0}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.dataLabel}>{t('Discount')}</Text><Text style={styles.pricingValue}>-₹ {pricing?.discount ?? 0}</Text></View>
                    <View style={styles.rowBetween}><Text style={styles.dataLabel}>{t('Tax')}</Text><Text style={styles.pricingValue}>₹ {pricing?.taxAmount ?? 0}</Text></View>
                    <View style={styles.dashedDivider} />
                    <View style={styles.rowBetween}><Text style={styles.totalLabel}>{t('Total')}</Text><Text style={styles.totalValue}>₹ {pricing?.totalAmount ?? mission?.priceEstimation ?? t('N/A')}</Text></View>
                    <Text style={styles.paymentStatusLabel}>{t('Customer Payment Status:')}</Text>
                    <Text style={mission?.paymentStatus === 'paid' || mission?.paymentStatus === 'completed' ? styles.paymentGreen : styles.paymentRed}>
                        {mission?.paymentStatus === 'paid' || mission?.paymentStatus === 'completed' ? t('Payment Completed') : t('Payment {{status}}', { status: mission?.paymentStatus || t('Pending') })}
                    </Text>
                </View>

                {/* POST SERVICE ENDED */}
                {isServiceEnded && (
                    <TouchableOpacity style={styles.raiseComplaintBtn} activeOpacity={0.85}>
                        <Text style={styles.raiseComplaintText}>{t('Raise a Complaint')}</Text>
                    </TouchableOpacity>
                )}

                {/* CANCEL BOOKING (before service started) */}
                {!isServiceEnded && status !== 'service_started' && (
                    <TouchableOpacity style={styles.cancelBookingBtn} activeOpacity={0.85} onPress={handleCancelBooking}>
                        <Text style={styles.cancelBookingBtnText}>{t('Cancel Booking')}</Text>
                    </TouchableOpacity>
                )}

                {/* 24x7 SUPPORT (pre-service-ended only) */}
                {!isServiceEnded && (
                    <View>
                        <SupportCard onNavigate={onNavigate} />
                    </View>
                )}

            </ScrollView>

            {/* SELECT DRONE BOTTOM SHEET */}
            <Modal visible={showDroneSheet} animationType="slide" transparent onRequestClose={() => setShowDroneSheet(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowDroneSheet(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeaderRow}>
                            <TouchableOpacity onPress={() => setShowDroneSheet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={styles.backArrow}>←</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>{t('Select Drone')}</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {drones.length > 0 ? drones.map((droneItem, idx) => (
                                <TouchableOpacity key={droneItem.id || droneItem.droneId || droneItem.uid || idx} style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignDrone(droneItem.id || droneItem.droneId || droneItem.uid)}>
                                    <View style={styles.sheetDroneCircle}>
                                        <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" />
                                    </View>
                                    <View>
                                        <Text style={styles.sheetItemTitle}>{droneItem.model || droneItem.name || t('Drone ({{type}})', { type: droneItem.type || droneItem.droneType || t('N/A') })}</Text>
                                        <Text style={styles.sheetItemSub}>{droneItem.id || droneItem.droneId || droneItem.uid || t('--')} · {droneItem.type || droneItem.droneType ? t(droneItem.type || droneItem.droneType) : t('--')} · {droneItem.status ? t(droneItem.status) : t('--')}</Text>
                                    </View>
                                </TouchableOpacity>
                            )) : (
                                <TouchableOpacity style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignDrone('')}>
                                    <View style={styles.sheetDroneCircle}>
                                        <DroneIcon width={24} height={24} fill="#1E293B" color="#1E293B" />
                                    </View>
                                    <View>
                                        <Text style={styles.sheetItemTitle}>{t('No Drones Available')}</Text>
                                        <Text style={styles.sheetItemSub}>{t('Add drones to your fleet first')}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* SELECT PILOT BOTTOM SHEET */}
            <Modal visible={showPilotSheet} animationType="slide" transparent onRequestClose={() => setShowPilotSheet(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowPilotSheet(false)} />
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeaderRow}>
                            <TouchableOpacity onPress={() => setShowPilotSheet(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={styles.backArrow}>←</Text>
                            </TouchableOpacity>
                            <Text style={styles.sheetTitle}>{t('Select Pilot')}</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {pilots.length > 0 ? pilots.map((pilotItem, idx) => (
                                <TouchableOpacity key={pilotItem.id || pilotItem.uid || pilotItem.pilotId || idx} style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignPilot(pilotItem.id || pilotItem.uid || pilotItem.pilotId)}>
                                    <AvatarIcon width={44} height={44} style={{ marginRight: 14 }} />
                                    <View>
                                        <Text style={styles.sheetItemTitle}>{pilotItem.name || pilotItem.fullName || t('Pilot')}</Text>
                                        <Text style={styles.sheetItemSub}>{pilotItem.phone || pilotItem.mobile || t('--')} · {(pilotItem.serviceTypes || pilotItem.profileData?.serviceTypes || []).slice(0, 2).join(', ') || (pilotItem.status ? t(pilotItem.status) : t('--'))}</Text>
                                    </View>
                                </TouchableOpacity>
                            )) : (
                                <TouchableOpacity style={styles.sheetListRow} activeOpacity={0.8} onPress={() => handleAssignPilot('')}>
                                    <AvatarIcon width={44} height={44} style={{ marginRight: 14 }} />
                                    <View>
                                        <Text style={styles.sheetItemTitle}>{t('No Pilots Available')}</Text>
                                        <Text style={styles.sheetItemSub}>{t('Add pilots to your fleet first')}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 84
    },
    //sectionHeaderPadding: { paddingHorizontal: 20, paddingTop: 10 },

    bookingStatusLabel: { fontSize: 15, color: '#334155', marginBottom: 10 },

    statusBarCard: { backgroundColor: '#0B3A2C', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, marginBottom: 20 },
    statusBarLineWrap: { position: 'relative', height: 36 },
    statusBarTrack: { position: 'absolute', top: 18, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
    statusBarDotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 36 },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.55)' },
    statusActiveDotOuter: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    statusLabel: { fontSize: 13, fontWeight: '500', color: '#FFFFFF', textAlign: 'center', marginTop: 12 },

    assignLabel: { fontSize: 15, color: '#334155', marginBottom: 12 },
    assignBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
    assignBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    assignBtnDisabled: { backgroundColor: '#CBD5E1' },
    handoverCard: { backgroundColor: '#E7F4EC', borderWidth: 1, borderColor: '#0B3A2C', borderRadius: 16, padding: 18, alignItems: 'center' },
    handoverTitle: { fontSize: 15, fontWeight: '600', color: '#0B3A2C', marginBottom: 8 },
    handoverCode: { fontSize: 32, fontWeight: '700', color: '#1E293B', letterSpacing: 8, marginBottom: 8 },
    handoverHint: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 19, marginBottom: 12 },
    handoverInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, height: 50, width: '100%', textAlign: 'center', fontSize: 20, letterSpacing: 6, color: '#1E293B', marginBottom: 12 },

    mapCard: { height: 220, borderRadius: 24, overflow: 'hidden', marginBottom: 20, backgroundColor: '#0E2A1A', position: 'relative' },
    mapImage: { width: '100%', height: '100%' },
    liveTrackingBadge: { position: 'absolute', top: 12, left: 12, zIndex: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    liveTrackingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

    section: { paddingVertical: 4 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionHeaderDark: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginTop: 6 },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 6 },
    dataLabel: { fontSize: 14, color: '#64748B', marginBottom: 0, flex: 1 },
    dataValue: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'right', flex: 1 },
    underline: { textDecorationLine: 'underline' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
    dashedDivider: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 12 },

    weatherCard: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 20 },
    weatherTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },
    flyingTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },
    safePill: { backgroundColor: '#D1FAE5', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
    safePillText: { color: '#188A4E', fontSize: 12, fontWeight: '600' },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 6 },
    locationText: { fontSize: 13, color: '#64748B' },
    bigTemp: { fontSize: 44, fontWeight: '500', color: '#0F172A' },
    weatherConditionText: { fontSize: 14, color: '#334155', textAlign: 'right' },
    weatherHiLow: { fontSize: 13, color: '#64748B', textAlign: 'right', marginTop: 2 },
    weatherStatsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F4F6F8', borderRadius: 14, padding: 14, marginTop: 14, marginBottom: 12 },
    weatherStat: { alignItems: 'center', flex: 1 },
    weatherStatLabel: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 15 },
    weatherSafeText: { fontSize: 13, fontWeight: '500', color: '#334155', textAlign: 'center', marginBottom: 14 },
    radarWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    lastChecked: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

    restrictionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 },
    greenDot: { color: '#188A4E', fontSize: 10, marginRight: 8 },
    restrictionLabel: { fontSize: 14, color: '#334155', flex: 1 },
    restrictionValue: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
    safeToFlyBanner: { flexDirection: 'row', backgroundColor: '#ECFDF3', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 14 },
    safeToFlyTitle: { fontSize: 14, fontWeight: '600', color: '#027A48' },
    safeToFlySub: { fontSize: 12, color: '#027A48', marginTop: 2 },

    boldDark: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

    pricingValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    totalLabel: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    totalValue: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    paymentStatusLabel: { fontSize: 14, color: '#64748B', marginTop: 8, marginBottom: 2 },
    paymentRed: { fontSize: 16, fontWeight: '700', color: '#C53030' },
    paymentGreen: { fontSize: 16, fontWeight: '700', color: '#188A4E' },

    raiseComplaintBtn: { borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
    raiseComplaintText: { fontSize: 16, fontWeight: '500', color: '#475569' },
    cancelBookingBtn: { borderWidth: 1.5, borderColor: '#C53030', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 12, backgroundColor: '#FFFFFF' },
    cancelBookingBtnText: { fontSize: 16, fontWeight: '500', color: '#C53030' },

    supportCard: { backgroundColor: '#072A20', borderRadius: 24, padding: 22, marginTop: 8, marginBottom: 12 },
    supportTitle: { fontSize: 18, fontWeight: '500', color: '#FFFFFF', marginBottom: 4 },
    supportSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 14 },
    supportBtn: { backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start' },
    supportBtnText: { fontSize: 14, fontWeight: '500', color: '#072A20' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: '#F4F6F8', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 14 },
    sheetHandle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 18 },
    sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    sheetListRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderStyle: 'dashed' },
    sheetDroneCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    sheetItemTitle: { fontSize: 20, color: '#1E293B' },
    sheetItemSub: { fontSize: 14, color: '#64748B', marginTop: 2 },
});

export default BookingDetailsScreen;
