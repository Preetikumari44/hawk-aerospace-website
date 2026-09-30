import React from 'react';
import {
  TextInput,
  StyleSheet,
} from 'react-native';

// CustomTextInput component that provides a styled text input field
const CustomTextInput = props => {
  return (
    <TextInput
      style={styles.input}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
});

export default CustomTextInput;