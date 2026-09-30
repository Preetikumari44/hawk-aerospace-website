import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';

const RoleCard = ({ image, title, description, onPress }) => {
  return (
    <View style={styles.container}>
      
      {/* <View style={styles.card}> */}
      <Pressable style={styles.card} onPress={onPress}>
        <Image
          source={image}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {title}
          </Text>
        </View>
      {/* </View> */}
      </Pressable>

      {/* Nesting Text tags allows us to make just the title bold! */}
      <Text style={styles.description}>
        <Text style={styles.boldText}>{title} </Text>
        {description}
      </Text>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    marginRight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, 
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 85, 
  },
  titleContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  description: {
    fontSize: 13, 
    color: '#6B7280',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#374151',
  },
});

export default RoleCard;