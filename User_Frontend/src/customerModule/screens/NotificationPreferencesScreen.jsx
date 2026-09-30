import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import COLORS from '../constants/colors';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

// Only App (push) + Email channels for now.
// { key: 'smsNotifications', title: 'SMS Notifications', desc: 'Text message updates for important activity' },
// { key: 'whatsappNotifications', title: 'WhatsApp Notifications', desc: 'WhatsApp updates (enable once WhatsApp API is configured)' },
const notificationItems = [
  { key: 'pushNotifications', title: 'Push Notifications', desc: 'App notifications for booking and marketplace updates' },
  { key: 'emailNotifications', title: 'Email Notifications', desc: 'Email notifications for account and transaction updates' },
  { key: 'bookingUpdates', title: 'Booking Status', desc: 'Notifications for every booking status update' },
  { key: 'promotionalMessages', title: 'Promotions/Offers/Rewards', desc: 'Promotional messages and offers' },
  { key: 'weatherAlerts', title: 'Weather Alerts', desc: 'Weather alerts for drone operations' },
  { key: 'priceAlerts', title: 'Price Alerts', desc: 'Pricing and payment notifications' },
  { key: 'missionUpdates', title: 'Mission Updates', desc: 'Pilot and mission progress notifications' },
];

const NotificationPreferencesScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    customerApi
      .getNotificationSettings()
      .then((response) => setSettings(response?.notificationSettings || {}))
      .catch((error) => console.error('Failed to load notification settings', error));
  }, []);

  const toggleSwitch = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      const response = await customerApi.updateNotificationSettings(next);
      setSettings(response?.notificationSettings || next);
    } catch (error) {
      console.error('Failed to update notification settings', error);
    }
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Account')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Your Notification Preferences')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('Backend Notification Settings')}</Text>
          {notificationItems.map((item, index) => (
            <View key={item.key} style={[styles.itemRow, index === notificationItems.length - 1 && styles.lastItem]}>
              <View style={styles.textContainer}>
                <Text style={styles.itemTitle}>{t(item.title)}</Text>
                <Text style={styles.itemDesc}>{t(item.desc)}</Text>
              </View>
              <Switch
                value={!!settings[item.key]}
                onValueChange={() => toggleSwitch(item.key)}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  heading: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '500',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  lastItem: {
    marginBottom: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: 20,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  itemDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default NotificationPreferencesScreen;
