import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenContainer from '../components/ScreenContainer';
import { useLanguage } from '../../i18n';

// --- SVG ICONS ---
const ArrowBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2F3542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5M12 19l-7-7 7-7" />
  </Svg>
);

const ShieldCheckIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5060D3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="M9 12l2 2 4-4" />
  </Svg>
);

// Custom Switch Toggle
const SwitchToggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
  <Pressable 
    onPress={onToggle} 
    style={[styles.toggleTrack, value ? styles.toggleTrackActive : styles.toggleTrackInactive]}
  >
    <View style={[styles.toggleThumb, value ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
  </Pressable>
);

interface TwoFactorAuthScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  onSwitchRole?: (role: string) => void;
  routeParams?: any;
}

const TwoFactorAuthScreen: React.FC<TwoFactorAuthScreenProps> = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 600;

  // Toggle states matching Figma design defaults
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [authenticatorEnabled, setAuthenticatorEnabled] = useState(false);

  const handleBackPress = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('Account');
    }
  };

  const handleSaveAuthentication = () => {
    // Add logic to save 2FA settings here
    if (typeof onNavigate === 'function') {
      onNavigate('Account');
    }
  };

  return (
    <ScreenContainer backgroundColor={isWebDesktop ? "transparent" : "#FAFAFA"}>
      <View style={[styles.outerWrapper, isWebDesktop && styles.desktopFlat]}>
        
        {/* Header Section */}
        <View style={[styles.header, isWebDesktop && styles.desktopHeader]}>
          <Pressable onPress={handleBackPress} hitSlop={12} style={styles.backBtn}>
            <ArrowBack />
          </Pressable>
          <Text style={styles.heading}>{t('2 Factor Authentication')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isWebDesktop && styles.desktopContent]}>
          
          {/* Main Title Banner */}
          <View style={styles.titleSection}>
            <View style={styles.iconCircle}>
              <ShieldCheckIcon />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.mainTitle}>{t('Secure Verification')}</Text>
              <Text style={styles.mainSub}>
                {t('Choose how you would like to receive security codes.')}
              </Text>
            </View>
          </View>

          {/* Option 1: SMS Verification */}
          <View style={styles.settingRow}>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>{t('SMS Verification')}</Text>
              <Text style={styles.rowSub}>{t('Code sent to +91 ******3799')}</Text>
            </View>
            <SwitchToggle 
              value={smsEnabled} 
              onToggle={() => setSmsEnabled(!smsEnabled)} 
            />
          </View>
          <View style={styles.divider} />

          {/* Option 2: Email Verification */}
          <View style={styles.settingRow}>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>{t('Email Verification')}</Text>
              <Text style={styles.rowSub}>{t('Code sent to mayank****@gmail.com')}</Text>
            </View>
            <SwitchToggle 
              value={emailEnabled} 
              onToggle={() => setEmailEnabled(!emailEnabled)} 
            />
          </View>
          <View style={styles.divider} />

          {/* Option 3: Authenticator App */}
          <View style={styles.settingRow}>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>{t('Authenticator App')}</Text>
              <Text style={styles.rowSub}>{t('Use Google or Microsoft Authenticator')}</Text>
            </View>
            <SwitchToggle 
              value={authenticatorEnabled} 
              onToggle={() => setAuthenticatorEnabled(!authenticatorEnabled)} 
            />
          </View>

          {/* Action Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleSaveAuthentication}
          >
            <Text style={styles.saveButtonText}>{t('Save Authentication')}</Text>
          </Pressable>

        </ScrollView>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  desktopFlat: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  desktopHeader: {
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 28,
  },
  backBtn: {
    marginRight: 14,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxWidth: 480,
  },
  desktopContent: {
    paddingHorizontal: 0,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  titleTextCol: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 4,
  },
  mainSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textCol: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F3542',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackInactive: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  toggleTrackActive: {
    backgroundColor: '#5060D3',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbInactive: {
    backgroundColor: '#6B7280',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#5060D3',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  buttonPressed: {
    opacity: 0.88,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TwoFactorAuthScreen;
