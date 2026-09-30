import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Alert, Platform } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import CheckHeader from '../components/CheckHeader';
import InfoRow from '../components/InfoRow';
import SuccessCard from '../components/SuccessCard';
import { aggregatorApi, customerApi } from '../../utils/api';
import { findServiceEntry } from '../../utils/servicePricing';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const SLOT_HOUR_MAP = {
  Morning: 8,
  Evening: 14,
  Night: 19,
};

const SPRAYING_SUBTYPE_MAP = {
  'Fertilizer Spraying': 'fertilizer_spraying',
  'Pesticides Spraying': 'pesticide_spraying',
  'Insecticides Spraying': 'insecticide_spraying',
  'Herbicides Spraying': 'herbicide_spraying',
  'Fungicides Spraying': 'fungicide_spraying',
  'Growth Regulator Spraying': 'growth_regulator_spraying',
  'Micronutrient Spraying': 'micronutrient_spraying',
  'Organic Spraying': 'organic_spraying',
};

const normalizeSprayingSubType = (selectedSubService) => {
  if (!selectedSubService) {
    return 'fertilizer_spraying';
  }

  return (
    SPRAYING_SUBTYPE_MAP[selectedSubService] ||
    String(selectedSubService)
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') ||
    'fertilizer_spraying'
  );
};

