import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

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

  useEffect(() => {
    if (region && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta || 0.01,
        longitudeDelta: region.longitudeDelta || 0.01,
      }, 500);
    }
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta]);

  const handlePress = (e) => {
    if (onPress) {
      onPress({
        nativeEvent: {
          coordinate: e.nativeEvent.coordinate,
        },
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: region?.latitude || 20.5937,
          longitude: region?.longitude || 78.9629,
          latitudeDelta: region?.latitudeDelta || 0.01,
          longitudeDelta: region?.longitudeDelta || 0.01,
        }}
        onPress={handlePress}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor || 'red'}
            onPress={() => onMarkerPress && onMarkerPress(index)}
          />
        ))}
        {polylines.map((polyline, index) => (
          <Polyline
            key={index}
            coordinates={polyline.coordinates}
            strokeColor={polyline.strokeColor || '#4F46E5'}
            strokeWidth={polyline.strokeWidth || 3}
          />
        ))}
      </RNMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});

export default MapView;
