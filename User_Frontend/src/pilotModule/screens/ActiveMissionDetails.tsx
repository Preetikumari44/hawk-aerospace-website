import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
    Image,
    TextInput,
    Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import SupportCard from '../../customerModule/components/SupportCard';

import PhoneIcon from '../../assets/phone.svg';
import { pilotApi, chatApi } from '../../utils/api';
import { getCurrentLocationDemo } from '../../utils/mockLocation';
import { connectSocket, sendMissionGps } from '../../utils/socket';
import TrackingMap from '../../customerModule/components/TrackingMap';
import WeatherSummaryCard from '../../customerModule/components/WeatherSummaryCard';
import FlyingRestrictionSummaryCard from '../../customerModule/components/FlyingRestrictionSummaryCard';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

interface MissionWeather {
    date?: string;
    location?: string;
    temperature?: string | number;
    condition?: string;
    wind?: string;
    humidity?: string;
    rainProbability?: string;
    highTemp?: string | number;
    lowTemp?: string | number;
    isSafe?: boolean;
    lastChecked?: string;
}

interface MissionRestriction {
    airspaceClass?: string;
    zoneType?: string;
    nearestAirport?: string;
    maxAltitude?: string;
    activeNOTAMs?: string;
    heightRange?: string;
    zoneDetails?: string;
    isSafe?: boolean;
    status?: string;
    summary?: string;
    reasons?: string[];
    zones?: Array<{ name?: string; distanceKm?: number; type?: string }>;
    checkedAt?: string;
}

interface CustomerInfo {
    name?: string;
    phone?: string;
    email?: string;
}

interface FleetManagerInfo {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
}

interface DroneInfo {
    name?: string;
    id?: string;
}

interface MissionData {
    id?: string;
    serviceType?: string;
    service?: string;
    subService?: string;
    infrastructureType?: string;
    title?: string;
    scheduledDate?: string;
    preferredTimeSlot?: string;
    timeSlot?: string;
    location?: string;
    dateTime?: string;
    landArea?: string | number;
    drawnLandArea?: string | number;
    estimatedServiceTime?: string;
    serviceId?: string;
    missionId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    farmName?: string;
    farmArea?: string | number;
    farmLocation?: string;
    customer?: CustomerInfo;
    fleetManagerName?: string;
    fleetManagerPhone?: string;
    fleetManagerEmail?: string;
    fleetManagerAddress?: string;
    fleetManager?: FleetManagerInfo;
    droneName?: string;
    droneId?: string;
    drone?: DroneInfo;
    weather?: MissionWeather;
    restrictions?: MissionRestriction;
    costToCustomer?: number | string;
    pilotServiceCost?: number | string;
    totalEarnings?: number | string;
    cancellationChances?: number | string;
    paymentStatus?: string;
    paymentMethod?: string;
    cashPending?: boolean;
    bookingId?: string;
    missionStatus?: string;
    equipmentList?: string[];
    emergencyProtocols?: string[];
    eta?: string;
    estimatedArrival?: string;
    address?: any;
    detailedAddress?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    nextStep?: string;
}

interface ActiveMissionDetailsProps {
    onNavigate: any;
    routeParams?: {
        missionId?: string;
        mission?: MissionData;
    };
}

const formatCurrency = (value?: number | string, locale?: string): string => {
    if (value === undefined || value === null) return '₹ 0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return '₹ 0';
    return `₹ ${num.toLocaleString(locale)}`;
};

