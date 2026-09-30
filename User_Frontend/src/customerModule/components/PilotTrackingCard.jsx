import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TrackingMap from './TrackingMap';

const PilotTrackingCard = ({
  title,
  description,
  customerLocation,
  pilotLocation,
  customerAddress,
  pilotName,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {(customerLocation || pilotLocation) ? (
        <TrackingMap
          customerLocation={customerLocation}
          pilotLocation={pilotLocation}
          customerAddress={customerAddress}
          pilotName={pilotName}
          style={styles.map}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Location data will appear when the pilot starts navigating
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  map: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholder: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default PilotTrackingCard;
