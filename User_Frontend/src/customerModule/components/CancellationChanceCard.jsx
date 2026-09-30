import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CancellationChanceCard = ({ cancellationChance }) => {
  const chance = cancellationChance ?? 0;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Booking Cancellation Chances: <Text style={styles.percent}>{chance}%</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  percent: {
    color: '#10B981', // Green color
  },
});

export default CancellationChanceCard;