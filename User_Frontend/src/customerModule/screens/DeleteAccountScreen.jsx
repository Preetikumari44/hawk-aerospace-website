import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ScreenContainer from '../components/ScreenContainer';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';

const DeleteAccountScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={[styles.container, { paddingBottom: tabBarPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Delete Account')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('Are you Sure you want to delete your Account?')}</Text>
        <Text style={styles.subtitle}>{t('Sorry to see you go 😢')}</Text>
        <Text style={styles.subtitleDesc}>
          {t('Your data will be deleted and cannot be recovered')}
        </Text>

        <Pressable style={styles.deleteButton} onPress={() => {}}>
          <Text style={styles.buttonText}>{t('Delete Account')}</Text>
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
    marginBottom: 16,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
  },
  subtitleDesc: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 40,
    lineHeight: 24,
  },
  deleteButton: {
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

export default DeleteAccountScreen;