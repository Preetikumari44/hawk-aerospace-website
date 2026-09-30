import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';
import { getRoleApplicationConfig } from '../../commonScreens/roleApplicationConfig';

const ApplicationSuccessScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();

  const roleId = routeParams?.role || 'pilot';
  const isGuest = !!routeParams?.guest;
  const config = getRoleApplicationConfig(roleId);
  const roleTitle = config?.title || 'Drone Pilot';

  const goToLogin = () => {
    try {
      if (typeof window !== 'undefined' && window?.history?.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    } catch { /* noop */ }
    onNavigate('MobileNumberScreen');
  };

  return (
    <Pressable style={styles.container} onPress={() => onNavigate(isGuest ? 'MobileNumberScreen' : 'MainApp')}>
      <CrossPlatformGradient colors={['#4F46E5', '#312E81']} style={styles.gradient}>
        <Text style={styles.title}>{t('Congratulations!')}</Text>
        <Text style={styles.subtitle}>
          {config?.successSubtitle
            ? t(config.successSubtitle)
            : t('Your Application for the Role of {{role}} is Submitted', { role: t(roleTitle) })}
        </Text>
        <Text style={styles.bodyText}>
          {isGuest
            ? t("Your Application is awaiting Admin Approval. Once approved, log in with your mobile number (OTP) and you'll enter directly as {{role}}. Your inviter earns their reward on approval.", { role: t(roleTitle) })
            : t("Your Application is awaiting Admin Approval. We'll notify you as soon as there is an update")}
        </Text>
        {isGuest ? (
          <Pressable style={styles.continueBtn} onPress={goToLogin}>
            <Text style={styles.continueBtnText}>{t('Done — Log In')}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.continueBtn} onPress={() => onNavigate('Account')}>
            <Text style={styles.continueBtnText}>{t('Go to Account')}</Text>
          </Pressable>
        )}
      </CrossPlatformGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  continueBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ApplicationSuccessScreen;