const formatDate = (value?: string, locale?: string, translate?: (key: string, params?: Record<string, string | number>) => string): string => {
    if (!value) return translate ? translate('Not available') : 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const wmoCodes: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

const ActiveMissionDetailsScreen: React.FC<ActiveMissionDetailsProps> = ({ onNavigate, routeParams }) => {

    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();

    const [missionStatus, setMissionStatus] = useState<'pending' | 'started' | 'flying' | 'farm_completed' | 'completed'>('pending');

    const [mission, setMission] = useState<MissionData | null>(routeParams?.mission || null);
    const [loading, setLoading] = useState<boolean>(!routeParams?.mission && !!routeParams?.missionId);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [farmName, setFarmName] = useState('');
    const [farmArea, setFarmArea] = useState('');
    const isFormValid = farmName.trim().length > 0 && farmArea.trim().length > 0;

    const [pilotLocation, setPilotLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cancelledRef = useRef(false);
    // ── Drone handover codes ──
    const [handoverCode, setHandoverCode] = useState('');
    const [handoverSubmitting, setHandoverSubmitting] = useState(false);
    const [returnCode, setReturnCode] = useState<string | null>(null);

    const normalizedHandover = handoverCode.trim().toUpperCase();
    const canStartMission = normalizedHandover.length === 4 && !handoverSubmitting;

    const handleStartMission = async () => {
        const id = mission?.id || missionId;
        if (!id || !canStartMission) return;
        setHandoverSubmitting(true);
        try {
            await pilotApi.updateMissionStatus(id, { status: 'started', handoverCode: normalizedHandover });
            setMissionStatus('started');
        } catch (error: any) {
            Alert.alert(
                t('Cannot Start Mission'),
                error?.message || t('Incorrect drone code. Ask your fleet manager for the correct code.'),
            );
        } finally {
            setHandoverSubmitting(false);
        }
    };

    const handleCompleteService = async () => {
        const id = mission?.id || missionId;
        if (!id) return;
        try {
            const resp: any = await pilotApi.updateMissionStatus(id, { status: 'completed' });
            const code = resp?.handoverReturnCode || resp?.mission?.handoverReturnCode || (mission as any)?.handoverReturnCode || null;
            if (code) {
                setReturnCode(String(code));
                setMission((prev) => (prev ? { ...prev, handoverReturnCode: String(code) } as any : prev));
            }
            setMissionStatus('completed');
        } catch (error: any) {
            Alert.alert(
                t('Completion Failed'),
                error?.message || t('Could not complete the mission. Please try again.'),
            );
        }
    };

    const missionId = routeParams?.missionId;
    const coords = (mission as any)?.coordinates;
    const customerLatLng = coords?.lat != null && coords?.lng != null ? { lat: coords.lat, lng: coords.lng } : undefined;

    const getPilotLocation = () => {
        const onLocation = (lat: number, lng: number) => {
            setPilotLocation({ lat, lng });
            const bookingId = (mission as any)?.bookingId || missionId;
            if (bookingId) {
                sendMissionGps(bookingId, lat, lng);
            }
            if (mission?.id) {
                pilotApi.updateLocation({ lat, lng }).catch((e: any) =>
                    console.error('Failed to send location to backend', e)
                );
            }
        };

        const nav = navigator as any;
        if (typeof nav.geolocation !== 'undefined' && nav.geolocation) {
            nav.geolocation.getCurrentPosition(
                (pos: { coords: { latitude: number; longitude: number } }) => {
                    console.log('Geolocation success', pos.coords.latitude, pos.coords.longitude);
                    onLocation(pos.coords.latitude, pos.coords.longitude);
                },
                (err: any) => {
                    console.warn('Geolocation failed, using mock location', err?.message || err);
                    getCurrentLocationDemo((mockPos: { coords: { latitude: number; longitude: number } }) => {
                        onLocation(mockPos.coords.latitude, mockPos.coords.longitude);
                    });
                },
                { enableHighAccuracy: true, timeout: 10000 },
            );
        } else {
            console.warn('navigator.geolocation not available, using mock location');
            getCurrentLocationDemo((mockPos: { coords: { latitude: number; longitude: number } }) => {
                onLocation(mockPos.coords.latitude, mockPos.coords.longitude);
            });
        }
    };

    /**
     * ⭐ Live location streaming: send GPS every 5 seconds while the mission
     * is active so the customer (and fleet manager) see the pilot move in
     * real time. Falls back to the demo/mock location if GPS is unavailable.
     */
    useEffect(() => {
        if (!['started', 'flying', 'farm_completed'].includes(missionStatus)) return;
        const bookingId = (mission as any)?.bookingId || missionId;
        if (!bookingId) return;

        const reportLocation = (lat: number, lng: number) => {
            setPilotLocation({ lat, lng });
            sendMissionGps(bookingId, lat, lng);
            if (mission?.id) {
                pilotApi.updateLocation({ lat, lng }).catch(() => { });
            }
        };

        const readPosition = () => {
            const nav = navigator as any;
            const onSuccess = (pos: { coords: { latitude: number; longitude: number } }) => {
                reportLocation(pos.coords.latitude, pos.coords.longitude);
            };
            const onError = (err?: any) => {
                console.warn('Live GPS failed, using mock location', err?.message || err);
                getCurrentLocationDemo((mockPos: { coords: { latitude: number; longitude: number } }) => {
                    reportLocation(mockPos.coords.latitude, mockPos.coords.longitude);
                });
            };
            if (typeof nav.geolocation !== 'undefined' && nav.geolocation) {
                nav.geolocation.getCurrentPosition(onSuccess, onError, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            } else {
                onError();
            }
        };

        // Make sure the socket is connected so mission:gps reaches the server.
        connectSocket().then(() => {
            if (cancelledRef.current) return;
            readPosition();
            intervalRef.current = setInterval(readPosition, 5000);
        });

        return () => {
            cancelledRef.current = true;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [missionStatus, missionId, mission?.id]);

    const openChat = async () => {
        const bookingId = (mission as any)?.bookingId || missionId;
        if (!bookingId) return;
        let cid = conversationId;
        if (!cid) {
            try {
                const resp = await chatApi.createConversation({
                    participantUid: (mission as any)?.customerUid || (mission as any)?.customerName,
                    participantRole: 'customer',
                    bookingId,
                    type: 'customer_pilot',
                });
                const conv = resp?.data || resp?.conversation || resp;
                cid = conv?.id || conv?.conversationId;
                if (cid) setConversationId(cid);
            } catch (e) {
                console.error('Failed to create conversation', e);
            }
        }
        if (cid) onNavigate('ChatScreen', { conversationId: cid });
    };

    const handleCancelMission = () => {
        const cancelId = mission?.id || missionId;
        if (!cancelId) return;
        Alert.alert(
            t('Cancel Mission'),
            t('Are you sure you want to cancel this mission?'),
            [
                { text: t('No'), style: 'cancel' },
                {
                    text: t('Yes, Cancel'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await pilotApi.cancelMission(cancelId, 'Cancelled by pilot');
                            Alert.alert(
                                t('Mission Cancelled'),
                                t('The mission has been cancelled successfully.'),
                            );
                            onNavigate('Home');
                        } catch (error: any) {
                            Alert.alert(
                                t('Cancellation Failed'),
                                error?.message || t('Could not cancel the mission. Please try again.'),
                            );
                        }
                    },
                },
            ],
        );
    };

    const handleConfirmCash = () => {
        const bookingId = (mission as any)?.bookingId;
        if (!bookingId) return;
        Alert.alert(
            t('Confirm Cash'),
            t('Have you received the cash payment of ') +
            formatCurrency(mission?.costToCustomer, locale) +
            t(' from the customer?'),
            [
                { text: t('No'), style: 'cancel' },
                {
                    text: t('Yes, Confirm'),
                    onPress: async () => {
                        try {
                            await pilotApi.confirmCash(bookingId);
                            Alert.alert(t('Payment Confirmed'), t('Cash payment confirmed successfully.'));
                            setMission((prev) => prev ? { ...prev, paymentStatus: 'paid', cashPending: false } : prev);
                        } catch (error: any) {
                            Alert.alert(
                                t('Confirmation Failed'),
                                error?.message || t('Could not confirm cash payment. Please try again.'),
                            );
                        }
                    },
                },
            ],
        );
    };

    useEffect(() => {
        if (missionId && !routeParams?.mission) {
            setLoading(true);
            setFetchError(null);
            pilotApi.getMission(missionId)
                .then((response: any) => {
                    const data = response?.data || response?.mission || response;
                    setMission(data);
                    setFarmName(data?.farmName || '');
                    setFarmArea(data?.farmArea?.toString() || '');
                    if (data?.handoverReturnCode) setReturnCode(String(data.handoverReturnCode));
                    if (data?.status === 'completed') setMissionStatus('completed');
                })
                .catch(() => {
                    setFetchError('Failed to load mission details');
                })
                .finally(() => setLoading(false));
        } else if (routeParams?.mission) {
            setFarmName(routeParams.mission.farmName || '');
            setFarmArea(routeParams.mission.farmArea?.toString() || '');
            const rc = (routeParams.mission as any)?.handoverReturnCode;
            if (rc) setReturnCode(String(rc));
        }
    }, []);

    const [openMeteoWeather, setOpenMeteoWeather] = useState<any>(null);

    // Fetch real-time weather from Open-Meteo using booking coordinates
    useEffect(() => {
        const coords = (mission as any)?.coordinates;
        if (!coords?.lat || !coords?.lng) return;

        const isSafeCode = (code: number): boolean => ![45, 48, 56, 57, 66, 67, 75, 77, 82, 85, 86, 95, 96, 99].includes(code);

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;

        fetch(url)
            .then((r) => r.json())
            .then((data: any) => {
                if (!data?.current) return;
                const c = data.current;
                const code = c.weather_code ?? -1;
                setOpenMeteoWeather({
                    temperature: c.temperature_2m,
                    condition: wmoCodes[code] || 'Unknown',
                    wind: c.wind_speed_10m != null ? `${c.wind_speed_10m} km/h` : undefined,
                    humidity: c.relative_humidity_2m != null ? `${c.relative_humidity_2m}%` : undefined,
                    isSafe: isSafeCode(code),
                    lastChecked: new Date().toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                });
            })
            .catch(() => { });
    }, [mission?.id, (mission as any)?.coordinates?.lat, (mission as any)?.coordinates?.lng]);

    const liveWeather = useMemo(() => {
        const bookingWeather = (mission as any)?.weather;
        if (!openMeteoWeather) return bookingWeather;
        return { ...bookingWeather, ...openMeteoWeather, location: (mission as any)?.address || (mission as any)?.farmLocation };
    }, [mission, openMeteoWeather]);

    useEffect(() => {
        const onBackPress = () => {
            onNavigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate('Home')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Mission Details')}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{t('Loading mission details...')}</Text>
                </View>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => onNavigate('Home')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Mission Details')}</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{t(fetchError)}</Text>
                </View>
            </View>
        );
    }

    const renderCustomerDetailsReadonly = () => (
        <View style={styles.flatSection}>
            <View style={styles.rowSpaceBetween}>
                <Text style={styles.sectionHeaderDark}>{t('Customer Details')}</Text>
                <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.8}>
                    <PhoneIcon width={20} height={20} fill="#1E293B" />
                </TouchableOpacity>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Name')}</Text>
                <Text style={styles.dataValue}>{mission?.customerName || mission?.customer?.name || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Phone')}</Text>
                <Text style={styles.dataValue}>{mission?.customerPhone || mission?.customer?.phone || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Email')}</Text>
                <Text style={styles.dataValue}>{mission?.customerEmail || mission?.customer?.email || t('Not available')}</Text>
            </View>
            {missionStatus !== 'pending' && missionStatus !== 'started' && (
                <>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataLabel}>{t('Farm Name')}</Text>
                        <Text style={styles.dataValue}>{farmName || mission?.farmName || t('Not available')}</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataLabel}>{t('Farm Area')}</Text>
                        <Text style={styles.dataValue}>{farmArea || mission?.farmArea || t('Not available')}</Text>
                    </View>
                    <View style={styles.dataBlock}>
                        <Text style={styles.dataLabel}>{t('Farm Location')}</Text>
                        <Text style={[styles.dataValue, styles.underlineText]}>{mission?.farmLocation || mission?.location || t('Not available')}</Text>
                    </View>
                    <Image
                        source={require('../../assets/farm.jpg')}
                        style={styles.capturedFarmImage}
                        resizeMode="cover"
                    />
                </>
            )}
            <View style={styles.divider} />
        </View>
    );

    const renderFleetManager = () => (
        <View style={styles.flatSection}>
            <View style={styles.rowSpaceBetween}>
                <Text style={styles.sectionHeaderDark}>{t('Fleet Manager Details')}</Text>
                <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.8}>
                    <PhoneIcon width={20} height={20} fill="#1E293B" />
                </TouchableOpacity>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Name')}</Text>
                <Text style={styles.dataValue}>{mission?.fleetManagerName || mission?.fleetManager?.name || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Phone')}</Text>
                <Text style={styles.dataValue}>{mission?.fleetManagerPhone || mission?.fleetManager?.phone || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Email')}</Text>
                <Text style={styles.dataValue}>{mission?.fleetManagerEmail || mission?.fleetManager?.email || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Address')}</Text>
                <Text style={[styles.dataValue, styles.underlineText]}>{mission?.fleetManagerAddress || mission?.fleetManager?.address || t('Not available')}</Text>
            </View>
            <View style={styles.divider} />
        </View>
    );

    const renderDroneDetails = () => (
        <View style={styles.flatSection}>
            <Text style={styles.sectionHeaderDark}>{t('Drone Details')}</Text>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Name')}</Text>
                <Text style={styles.dataValue}>{mission?.droneName || mission?.drone?.name || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Drone ID')}</Text>
                <Text style={styles.dataValue}>{mission?.droneId || mission?.drone?.id || t('Not available')}</Text>
            </View>
            <View style={styles.divider} />
        </View>
    );

    const renderMissionDetails = () => (
        <View style={styles.flatSection}>
            <Text style={styles.sectionHeaderDark}>{t('Mission Details')}</Text>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Service')}</Text>
                <Text style={styles.dataValue}>{mission?.service || mission?.serviceType || mission?.title || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Sub-Service')}</Text>
                <Text style={styles.dataValue}>{mission?.subService || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Infrastructure Type')}</Text>
                <Text style={styles.dataValue}>{mission?.infrastructureType || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Location')}</Text>
                <Text style={styles.dataValue}>{mission?.location || mission?.address?.line1 || mission?.address || t('Not available')}</Text>
            </View>
            {mission?.detailedAddress?.addressLine1 && (
                <View style={styles.dataBlock}>
                    <Text style={styles.dataLabel}>{t('Address Line 1')}</Text>
                    <Text style={styles.dataValue}>{mission.detailedAddress.addressLine1}</Text>
                </View>
            )}
            {mission?.detailedAddress?.addressLine2 && (
                <View style={styles.dataBlock}>
                    <Text style={styles.dataLabel}>{t('Address Line 2')}</Text>
                    <Text style={styles.dataValue}>{mission.detailedAddress.addressLine2}</Text>
                </View>
            )}
            {mission?.detailedAddress?.city && (
                <View style={styles.dataBlock}>
                    <Text style={styles.dataLabel}>{t('City')}</Text>
                    <Text style={styles.dataValue}>{mission.detailedAddress.city}</Text>
                </View>
            )}
            {mission?.detailedAddress?.state && (
                <View style={styles.dataBlock}>
                    <Text style={styles.dataLabel}>{t('State')}</Text>
                    <Text style={styles.dataValue}>{mission.detailedAddress.state}</Text>
                </View>
            )}
            {mission?.detailedAddress?.pincode && (
                <View style={styles.dataBlock}>
                    <Text style={styles.dataLabel}>{t('Pincode')}</Text>
                    <Text style={styles.dataValue}>{mission.detailedAddress.pincode}</Text>
                </View>
            )}
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Date & Time')}</Text>
                <Text style={styles.dataValue}>{mission?.dateTime || (mission?.scheduledDate ? `${formatDate(mission.scheduledDate, locale, t)}${mission?.preferredTimeSlot ? `, ${mission.preferredTimeSlot}` : ''}` : t('Not available'))}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Land Area in Acres')}</Text>
                <Text style={styles.dataValue}>{mission?.landArea?.toString() || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Drawn Land Area in Acres')}</Text>
                <Text style={styles.dataValue}>{mission?.drawnLandArea?.toString() || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Estimated Service Time')}</Text>
                <Text style={styles.dataValue}>{mission?.estimatedServiceTime || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Service ID')}</Text>
                <Text style={styles.dataValue}>{mission?.serviceId || t('Not available')}</Text>
            </View>
            <View style={styles.dataBlock}>
                <Text style={styles.dataLabel}>{t('Mission ID')}</Text>
                <Text style={styles.dataValue}>{mission?.missionId || mission?.id || t('Not available')}</Text>
            </View>
            <View style={styles.divider} />
        </View>
    );

    const renderMissionOperations = (isCompleted: boolean) => (
        <View style={styles.flatSection}>
            <Text style={styles.sectionHeaderDark}>{t('Mission Operations')}</Text>

            <Text style={styles.dataLabel}>{t('Equipment List:')}</Text>
            {(mission?.equipmentList?.length ? mission.equipmentList : [t('No equipment listed')]).map((item, index) => (
                <View key={index} style={styles.checkboxRow}>
                    {isCompleted ? (
                        <View style={styles.checkboxFilled}><Text style={styles.checkMarkWhiteSmall}>✓</Text></View>
                    ) : (
                        <View style={styles.checkboxOutline} />
                    )}
                    <Text style={styles.checkboxText}>{item}</Text>
                </View>
            ))}

            <Text style={[styles.dataLabel, { marginTop: 16 }]}>
                {t('Manual Weather Check ')}<Text style={styles.redAsterisk}>*</Text>
            </Text>
            <View style={styles.checkboxRow}>
                {isCompleted ? (
                    <View style={styles.checkboxFilled}><Text style={styles.checkMarkWhiteSmall}>✓</Text></View>
                ) : (
                    <View style={styles.checkboxOutline} />
                )}
                <Text style={styles.checkboxText}>{t('I confirm that the weather & wind speed is safe for flying')}</Text>
            </View>

            <Text style={[styles.dataLabel, { marginTop: 16 }]}>{t('Emergency Protocols')}</Text>
            {(mission?.emergencyProtocols?.length ? mission.emergencyProtocols : [t('No emergency protocols listed')]).map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                </View>
            ))}
            <View style={styles.divider} />
        </View>
    );

    const renderWeather = () => {
        const weather = liveWeather;
        const isSafe = weather?.isSafe !== false;
        const windNum = parseFloat(String(weather?.wind || '')) || (typeof weather?.windSpeed === 'number' ? weather.windSpeed : 12);
        const humidityNum = parseFloat(String(weather?.humidity || '')) || (typeof weather?.humidity === 'number' ? weather.humidity : 40);

        const weatherForCard = {
            status: weather?.status ? String(weather.status).toLowerCase() : (isSafe ? 'green' : 'red'),
            temperature: Number(weather?.temperature) || 28,
            windSpeed: windNum,
            humidity: humidityNum,
            forecast: weather?.condition || weather?.summary || '',
        };

        // Uses the exact same card as the customer app.
        return <WeatherSummaryCard weatherData={weatherForCard} serviceDate={mission?.scheduledDate || (mission as any)?.date} />;
    };

    const renderRestrictions = () => {
        const r = mission?.restrictions;
        const isSafe = r?.isSafe !== false;

        const restrictionsForCard = {
            status: r?.status ? String(r.status).toLowerCase() : (isSafe ? 'green' : 'red'),
            summary: r?.summary || r?.zoneDetails || r?.nearestAirport || '',
            reasons: r?.reasons || [],
            zones: r?.zones || [],
            nearestZone: (r?.nearestAirport || r?.zoneDetails)
                ? { name: r?.nearestAirport || r?.zoneDetails, type: r?.zoneType }
                : null,
            checkedAt: r?.checkedAt,
        };

        // Uses the exact same card as the customer app.
        return <FlyingRestrictionSummaryCard restrictions={restrictionsForCard} />;
    };

    const renderFinancialsAndCancel = () => (
        <View style={styles.flatSection}>
            {(missionStatus === 'pending' || missionStatus === 'started' || missionStatus === 'flying') && (
                <>
                    <View style={styles.cancellationPill}>
                        <Text style={styles.cancellationText}>{t('Booking Cancellation Chances: ')}<Text style={styles.cancellationZero}>{mission?.cancellationChances || t('0%')}</Text></Text>
                    </View>
                    <View style={styles.divider} />
                </>
            )}
            <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>{t('Cost to Customer')}</Text>
                <Text style={styles.financialValue}>{formatCurrency(mission?.costToCustomer, locale)}</Text>
            </View>
            <Text style={[styles.sectionHeaderDark, { marginTop: 16, marginBottom: 8 }]}>{t('Estimated Earnings Breakdown')}</Text>
            <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>{t('Pilot Service Cost')}</Text>
                <Text style={styles.financialValue}>{formatCurrency(mission?.pilotServiceCost, locale)}</Text>
            </View>
            <View style={styles.dashedDivider} />
            <View style={styles.financialRow}>
                <Text style={styles.totalTextLabel}>{t('Total')}</Text>
                <Text style={styles.totalTextValue}>{formatCurrency(mission?.totalEarnings ?? mission?.pilotServiceCost, locale)}</Text>
            </View>
            <Text style={[styles.dataLabel, { marginTop: 12 }]}>{t('Customer Payment Status:')}</Text>
            <Text style={[styles.paymentPendingText, mission?.paymentStatus === 'paid' && styles.paymentPaidText]}>
                {mission?.paymentStatus === 'paid'
                    ? t('Paid')
                    : mission?.cashPending
                        ? t('Cash Pending — awaiting pilot confirmation')
                        : t(mission?.paymentStatus || 'Not available')}
            </Text>

            {mission?.cashPending && mission?.paymentStatus !== 'paid' && (
                <TouchableOpacity
                    style={styles.confirmCashBtn}
                    activeOpacity={0.85}
                    onPress={handleConfirmCash}
                >
                    <Text style={styles.confirmCashBtnText}>{t('Confirm Cash Received')}</Text>
                </TouchableOpacity>
            )}

            {missionStatus === 'farm_completed' && (
                <TouchableOpacity
                    style={styles.completeMissionBtn}
                    activeOpacity={0.85}
                    onPress={handleCompleteService}
                >
                    <Text style={styles.completeMissionBtnText}>{t('Complete Mission')}</Text>
                </TouchableOpacity>
            )}

            {(missionStatus === 'pending' || missionStatus === 'started') && (
                <TouchableOpacity
                    style={styles.cancelMissionBtn}
                    activeOpacity={0.8}
                    onPress={handleCancelMission}
                >
                    <Text style={styles.cancelMissionBtnText}>{t('Cancel Mission')}</Text>
                </TouchableOpacity>
            )}

            {(missionStatus === 'flying' || missionStatus === 'farm_completed') && (
                <TouchableOpacity
                    style={styles.cancelMissionBtn}
                    activeOpacity={0.8}
                    onPress={openChat}
                >
                    <Text style={styles.cancelMissionBtnText}>{t('Contact Support to Cancel')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate('Home')}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Mission Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                {missionStatus === 'pending' && (
                    <>
                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>{t('Next Steps:')}</Text>
                            <Text style={styles.sectionBodyText}>
                                {t('Only start the Mission when you have collected the Drone from Fleet Manager')}
                            </Text>
                            <Text style={styles.inputLabel}>{t('Drone Code from Fleet Manager')} <Text style={styles.redAsterisk}>*</Text></Text>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.inputText}
                                    value={handoverCode}
                                    onChangeText={(v) => setHandoverCode(v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase())}
                                    placeholder={t('Enter 4-character code')}
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    maxLength={4}
                                    editable={!handoverSubmitting}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.bluePillBtn, !canStartMission && styles.bluePillBtnDisabled]}
                                disabled={!canStartMission}
                                activeOpacity={0.85}
                                onPress={handleStartMission}
                            >
                                <Text style={styles.bluePillBtnText}>{t(handoverSubmitting ? 'Verifying...' : 'Start mission')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>{t('Customer Details')}</Text>
                            <View style={styles.dataBlock}>
                                <Text style={styles.dataLabel}>{t('Name')}</Text>
                                <Text style={styles.dataValue}>{mission?.customerName || mission?.customer?.name || t('Not available')}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />

                        {renderFleetManager()}
                        {renderDroneDetails()}
                        {renderMissionDetails()}
                        {renderMissionOperations(false)}
                        {renderWeather()}
                        <View style={styles.spacer} />
                        {renderRestrictions()}
                        {renderFinancialsAndCancel()}
                        <SupportCard onNavigate={onNavigate} />
                    </>
                )}

                {missionStatus === 'started' && (
                    <>
                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>{t('Next Steps:')}</Text>
                            <Text style={styles.sectionBodyText}>
                                {t('Reach the Service Location and complete manual weather and wind checks. Update Customer Details. Then Start Flying.')}
                            </Text>
                            <TrackingMap
                                customerLocation={customerLatLng}
                                pilotLocation={pilotLocation}
                                customerAddress={(mission as any)?.address || t('Service Location')}
                                pilotName={t('You')}
                                style={{}}
                            />
                            <Text style={styles.mapBelowText}>
                                {pilotLocation && customerLatLng
                                    ? t('Route and ETA shown on map above')
                                    : t('Set your location above to see directions')}
                            </Text>
                            <TouchableOpacity
                                style={styles.locationBtn}
                                activeOpacity={0.85}
                                onPress={getPilotLocation}
                            >
                                <Text style={styles.locationBtnText}>{t(pilotLocation ? '↻ Update My Location' : '📍 Share My Location')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.chatBtn}
                                activeOpacity={0.85}
                                onPress={openChat}
                            >
                                <Text style={styles.chatBtnText}>{t('Chat with Customer')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {renderMissionOperations(false)}

                        <View style={styles.flatSection}>
                            <View style={styles.rowSpaceBetween}>
                                <Text style={styles.sectionHeaderDark}>{t('Customer Details')}</Text>
                                <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.8}>
                                    <PhoneIcon width={20} height={20} fill="#1E293B" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>{t('Name')}</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.inputText} value={mission?.customerName || mission?.customer?.name || ''} editable={false} />
                            </View>

                            <Text style={styles.inputLabel}>{t('Phone Number')}</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.inputText} value={mission?.customerPhone || mission?.customer?.phone || ''} editable={false} />
                            </View>

                            <Text style={styles.inputLabel}>{t('Email ID')}</Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.inputText} value={mission?.customerEmail || mission?.customer?.email || ''} editable={false} />
                            </View>

                            <Text style={styles.inputLabel}>{t('Farm Name')} <Text style={styles.redAsterisk}>*</Text></Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.inputText} value={farmName} onChangeText={setFarmName} />
                            </View>

                            <Text style={styles.inputLabel}>{t('Farm Area')} <Text style={styles.redAsterisk}>*</Text></Text>
                            <View style={styles.inputBox}>
                                <TextInput style={styles.inputText} value={farmArea} onChangeText={setFarmArea} />
                            </View>

                            <Text style={styles.inputLabel}>{t('Farm Location')} <Text style={styles.redAsterisk}>*</Text></Text>
                            <View style={styles.inputBoxWithIcon}>
                                <TextInput style={styles.flexInput} editable={false} />
                                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B3A2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <Circle cx="12" cy="13" r="4" />
                                </Svg>
                            </View>

                            <TouchableOpacity
                                style={[styles.startFlyingBtn, !isFormValid && styles.startFlyingBtnDisabled]}
                                disabled={!isFormValid}
                                activeOpacity={0.85}
                                onPress={() => setMissionStatus('flying')}
                            >
                                <Text style={[styles.startFlyingBtnText, !isFormValid && styles.startFlyingBtnTextDisabled]}>
                                    {t('Start Flying')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {renderFleetManager()}
                        {renderDroneDetails()}
                        {renderMissionDetails()}
                        {renderWeather()}
                        <View style={styles.spacer} />
                        {renderRestrictions()}
                        {renderFinancialsAndCancel()}
                        <SupportCard onNavigate={onNavigate} />
                    </>
                )}

                {missionStatus === 'flying' && (
                    <>
                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>{t('Next Steps:')}</Text>
                            <Text style={styles.sectionBodyText}>
                                {t('Start Flying the Drone & complete the Mission')}
                            </Text>
                            <TrackingMap
                                customerLocation={customerLatLng}
                                pilotLocation={pilotLocation}
                                customerAddress={(mission as any)?.address || t('Service Location')}
                                pilotName={t('You')}
                                style={{}}
                            />
                            <Text style={styles.mapBelowText}>
                                {t('Mission Should complete in ')}<Text style={styles.mapBelowTextDark}>{mission?.estimatedServiceTime || t('Not available')}</Text>
                            </Text>

                            <TouchableOpacity
                                style={[styles.chatBtn, { marginTop: 16 }]}
                                activeOpacity={0.85}
                                onPress={openChat}
                            >
                                <Text style={styles.chatBtnText}>{t('Chat with Customer')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.bluePillBtn, { marginTop: 24 }]}
                                activeOpacity={0.85}
                                onPress={() => setMissionStatus('farm_completed')}
                            >
                                <Text style={styles.bluePillBtnText}>{t('Complete Farm {{index}}', { index: 1 })}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {renderCustomerDetailsReadonly()}
                        {renderFleetManager()}
                        {renderDroneDetails()}
                        {renderMissionDetails()}
                        {renderWeather()}
                        <View style={styles.spacer} />
                        {renderRestrictions()}
                        {renderMissionOperations(false)}
                        {renderFinancialsAndCancel()}
                        <SupportCard onNavigate={onNavigate} />
                    </>
                )}

                {missionStatus === 'farm_completed' && (
                    <>
                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>{t('Next Steps:')}</Text>
                            <Text style={styles.sectionBodyText}>
                                {t('Start Flying the Drone & complete the Mission')}
                            </Text>
                            <TrackingMap
                                customerLocation={customerLatLng}
                                pilotLocation={pilotLocation}
                                customerAddress={(mission as any)?.address || t('Service Location')}
                                pilotName={t('You')}
                                style={{}}
                            />
                            <Text style={styles.mapBelowText}>
                                {t('Mission Should complete in ')}<Text style={styles.mapBelowTextDark}>{mission?.estimatedServiceTime || t('Not available')}</Text>
                            </Text>

                            <TouchableOpacity style={styles.chatBtn} activeOpacity={0.85} onPress={openChat}>
                                <Text style={styles.chatBtnText}>{t('Chat with Customer')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addFarmBtn} activeOpacity={0.8}>
                                <View style={styles.addFarmIconCircle}>
                                    <Text style={styles.addFarmIconText}>+</Text>
                                </View>
                                <Text style={styles.addFarmBtnText}>{t('Add Farm')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {renderCustomerDetailsReadonly()}
                        {renderFleetManager()}
                        {renderDroneDetails()}
                        {renderMissionDetails()}
                        {renderWeather()}
                        <View style={styles.spacer} />
                        {renderRestrictions()}
                        {renderMissionOperations(false)}
                        {renderFinancialsAndCancel()}

                        <SupportCard onNavigate={onNavigate} />
                    </>
                )}

                {missionStatus === 'completed' && (
                    <>
                        {(returnCode || (mission as any)?.handoverReturnCode) && (
                            <View style={styles.flatSection}>
                                <View style={styles.returnCodeCard}>
                                    <Text style={styles.returnCodeTitle}>{t('Drone Return Code')}</Text>
                                    <Text style={styles.returnCodeValue}>{returnCode || (mission as any)?.handoverReturnCode}</Text>
                                    <Text style={styles.returnCodeHint}>
                                        {t('Share this code with your fleet manager when handing back the drone. The service completes after they enter it.')}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <View style={styles.flatSection}>
                            <Text style={styles.sectionHeaderDark}>
                                {t('Mission Status: ')}<Text style={styles.statusCompletedText}>{t('Mission Completed')}</Text>
                            </Text>
                            <TrackingMap
                                customerLocation={customerLatLng}
                                pilotLocation={pilotLocation}
                                customerAddress={(mission as any)?.address || t('Service Location')}
                                pilotName={t('You')}
                                style={{}}
                            />
                            <Text style={styles.mapBelowText}>
                                {t('Mission completed in {{time}}', { time: mission?.estimatedServiceTime || t('Not available') })}
                            </Text>
                        </View>
                        <View style={styles.divider} />

                        {renderFinancialsAndCancel()}
                        <View style={styles.divider} />

                        {renderCustomerDetailsReadonly()}
                        {renderFleetManager()}
                        {renderDroneDetails()}
                        {renderMissionDetails()}

                        <View style={styles.flatSection}>
                            <TouchableOpacity style={styles.chatBtn} activeOpacity={0.85} onPress={openChat}>
                                <Text style={styles.chatBtnText}>{t('Chat with Customer')}</Text>
                            </TouchableOpacity>
                        </View>

                        {renderMissionOperations(true)}

                        <View style={styles.flatSection}>
                            <TouchableOpacity style={styles.complaintBtn} activeOpacity={0.8}>
                                <Text style={styles.complaintBtnText}>{t('Raise a Complaint')}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 60, paddingTop: 10 },
    spacer: { height: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16, justifyContent: 'center' },
    backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
    pageTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    flatSection: { paddingHorizontal: 20 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20, marginHorizontal: 20 },
    rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionHeaderDark: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', marginBottom: 12 },
    sectionBodyText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', lineHeight: 24, marginBottom: 20 },
    statusCompletedText: { color: '#188A4E', fontFamily: 'Roboto-Medium', fontWeight: '500' },
    dataBlock: { marginBottom: 16 },
    dataLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', marginBottom: 4 },
    dataValue: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    underlineText: { textDecorationLine: 'underline' },
    bluePillBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    bluePillBtnText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    bluePillBtnDisabled: { backgroundColor: '#CBD5E1' },
    returnCodeCard: { backgroundColor: '#E7F4EC', borderWidth: 1, borderColor: '#0B3A2C', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 8 },
    returnCodeTitle: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#0B3A2C', marginBottom: 8 },
    returnCodeValue: { fontSize: 36, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#1E293B', letterSpacing: 8, marginBottom: 8 },
    returnCodeHint: { fontSize: 14, fontFamily: 'Roboto-Regular', color: '#475569', textAlign: 'center', lineHeight: 20 },
    addFarmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, borderWidth: 1.5, borderColor: '#0B3A2C', marginTop: 24 },
    addFarmBtnText: { color: '#0B3A2C', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', marginLeft: 8 },
    addFarmIconCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#0B3A2C', alignItems: 'center', justifyContent: 'center' },
    addFarmIconText: { color: '#0B3A2C', fontSize: 16, fontWeight: '500', marginTop: -2 },
    completeMissionBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    completeMissionBtnText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    confirmCashBtn: { backgroundColor: '#188A4E', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    confirmCashBtnText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    paymentPaidText: { color: '#188A4E' },
    complaintBtn: { borderWidth: 1.5, borderColor: '#64748B', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    complaintBtnText: { color: '#475569', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    phonePillBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' },
    mapImage: { width: '100%', height: 220, borderRadius: 16, marginTop: 16 },
    mapBelowText: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', marginTop: 12 },
    mapBelowTextDark: { color: '#1E293B', fontFamily: 'Roboto-Medium', fontWeight: '500' },
    mapBelowTextGreen: { color: '#188A4E', fontFamily: 'Roboto-Medium', fontWeight: '500' },
    inputLabel: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#64748B', marginBottom: 8 },
    inputBox: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, justifyContent: 'center', marginBottom: 16 },
    inputBoxWithIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 16, height: 50, marginBottom: 16 },
    inputText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1E293B', height: '100%', width: '100%' },
    flexInput: { flex: 1, fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#1E293B', height: '100%' },
    redAsterisk: { color: '#C53030' },
    startFlyingBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    startFlyingBtnDisabled: { backgroundColor: '#CBD5E1' },
    startFlyingBtnText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    startFlyingBtnTextDisabled: { color: '#FFFFFF' },
    capturedFarmImage: { width: '100%', height: 180, borderRadius: 20, marginTop: 8 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkboxOutline: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#CBD5E1', marginRight: 12 },
    checkboxFilled: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#0B3A2C', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    checkMarkWhiteSmall: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
    checkboxText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', flex: 1 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    bulletPoint: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', marginRight: 8, marginTop: -2 },
    bulletText: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', flex: 1 },
    cardBordered: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    weatherHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    weatherCardTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', lineHeight: 26 },
    safeToFlyPill: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#188A4E', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
    safeToFlyText: { color: '#047857', fontSize: 14, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    cardDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16, width: '100%' },
    weatherMainStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    weatherLeftCol: { alignItems: 'flex-start' },
    locationPinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    weatherLocationText: { fontSize: 14, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', marginLeft: 6 },
    giantTempText: { fontSize: 56, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', letterSpacing: -2 },
    weatherCenterCol: { alignItems: 'center' },
    weatherConditionText: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', marginTop: 4 },
    weatherRightCol: { justifyContent: 'center' },
    hiLoText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', marginBottom: 4 },
    weatherBoxesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    weatherInfoBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, alignItems: 'center', marginHorizontal: 4 },
    weatherBoxIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    weatherBoxLabel: { fontSize: 12, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', marginLeft: 6 },
    weatherBoxValue: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    weatherSafeTextCenter: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', textAlign: 'center', marginBottom: 20 },
    radarContainer: { alignItems: 'center', marginBottom: 20 },
    lastCheckedText: { fontSize: 14, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', textAlign: 'center' },
    shieldTitleRow: { flexDirection: 'row', alignItems: 'center' },
    shieldMock: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    shieldMockCheck: { fontSize: 12, color: '#475569', fontWeight: '500' },
    restrictionsTitle: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    restrictionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#188A4E', marginRight: 12 },
    restrictionLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', flex: 1 },
    restrictionValue: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B', textAlign: 'right' },
    safeGreenBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 20, borderWidth: 1.5, borderColor: '#188A4E', padding: 20, marginTop: 10 },
    greenCheckCircleBig: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#188A4E', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    greenCheckWhiteText: { color: '#FFFFFF', fontSize: 18, fontWeight: '500' },
    safeGreenBoxTexts: { flex: 1 },
    safeGreenBoxTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#064E3B', marginBottom: 4 },
    safeGreenBoxSub: { fontSize: 15, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#047857' },
    locationBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    locationBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    chatBtn: { backgroundColor: '#E7F4EC', borderRadius: 100, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    chatBtnText: { color: '#0B3A2C', fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    cancellationPill: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 100, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
    cancellationText: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    cancellationZero: { color: '#188A4E' },
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    financialLabel: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B' },
    financialValue: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    dashedDivider: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 1, marginVertical: 16 },
    totalTextLabel: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    totalTextValue: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    paymentPendingText: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#B91C1C', marginBottom: 32 },
    cancelMissionBtn: { borderWidth: 1.5, borderColor: '#C53030', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    cancelMissionBtnText: { color: '#C53030', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, fontFamily: 'Roboto-Regular', color: '#64748B' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    errorText: { fontSize: 16, fontFamily: 'Roboto-Regular', color: '#C53030', textAlign: 'center' },
});

export default ActiveMissionDetailsScreen;
