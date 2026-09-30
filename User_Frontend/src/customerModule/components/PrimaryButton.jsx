import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';

// PrimaryButton component that provides a customizable button with title, onPress handler, background color, text color, and optional border
const PrimaryButton = ({
  title,
  onPress,
  backgroundColor = '#FFFFFF',
  textColor = '#5060D3',
  borderWidth = 0,
  borderColor = 'transparent',
}) => {
  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor,
          borderWidth,
          borderColor,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default PrimaryButton;