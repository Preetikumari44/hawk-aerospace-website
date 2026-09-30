import React from 'react';
import { View, StyleSheet } from 'react-native';

const DashedDivider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  divider: {
    height: 0,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginVertical: 0,
  },
});

export default DashedDivider;
