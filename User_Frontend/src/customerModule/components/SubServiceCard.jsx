import React from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import COLORS from '../constants/colors';

const SubServiceCard = ({ title, image, selected, onPress }) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={selected ? styles.cardSelected : styles.cardNormal}>
        <Image source={image} style={styles.image} resizeMode="contain" />
      </View>
      <Text style={selected ? styles.textSelected : styles.textNormal}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    //width: 105, 
    marginRight: 16,
    alignItems: 'center',
  },
  cardNormal: {
    //width: 105,
    //height: 105,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 18, 
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  cardSelected: {
    //width: 105,
    //height: 105,
    borderWidth: 1.7, // Thicker border for selection
    borderColor: COLORS.primary,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  image: {
    width: 40,
    height: 40,
  },
  textNormal: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '600',
  },
  textSelected: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700',
  },
});

export default SubServiceCard;