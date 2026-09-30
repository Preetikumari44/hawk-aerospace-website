import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

// Displays the app logo and title
const AuthHeader = () => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/droneicon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>
        {t('Hawk Aerosystem')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12, // Automatically spaces logo and title
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    ...TYPOGRAPHY.headlineMediumEmphasized, 
    color: COLORS.white,
  },
});

export default AuthHeader;