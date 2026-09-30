import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface MapMarker {
  state: string;
  count: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface MapViewProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
}

/**
 * MapView Component
 * 
 * This is a placeholder component for map visualization.
 * To implement a real map, you can use:
 * 
 * For React Native:
 * - react-native-maps: https://github.com/react-native-maps/react-native-maps
 * 
 * For Web:
 * - Google Maps JavaScript API
 * - Mapbox GL JS
 * - Leaflet
 * 
 * Example with react-native-maps:
 * ```tsx
 * import MapView, { Marker } from 'react-native-maps';
 * 
 * <MapView
 *   initialRegion={{
 *     latitude: 20.5937,
 *     longitude: 78.9629,
 *     latitudeDelta: 20,
 *     longitudeDelta: 20,
 *   }}
 * >
 *   {markers.map((marker, index) => 
 *     marker.coordinates && (
 *       <Marker
 *         key={index}
 *         coordinate={marker.coordinates}
 *         title={marker.state}
 *         description={`${marker.count} bookings`}
 *       />
 *     )
 *   )}
 * </MapView>
 * ```
 */
export default function MapView({ markers, onMarkerPress }: MapViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>🗺️ India Map Visualization</Text>
        <Text style={styles.instructionsText}>
          Integrate Google Maps or react-native-maps here
        </Text>
      </View>

      {/* Markers List */}
      <ScrollView style={styles.markersList}>
        {markers.map((marker, index) => (
          <View key={index} style={styles.markerItem}>
            <View style={styles.markerDot} />
            <View style={styles.markerInfo}>
              <Text style={styles.markerTitle}>{marker.state}</Text>
              <Text style={styles.markerDescription}>{marker.count} bookings</Text>
            </View>
            {marker.coordinates && (
              <Text style={styles.markerCoords}>
                📍 {marker.coordinates.latitude.toFixed(2)}, {marker.coordinates.longitude.toFixed(2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  placeholderText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  markersList: {
    flex: 1,
    padding: 16,
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  markerInfo: {
    flex: 1,
  },
  markerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  markerDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  markerCoords: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});
