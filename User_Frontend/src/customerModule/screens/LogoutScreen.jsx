import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { authApi } from '../../utils/api';
import { teardownPushNotifications } from '../../utils/notificationService';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';

const LogoutScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const handleLogout = useCallback(async () => {
    try {
      await teardownPushNotifications();
      await authApi.logout();
    } catch (e) {
      console.error('Logout API error', e);
    }
    if (onNavigate) onNavigate('MobileNumberScreen');
  }, [onNavigate]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={[styles.container, { paddingBottom: tabBarPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate && onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Logout')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('Are you Sure you want to log out of your Account?')}</Text>
        <Text style={styles.subtitle}>
          {t('Your data will be safe and you can access it after logging in.')}
        </Text>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>{t('Log Out')}</Text>
        </Pressable>
      </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  heading: {
    marginLeft: 16,
    fontSize: 22,
    fontWeight: '500',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#B91C1C', // Deep red matching  
    height: 56,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LogoutScreen;