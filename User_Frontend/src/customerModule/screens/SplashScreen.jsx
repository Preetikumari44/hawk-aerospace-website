import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
} from 'react-native';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

// SplashScreen component that displays the app logo and title for 2 seconds before navigating to the LocationAccess screen
const SplashScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  // Navigate to the LocationAccess screen after a 2-second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onNavigate('LocationAccessScreen');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onNavigate]);
  
  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={COLORS.primary}
        barStyle="light-content"
      />

      <Image
        source={require('../assets/images/droneicon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>
        {t('Aerosystem')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16, // Handles spacing naturally between logo and title
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    ...TYPOGRAPHY.headlineMediumEmphasized, // Automatically applies 28px Roboto-Medium
    color: COLORS.white,
  },
});

export default SplashScreen;