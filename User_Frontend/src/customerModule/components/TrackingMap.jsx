import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView from '../../common/maps/MapView';
import { mapsApi } from '../../utils/api';
import { decodePolyline } from '../../utils/polyline';
import { useLanguage } from '../../i18n';

const TrackingMap = ({
  customerLocation,
  pilotLocation,
  customerAddress,
  pilotName,
  style = {},
}) => {
  const { t, locale } = useLanguage();
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (customerLocation && pilotLocation) {
      fetchRoute();
    }
  }, [customerLocation?.lat, customerLocation?.lng, pilotLocation?.lat, pilotLocation?.lng]);

  const fallbackCoords = () => [
    { latitude: pilotLocation.lat, longitude: pilotLocation.lng },
    { latitude: customerLocation.lat, longitude: customerLocation.lng },
  ];

  // Decode the Google-encoded polyline. On web we prefer the google.maps
  // decoder when available; otherwise fall back to our own JS decoder so it
  // also works on native.
  const decodeRoute = (encoded) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.google?.maps?.geometry?.encoding?.decodePath) {
        return window.google.maps.geometry.encoding.decodePath(encoded).map((p) => ({
          latitude: p.lat(),
          longitude: p.lng(),
        }));
      }
      const points = decodePolyline(encoded);
      return points.length > 1 ? points : null;
    } catch (err) {
      console.warn('Polyline decode failed, using straight line', err);
      return null;
    }
  };

  const fetchRoute = async () => {
    try {
      const origin = { latitude: pilotLocation.lat, longitude: pilotLocation.lng };
      const destination = { latitude: customerLocation.lat, longitude: customerLocation.lng };

      const [routeResult, distanceResult] = await Promise.allSettled([
        mapsApi.getRoute(origin, destination),
        mapsApi.getDistance(origin, destination),
      ]);

      // apiRequest unwraps { success, data } so the payload is the route object.
      const routeData = routeResult.status === 'fulfilled' ? (routeResult.value?.data ?? routeResult.value) : null;
      const encodedPolyline = routeData?.polyline;

      if (encodedPolyline) {
        const decoded = decodeRoute(encodedPolyline);
        if (decoded && decoded.length > 1) {
          setRouteCoords(decoded);
        } else {
          setRouteCoords(fallbackCoords());
        }
      } else {
        setRouteCoords(fallbackCoords());
      }

      const distanceData = distanceResult.status === 'fulfilled' ? (distanceResult.value?.data ?? distanceResult.value) : null;
      if (distanceData) {
        setDistance(distanceData.distance);
        setDuration(distanceData.duration);
      }
    } catch (err) {
      console.error('Route fetch failed', err);
      setRouteCoords(fallbackCoords());
    }
  };

  const markers = [];

  if (customerLocation) {
    markers.push({
      latitude: customerLocation.lat,
      longitude: customerLocation.lng,
      title: customerAddress || t('Customer Location'),
      description: t('Destination'),
      pinColor: '#10B981',
    });
  }

  if (pilotLocation) {
    markers.push({
      latitude: pilotLocation.lat,
      longitude: pilotLocation.lng,
      title: pilotName || t('Pilot Location'),
      description: distance
        ? t('{{distance}} km away', { distance: distance.toFixed(1) })
        : t('Current position'),
      pinColor: '#4F46E5',
    });
  }

  const region = (() => {
    const points = [];
    if (customerLocation) points.push([customerLocation.lat, customerLocation.lng]);
    if (pilotLocation) points.push([pilotLocation.lat, pilotLocation.lng]);
    if (points.length === 0) return undefined;

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max(maxLat - minLat, 0.02) * 1.6;
    const lngDelta = Math.max(maxLng - minLng, 0.02) * 1.6;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  })();

  return (
    <View style={[styles.container, style]}>
      {duration && (
        <View style={styles.etaBar}>
          <Text style={styles.etaLabel}>{t('ETA')}</Text>
          <Text style={styles.etaValue}>
            {t('~{{duration}} min', { duration: Math.round(duration) })}
          </Text>
          {distance && (
            <Text style={styles.distanceValue}>
              ({t('{{distance}} km', { distance: distance.toFixed(1) })})
            </Text>
          )}
        </View>
      )}

      <MapView
        region={region}
        markers={markers}
        polylines={
          routeCoords.length > 1
            ? [
                {
                  coordinates: routeCoords,
                  strokeColor: '#4F46E5',
                  strokeWidth: 3,
                },
              ]
            : []
        }
        style={styles.map}
      />

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
          <Text style={styles.legendText}>
            {pilotName || t('Pilot')} ({t('Live')})
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>
            {customerAddress || t('Customer')} ({t('Destination')})
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  map: {
    width: '100%',
    height: 250,
  },
  etaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  etaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  etaValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  distanceValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
  },
});

export default TrackingMap;
