import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Animated,
  Easing,
  Image,
} from 'react-native';

// Clean Web-Safe Imports
import { getCurrentLocationDemo } from '../../utils/mockLocation';
import { Storage } from '../../utils/storage';

import ScreenContainer from '../components/ScreenContainer';
import { useLanguage } from '../../i18n';

const LocationAccessScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  // Animated values driving the alternate pulse:
  // pulse goes 0 -> 1 -> 0 continuously.
  // Logo scale shrinks while circles grow, and vice versa.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  const circleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const handleLocationPermission = async () => {
    try {
      // Skip Android native permissions on Desktop Web Browser / iOS
      if (Platform.OS === 'web' || Platform.OS === 'ios') {
        getCurrentLocation();
        return;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        // Continue forward if permission is denied
        onNavigate('LanguageSelectionScreen');
      }
    } catch (error) {
      console.log('Permission Error:', error);
      // Continue forward if permission throws error
      onNavigate('LanguageSelectionScreen');
    }
  };

  const getCurrentLocation = () => {
    getCurrentLocationDemo(
      async (position) => {
        console.log('Mocked Location Captured:', position);

        // Optionally save mock coordinates using web-safe Storage utility
        if (position?.coords) {
          await Storage.setItem('latitude', position.coords.latitude.toString());
          await Storage.setItem('longitude', position.coords.longitude.toString());
        }

        onNavigate('LanguageSelectionScreen');
      },
      error => {
        console.log('Location Fetch Error: ', error);
        onNavigate('LanguageSelectionScreen');
      },
    );
  };

  return (
    <ScreenContainer backgroundColor="#3357A6">
      <View style={styles.container}>
        {/* Background decorative circles */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bigCircleTopRight,
            { transform: [{ scale: circleScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bigCircleBottomLeft,
            { transform: [{ scale: circleScale }] },
          ]}
        />

        {/* Small scattered dots */}
        <View style={[styles.dot, { top: 262, left: 16, width: 10, height: 10 }]} />
        <View style={[styles.dot, { top: 370, left: 128, width: 6, height: 6, opacity: 0.6 }]} />
        <View style={[styles.dot, { top: 492, left: 248, width: 5, height: 5, opacity: 0.5 }]} />
        <View style={[styles.dot, { top: 628, left: 386, width: 10, height: 10, opacity: 0.8 }]} />
        <View style={[styles.dot, { top: 742, left: 510, width: 6, height: 6, opacity: 0.55 }]} />
        <View style={[styles.dot, { top: 968, left: 745, width: 6, height: 6, opacity: 0.55 }]} />
        <View style={[styles.dot, { top: 1103, left: 863, width: 10, height: 10, opacity: 0.6 }]} />
        <View style={[styles.dot, { top: 1225, left: 985, width: 6, height: 6, opacity: 0.55 }]} />
        <View style={[styles.dot, { top: 1345, left: 1103, width: 4, height: 4, opacity: 0.5 }]} />

        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image
              source={require('../../assets/bg-logo.png')}
              //style={styles.weatherImage}
              //resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.textGroup}>
            <Text style={styles.title}>{t('Booking Drones Made Easy')}</Text>
            <Text style={styles.subtitle}>{t('Your drone adventure starts here')}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLocationPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{t('Get Started')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3357A6',
    overflow: 'hidden',
  },
  bigCircleTopRight: {
    position: 'absolute',
    top: -120,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bigCircleBottomLeft: {
    position: 'absolute',
    bottom: -180,
    left: -160,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dot: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  textGroup: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 14,
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  button: {
    marginTop: 56,
    backgroundColor: '#EDEBF7',
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3357A6',
  },
});

export default LocationAccessScreen;