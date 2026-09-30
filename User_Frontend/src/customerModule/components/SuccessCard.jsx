import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import GreenCheckMarkIcon from '../assets/Icons_V02/Icons/GreenCheckMarkIcon.svg';

const SuccessCard = ({ title, description }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {/* <MaterialIcons name="check" size={24} color="#FFFFFF" /> */}
        <GreenCheckMarkIcon width={24} height={24} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#ECFDF5', // Very light green background
    borderWidth: 1.5,
    borderColor: '#10B981', // Main green border
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46', // Dark green text
  },
  description: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    marginTop: 2,
  },
});

export default SuccessCard;