import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ region, markers, onPress, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        {markers?.[0]?.title || 'Map'}
        {region ? ` (${region.latitude?.toFixed(4)}, ${region.longitude?.toFixed(4)})` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default MapView;
