import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Modal,
  Image,
} from 'react-native';

import AvatarProfileEdit from '../assets/Icons_V02/Icons/AvatarProfileEdit.svg';
import ArrowIcon from '../assets/Icons_V02/Icons/ArrowIcon.svg';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import COLORS from '../constants/colors';
import PromoCard from '../../pilotModule/components/PromoCard';
import ScreenContainer from '../components/ScreenContainer';
import SwitchRoleModal from '../components/SwitchRoleModal';
import { authApi, customerApi, getSession, mapsApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const toSafeText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};
const COORD_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

const AccountScreen = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const [isSwitchRoleVisible, setIsSwitchRoleVisible] = useState(false);
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [personalAddress, setPersonalAddress] = useState('');

  useEffect(() => {
    Promise.all([customerApi.getCurrentUser().catch(() => null), getSession()])
      .then(([currentUser, session]) => setUser(currentUser || session?.user || null))
      .catch((error) => console.error('Failed to load account data', error));
  }, []);

  // Customer legacy screen: show the user-set location as a full address.
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    const stored = toSafeText(user?.profileData?.address || user?.address || user?.location?.address || '').trim();
    if (stored && !COORD_RE.test(stored)) {
      setPersonalAddress(stored);
      return;
    }
    const loc = user?.profileData?.location || user?.location || null;
    const lat = Number(loc?.lat ?? loc?.latitude);
    const lng = Number(loc?.lng ?? loc?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapsApi.reverseGeocode(lat, lng).then((result) => {
        if (cancelled) return;
        const formatted = toSafeText(result?.data?.formattedAddress || result?.formattedAddress || '').trim();
        if (formatted) setPersonalAddress(formatted);
        else if (stored) setPersonalAddress(stored);
      }).catch(() => {
        if (!cancelled && stored) setPersonalAddress(stored);
      });
    } else if (stored) {
      setPersonalAddress(stored);
    }
    return () => { cancelled = true; };
  }, [user]);

  const photoUrl = toSafeText(user?.profileData?.photoUrl || user?.profilePhoto || user?.photoUrl || '').trim();

  const handleLogout = async () => {
    await authApi.logout();
    onNavigate('MobileNumberScreen');
  };

  const handleDelete = async () => {
    await customerApi.deleteAccount('User requested account deletion from customer app').catch((error) => {
      console.error('Failed to request account deletion', error);
    });
    await authApi.logout();
    onNavigate('MobileNumberScreen');
  };

  return (
    <ScreenContainer backgroundColor="#F9FAFB">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}>
        <View style={styles.profileContainer}>
          <Pressable style={styles.avatarWrapper} onPress={() => onNavigate('EditDetailsScreen', { user })}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <AvatarProfileEdit width={120} height={120} />
            )}
            <Text style={styles.avatarHint}>{t('View / Edit Photo')}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.card} onPress={() => onNavigate('EditDetailsScreen', { user })}>
          <Text style={styles.cardTitle}>{t('Personal Details')}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.detailText}>{user?.name || t('Customer')}</Text>
            <Text style={styles.detailText}>{user?.phone || t('No phone number')}</Text>
            <Text style={styles.detailText}>{user?.email || t('No email address')}</Text>
            <Text style={styles.detailText}>{t(user?.role || 'customer')}</Text>
            <Text style={styles.detailText}>{user?.uid || t('No customer id')}</Text>
            <Text style={styles.detailText}>{personalAddress || t('Address unavailable')}</Text>
          </View>
          <ArrowIcon width={24} height={24} style={styles.rightArrow} />
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Your Role')}</Text>
          <Text style={styles.roleText}>
            {t('Your Current Role:')}<Text style={styles.roleValue}> {t(user?.role || 'customer')}</Text>
          </Text>
          <Pressable style={styles.optionRow} onPress={() => setIsSwitchRoleVisible(true)}>
            <Text style={styles.optionText}>{t('Switch Role')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
          <Pressable style={styles.optionRow} onPress={() => onNavigate('ApplicationStatusScreen')}>
            <Text style={styles.optionText}>{t('Application Status')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Preferences')}</Text>
          <Pressable style={styles.optionRow} onPress={() => onNavigate('LanguageSelectionScreen')}>
            <Text style={styles.optionText}>{t('Language')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>{t('Theme')}</Text>
            <Switch value={false} />
          </View>
          <Pressable style={styles.optionRow} onPress={() => onNavigate('NotificationPreferencesScreen')}>
            <Text style={styles.optionText}>{t('Notifications')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Marketplace')}</Text>
          <Pressable style={styles.optionRow} onPress={() => onNavigate('CustomerRefundsScreen')}>
            <Text style={styles.optionText}>{t('Refunds')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Support')}</Text>
          {[
            { label: 'Raise a Complaint', route: 'NewComplaintFormScreen' },
            { label: 'Complaint History', route: 'ComplaintHistoryScreen' },
          ].map((item) => (
            <Pressable key={item.label} style={styles.optionRow} onPress={() => onNavigate(item.route)}>
              <Text style={styles.optionText}>{t(item.label)}</Text>
              <ArrowIcon width={24} height={24} />
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('Security')}</Text>
          <Pressable style={styles.optionRow} onPress={() => setIsLogoutVisible(true)}>
            <Text style={styles.logoutText}>{t('Log Out')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
          <Pressable style={styles.optionRow} onPress={() => setIsDeleteVisible(true)}>
            <Text style={styles.logoutText}>{t('Delete Account')}</Text>
            <ArrowIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.promoSectionTitle}>{t('Promotions & Offers')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
          >
            {[1, 2, 3].map((_, index) => (
              <PromoCard key={index} layout="carousel" />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <SwitchRoleModal visible={isSwitchRoleVisible} onClose={() => setIsSwitchRoleVisible(false)} onNavigate={onNavigate} />

      <Modal visible={isLogoutVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setIsLogoutVisible(false)}>
                <ArrowBackwardIcon width={28} height={28} />
              </Pressable>
              <Text style={styles.modalHeading}>{t('Logout')}</Text>
            </View>
            <Text style={styles.modalTitle}>{t('Log out of your account?')}</Text>
            <Text style={styles.modalSubtitle}>{t('Your backend session tokens will be invalidated.')}</Text>
            <Pressable style={styles.dangerButton} onPress={handleLogout}>
              <Text style={styles.dangerButtonText}>{t('Log Out')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isDeleteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setIsDeleteVisible(false)}>
                <ArrowBackwardIcon width={28} height={28} />
              </Pressable>
              <Text style={styles.modalHeading}>{t('Delete Account')}</Text>
            </View>
            <Text style={styles.modalTitle}>{t('Delete your account?')}</Text>
            <Text style={styles.modalSubtitle}>{t('This creates a backend deletion request and signs you out.')}</Text>
            <Pressable style={styles.dangerButton} onPress={handleDelete}>
              <Text style={styles.dangerButtonText}>{t('Delete Account')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileContainer: { alignItems: 'center', marginBottom: 10 },
  avatarWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#5060D3' },
  avatarHint: { marginTop: 8, fontSize: 12, color: '#5060D3', fontWeight: '500' },
  promoSection: {
    marginTop: 16,
    gap: 12,
  },
  promoSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  textContainer: { paddingRight: 24 },
  detailText: { fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 20 },
  rightArrow: { position: 'absolute', right: 16, top: '50%' },
  roleText: { fontSize: 14, color: '#374151', marginBottom: 16 },
  roleValue: { color: COLORS.primary, fontWeight: '700' },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: { fontSize: 14, color: '#374151' },
  logoutText: { fontSize: 14, color: '#DC2626' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  modalHeading: { fontSize: 22, fontWeight: '500', color: '#2F3542', marginLeft: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 12, lineHeight: 26 },
  modalSubtitle: { fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 8 },
  dangerButton: {
    backgroundColor: '#B91C1C',
    height: 56,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});

export default AccountScreen;
