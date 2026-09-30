import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

import COLORS from '../constants/colors';

const ServiceCard = ({ title, image, selected, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.container}>

      {/* Box containing only the image */}
      <View style={[styles.imageBox, selected && styles.imageBoxSelected]}>
        <Image
          source={image}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Text sits outside the box */}
      <Text style={[styles.title, selected && styles.titleSelected]}>
        {title}
      </Text>

    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 12,
  },

  imageBox: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  imageBoxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  image: {
    width: '75%',
    height: '75%',
  },

  title: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2F3542',
  },

  titleSelected: {
    color: COLORS.primary,
  },
});

export default ServiceCard;