const buildScheduledDate = (routeParams) => {
  const selectedDate = routeParams?.scheduledDate;
  const selectedSlot = routeParams?.selectedSlots?.[0] || 'Morning';
  const hour = SLOT_HOUR_MAP[selectedSlot] ?? SLOT_HOUR_MAP.Morning;

  if (typeof selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    const date = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00:00`);

    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return date.toISOString();
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(hour, 0, 0, 0);
    return fallback.toISOString();
  }

  if (selectedDate) {
    const parsed = new Date(selectedDate);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hour, 0, 0, 0);
  return fallback.toISOString();
};

const buildBookingPayload = (routeParams) => {
  const serviceType = routeParams?.serviceType || 'spraying';
  const serviceDetails = {};
  const normalizedScheduledDate = buildScheduledDate(routeParams);
  const specialInstructions = routeParams?.instructions?.trim();

  if (specialInstructions) {
    serviceDetails.specialInstructions = specialInstructions;
  }

  if (serviceType === 'spraying') {
    serviceDetails.sprayingSubType = normalizeSprayingSubType(routeParams?.subService);
    if (serviceDetails.sprayingSubType === 'precision_spraying') {
      serviceDetails.unit = 'per_acre';
      serviceDetails.quantity = Number(routeParams?.areaValue || 1);
    }
  }

  if (serviceType === 'monitoring') {
    serviceDetails.monitoringSubType = routeParams?.monitoringSubType || 'crop_health_monitoring';
    serviceDetails.unit = routeParams?.unit || 'per_acre';
    serviceDetails.quantity = Number(routeParams?.quantity ?? routeParams?.areaValue ?? 1);
  }

  if (serviceType === 'mapping') {
    const mappingEntry = findServiceEntry('mapping', routeParams?.mappingType);
    serviceDetails.mappingType =
      mappingEntry?.label || routeParams?.mappingType || 'Basic Aerial Mapping';
    serviceDetails.unit = 'per_acre';
    serviceDetails.quantity = Number(routeParams?.areaValue ?? 1);
  }

  if (serviceType === 'surveillance') {
    const surveillanceEntry = findServiceEntry(
      'surveillance',
      routeParams?.surveillanceKey || routeParams?.subService,
    );
    if (surveillanceEntry) {
      serviceDetails.surveillanceType = surveillanceEntry.label;
      serviceDetails.unit = surveillanceEntry.defaultUnit || 'per_visit';
      serviceDetails.quantity = Number(routeParams?.surveillanceQuantity || 1);
    }
  }

  if (serviceType === 'videography') {
    const videoEntry = findServiceEntry('videography', routeParams?.eventType || routeParams?.subService);
    if (videoEntry) {
      const eventLabel = videoEntry.label;
      serviceDetails.videographyType = eventLabel;
      serviceDetails.eventType = eventLabel;
      serviceDetails.unit = videoEntry.defaultUnit || 'min';
      serviceDetails.quantity = Number(
        routeParams?.videographyQuantity || (videoEntry.defaultUnit === 'min' ? 30 : 1),
      );
    }
  }

  const payload = {
    address: routeParams?.address || 'Selected booking location',
    detailedAddress: routeParams?.detailedAddress || undefined,
    areaValue: Number(routeParams?.areaValue || 1),
    areaUnit: routeParams?.areaUnit || 'acre',
    cropType: String(routeParams?.cropType || 'other').trim() || 'other',
    serviceType,
    serviceDetails: Object.keys(serviceDetails).length ? serviceDetails : undefined,
    location: routeParams?.location || { lat: 28.4595, lng: 77.0266 },
    scheduledDate: normalizedScheduledDate,
  };

  if (serviceType === 'delivery') {
    return {
      ...payload,
      dropoffLocation: routeParams?.dropoffLocation || routeParams?.location || { lat: 28.4595, lng: 77.0266 },
      serviceDetails: {
        ...serviceDetails,
        contents: routeParams?.contents || routeParams?.subService || 'Agricultural goods',
        weightKg: Number(routeParams?.weightKg || 1),
      },
    };
  }

  return payload;
};

const normalizeDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const findRecoveredBooking = (response, payload) => {
  const items = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : [];

  const payloadDateKey = normalizeDateKey(payload.scheduledDate);

  return items.find((booking) => {
    const areaValue = booking?.area?.value ?? booking?.areaValue;
    const areaUnit = booking?.area?.unit ?? booking?.areaUnit;

    return (
      booking?.serviceType === payload.serviceType &&
      normalizeDateKey(booking?.scheduledDate) === payloadDateKey &&
      (booking?.address?.line1 || booking?.address) === payload.address &&
      Number(areaValue) === Number(payload.areaValue) &&
      areaUnit === payload.areaUnit
    );
  });
};

const WeatherForecastCheckScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [isChecking, setIsChecking] = useState(true);
  const [weather, setWeather] = useState(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const hasStartedBookingCreation = useRef(false);

  useEffect(() => {
    const runCheck = async () => {
      try {
        const isAggregatorFlow = !!routeParams?.customerUid;
        const payload = {
          latitude: routeParams?.location?.lat || 28.4595,
          longitude: routeParams?.location?.lng || 77.0266,
          targetDate: buildScheduledDate(routeParams),
        };
        const response = isAggregatorFlow
          ? await aggregatorApi.checkWeather(payload)
          : await customerApi.checkWeather(payload);
        setWeather(response);
      } catch (error) {
        console.error('Weather check failed', error);
      } finally {
        setIsChecking(false);
      }
    };

    runCheck();
  }, [routeParams]);

  useEffect(() => {
    if (!isChecking && !hasStartedBookingCreation.current) {
      hasStartedBookingCreation.current = true;

      const isAggregatorFlow = !!routeParams?.customerUid;

      const createBooking = async () => {
        // If booking was already created & paid via online gateway in PaymentSelectionScreen,
        // we already have booking and bookingId. Simply navigate to BookingConfirmationScreen!
        if (routeParams?.booking && routeParams?.bookingId) {
          onNavigate('BookingConfirmationScreen', {
            ...routeParams,
            booking: routeParams.booking,
            bookingId: routeParams.bookingId,
            weatherResult: weather,
          });
          return;
        }

        const payload = buildBookingPayload(routeParams);

        try {
          setIsCreatingBooking(true);
          const createResponse = isAggregatorFlow
            ? await aggregatorApi.createBooking({ ...payload, customerUid: routeParams.customerUid })
            : await customerApi.createBooking(payload);

          // Aggregator endpoint returns { booking, delegated }; customer endpoint returns the booking directly.
          const booking = createResponse?.booking ?? createResponse;

          if (!booking?.id) {
            throw new Error('Booking was created but no booking id was returned.');
          }

          onNavigate('BookingConfirmationScreen', {
            booking,
            bookingId: booking.id,
            weatherResult: weather,
            ...routeParams,
          });
        } catch (error) {
          console.error('Booking creation failed', error);
          try {
            const recovered = isAggregatorFlow
              ? await aggregatorApi.getBookings({ limit: 10 })
              : await customerApi.getBookings({ limit: 10 });
            const recoveredBooking = findRecoveredBooking(recovered, payload);

            if (recoveredBooking?.id) {
              onNavigate('BookingConfirmationScreen', {
                booking: recoveredBooking,
                bookingId: recoveredBooking.id,
                weatherResult: weather,
                ...routeParams,
              });
              return;
            }
          } catch (recoveryError) {
            console.error('Booking recovery lookup failed', recoveryError);
          } finally {
            hasStartedBookingCreation.current = false;
            setIsCreatingBooking(false);
          }

          const message = error?.message || t('Unable to create booking right now.');
          if (Platform.OS === 'web') {
            window.alert(message);
          } else {
            Alert.alert(t('Booking Failed'), message);
          }
        }
      };

      const timer = setTimeout(createBooking, 1500);
      return () => clearTimeout(timer);
    }
  }, [isChecking, onNavigate, routeParams, weather, t]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={[styles.mainContent, { paddingBottom: tabBarPadding }]}>
        <CheckHeader
          title={t('Checking Weather Forecast')}
          date={routeParams?.scheduledDate || new Date().toISOString()}
          location={routeParams?.address || t('Selected booking location')}
        />

        <View style={styles.radarWrapper}>
          <Image source={require('../assets/images/radar.png')} style={styles.radar} resizeMode="contain" />
        </View>

        {!isChecking && (
          <View style={styles.cardWrapper}>
            <SuccessCard
              title={isCreatingBooking ? t('Creating Booking') : t(weather?.status) || t('Check Complete')}
              description={
                isCreatingBooking
                  ? t('Weather verified. Saving your booking details now.')
                  : t(weather?.summary) || t('Weather forecast check completed')
              }
            />
          </View>
        )}

        <View style={styles.infoContainer}>
          <InfoRow title={t('Temperature')} value={isChecking ? '-' : weather?.temperature || weather?.current?.temperature || '-'} />
          <InfoRow title={t('Climate')} value={isChecking ? '-' : t(weather?.summary) || t(weather?.status) || '-'} />
          <InfoRow title={t('Wind')} value={isChecking ? '-' : weather?.windSpeed || weather?.current?.windSpeed || '-'} />
          <InfoRow title={t('Humidity')} value={isChecking ? '-' : weather?.humidity || weather?.current?.humidity || '-'} />
          <InfoRow title={t('Rain Probability')} value={isChecking ? '-' : weather?.rainProbability || weather?.precipitationProbability || '-'} />
        </View>

        {!isChecking && (
          <View style={styles.weatherWrapper}>
            <Image source={require('../assets/images/weather.png')} style={styles.weatherImage} resizeMode="contain" />
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  mainContent: { flex: 1 },
  radarWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
  radar: { width: 180, height: 180, maxHeight: '100%' },
  cardWrapper: { marginBottom: 12 },
  infoContainer: { marginBottom: 10 },
  weatherWrapper: { height: 70, justifyContent: 'center', alignItems: 'center' },
  weatherImage: { width: 130, height: '100%' },
});

export default WeatherForecastCheckScreen;

