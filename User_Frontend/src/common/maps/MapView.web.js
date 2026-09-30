import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

let scriptPromise = null;

const loadGoogleMapsScript = () => {
  if (window.google && window.google.maps) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

const MapView = ({
  region,
  markers = [],
  polylines = [],
  onPress,
  onMarkerPress,
  style,
  scrollEnabled = true,
  zoomEnabled = true,
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setLoaded(true))
      .catch((err) => console.error('Map load error:', err));
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    if (mapInstanceRef.current) return;

    const center = region
      ? { lat: region.latitude, lng: region.longitude }
      : { lat: 20.5937, lng: 78.9629 };

    const initialZoom = region?.latitudeDelta
      ? Math.max(12, Math.min(18, Math.round(14 - Math.log2(Math.max(region.latitudeDelta, 0.001) / 0.01))))
      : (region ? 15 : 5);

    mapInstanceRef.current = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: initialZoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      gestureHandling: scrollEnabled ? 'auto' : 'none',
    });

    if (onPress) {
      mapInstanceRef.current.addListener('click', (e) => {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: e.latLng.lat(),
              longitude: e.latLng.lng(),
            },
          },
        });
      });
    }

    if (mapRef.current) {
      mapRef.current = mapInstanceRef.current;
    }
  }, [loaded]);

  // Update map center and zoom when region prop changes
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !region) return;
    const center = { lat: region.latitude, lng: region.longitude };
    mapInstanceRef.current.setCenter(center);
    if (region.latitudeDelta) {
      const targetZoom = Math.max(12, Math.min(18, Math.round(14 - Math.log2(Math.max(region.latitudeDelta, 0.001) / 0.01))));
      mapInstanceRef.current.setZoom(targetZoom);
    } else {
      mapInstanceRef.current.setZoom(15);
    }
  }, [loaded, region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markers.forEach((marker, index) => {
      const m = new window.google.maps.Marker({
        position: { lat: marker.latitude, lng: marker.longitude },
        map: mapInstanceRef.current,
        title: marker.title,
        label: marker.title ? undefined : undefined,
      });

      if (marker.title) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>${marker.title}</strong>${marker.description ? `<br/>${marker.description}` : ''}</div>`,
        });
        m.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, m);
          if (onMarkerPress) onMarkerPress(index);
        });
      }

      markersRef.current.push(m);
    });
  }, [loaded, markers]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (polylines.length > 0 && polylines[0].coordinates.length > 1) {
      const path = polylines[0].coordinates.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
      }));

      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: polylines[0].strokeColor || '#4F46E5',
        strokeOpacity: 1.0,
        strokeWeight: polylines[0].strokeWidth || 3,
        map: mapInstanceRef.current,
      });
    }
  }, [loaded, polylines]);

  return (
    <View style={[styles.container, style]}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: 16 }}
      />
      {!loaded && (
        <View style={styles.loadingOverlay}>
          <div style={styles.loadingText}>Loading map...</div>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default MapView;
