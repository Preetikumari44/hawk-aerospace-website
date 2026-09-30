import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  // BackHandler, // 🔥 App close karne ke liye import kiya
} from 'react-native';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import BookingInfoCard from '../components/BookingInfoCard';
import NextStepCard from '../components/NextStepCard';

import COLORS from '../constants/colors';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const BookingConfirmationScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  return (
    // 🔥 Top notch ka color gradient ke top color jaisa rakha hai
    <ScreenContainer backgroundColor="#3730A3"> 
      <CrossPlatformGradient
        colors={['#3730A3', '#1E1B6E']}
        style={styles.gradientBackground}
      >
        {/* 🔥 Confetti Background Image */}
        <Image
          source={require('../assets/Icons/ConfettiIcon.png')}
          style={styles.confetti}
          resizeMode="cover"
        />

        {/* Scrollable so all content stays reachable above the fixed TabBar */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.mainContent, { paddingBottom: tabBarPadding }]}
          showsVerticalScrollIndicator={false}
        >
          
          {/* --- HEADER SECTION --- */}
          <View style={styles.headerSection}>
            <Image
              source={require('../assets/images/congratulations.png')}
              style={styles.successIcon}
              resizeMode="contain"
            />
            <Text style={styles.heading}>{t('Congratulations!')}</Text>
            <Text style={styles.subHeading}>{t('Your Booking is Confirmed')}</Text>
          </View>

          {/* --- CARDS SECTION --- */}
          <View style={styles.cardsSection}>
            <BookingInfoCard booking={routeParams?.booking} />
            <NextStepCard booking={routeParams?.booking} />
          </View>

          {/* --- FOOTER SECTION --- */}
          <View style={styles.footerSection}>
            <Text style={styles.noteText}>
              {t('Confirmation sent to your registered number')}
            </Text>

            <View style={styles.buttonWrapper}>
              <PrimaryButton
                title={t('View Booking Details')}
                backgroundColor="#FFFFFF"
                textColor="#5060D3" // Text color ko background se match kiya
                onPress={() => onNavigate('BookingDetailsScreen', { bookingId: routeParams?.bookingId || routeParams?.booking?.id })}
              />
            </View>

            <View style={styles.outlineButtonWrapper}>
              <PrimaryButton
                title={t('Back to Home')}
                backgroundColor="transparent"
                textColor="#FFFFFF"
                // 🔥 Button click par app close ho jayegi
                onPress={() => onNavigate('Home')} 
              />
            </View>
          </View>

        </ScrollView>       
      </CrossPlatformGradient>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },  confetti: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6, // 🔥 Thoda transparent rakha taaki text clear dikhe
  },
  scroll: {
    flex: 1,
  },
  mainContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 24,
    justifyContent: 'flex-start',
  },

  // 1. Header Group
  headerSection: {
    alignItems: 'center', 
  },
  successIcon: {
    width: 70, // 🔥 Sizes thodi adjust ki hain taaki bina scroll sab fit ho
    height: 70,
    marginBottom: 12, 
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24, 
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subHeading: {
    color: '#D1D5DB', 
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  // 2. Cards Group
  cardsSection: {
    justifyContent: 'center', 
    gap: 12, // 🔥 Cards ke beech ka gap thoda kam kiya
  },

  // 3. Footer Group
  footerSection: {
    alignItems: 'stretch',
  },
  noteText: {
    color: '#D1D5DB',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16, 
  },
  buttonWrapper: {
    marginBottom: 14, 
  },
  outlineButtonWrapper: {
    borderRadius: 25, 
    borderWidth: 1.5, 
    borderColor: '#FFFFFF',
    overflow: 'hidden', 
  },
});

export default BookingConfirmationScreen;
