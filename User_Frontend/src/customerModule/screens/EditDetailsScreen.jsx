import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
  Clipboard,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import { customerApi, updateStoredUser } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

// Safe string coercion — backend fields can be numbers/objects for some
// roles (FM / pilot / technician / sales). Prevents `.trim()` / `.replace()`
// TypeErrors that force-close the native app.
const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

// Converts ISO "YYYY-MM-DD" (stored in DB) into "DD/MM/YYYY" for display.
const isoToDisplay = (value) => {
  const text = toText(value).trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

// Converts "DD/MM/YYYY" (or "DD-MM-YYYY") input into the ISO "YYYY-MM-DD"
// format required by the backend's IsDateString validator.
const toIsoDate = (value) => {
  const text = toText(value).trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const copyTextToClipboard = async (text) => {
  const value = toText(text);
  if (!value) return false;
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return false;
    }
    Clipboard?.setString?.(value);
    return true;
  } catch {
    return false;
  }
};

const EditDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const initialUser = routeParams?.user || {};
  const [form, setForm] = useState({
    name: toText(initialUser?.name),
    email: toText(initialUser?.email),
    address: toText(initialUser?.address || initialUser?.profileData?.address || initialUser?.location?.address || ''),
    dob: isoToDisplay(initialUser?.profileData?.dob || ''),
    phone: toText(initialUser?.profileData?.phone || initialUser?.phone || ''),
    profilePhoto: toText(initialUser?.profileData?.photoUrl || initialUser?.profilePhoto || initialUser?.photoUrl || ''),
  });
  const [userId, setUserId] = useState(toText(initialUser?.uid || initialUser?.id || ''));
  const [saving, setSaving] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobPickerStep, setDobPickerStep] = useState('calendar'); // 'calendar' | 'year'
  const [viewYear, setViewYear] = useState(2000);
  const [viewMonth, setViewMonth] = useState(1);

  // ISO "YYYY-MM-DD" for the calendar's marked date (empty if the field is blank/invalid).
  const dobText = toText(form.dob).trim();
  const selectedDobIso = dobText ? toIsoDate(dobText) : '';
  const todayIso = new Date().toISOString().split('T')[0];
  const todayYear = new Date().getFullYear();

  const YEAR_RANGE = Array.from({ length: todayYear - 1949 }, (_, i) => todayYear - i);

  const openDobPicker = () => {
    // Open the calendar at the already-selected DOB, otherwise at today.
    try {
      const baseIso = selectedDobIso || todayIso;
      const parts = String(baseIso).split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      setViewYear(Number.isFinite(y) ? y : new Date().getFullYear());
      setViewMonth(m >= 1 && m <= 12 ? m : 1);
    } catch {
      setViewYear(new Date().getFullYear());
      setViewMonth(1);
    }
    setDobPickerStep('calendar');
    setShowDobPicker(true);
  };

  const shiftMonth = (delta) => {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    setViewMonth(month);
    setViewYear(year);
  };

  const monthName = (month) => {
    try {
      const safeMonth = Math.min(12, Math.max(1, Number(month) || 1));
      return new Date(2000, safeMonth - 1, 1).toLocaleString(locale || undefined, { month: 'long' });
    } catch {
      return String(month);
    }
  };

  useEffect(() => {
    let cancelled = false;
    customerApi
      .getCurrentUser()
      .then((user) => {
        if (cancelled || !user) return;
        setForm({
          name: toText(user?.name),
          email: toText(user?.email),
          address: toText(user?.address || user?.profileData?.address || user?.location?.address || ''),
          dob: isoToDisplay(user?.profileData?.dob || ''),
          phone: toText(user?.profileData?.phone || user?.phone || ''),
          profilePhoto: toText(user?.profileData?.photoUrl || user?.profilePhoto || user?.photoUrl || ''),
        });
        const uid = toText(user?.uid || user?.id || '');
        if (uid) setUserId(uid);
      })
      .catch((error) => console.error('Failed to load editable profile', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleCopyUserId = async () => {
    if (!userId) return;
    const ok = await copyTextToClipboard(userId);
    const message = ok ? t('User ID copied to clipboard.') : userId;
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert(t('User ID'), message);
    }
  };

  const handleSave = async () => {
    const nameText = toText(form.name).trim();
    const dobRaw = toText(form.dob).trim();
    if (!nameText) {
      if (Platform.OS === 'web') {
        window.alert(t('Full name is required.'));
      } else {
        Alert.alert(t('Validation'), t('Full name is required.'));
      }
      return;
    }

    if (dobRaw && !/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dobRaw)) {
      if (Platform.OS === 'web') {
        window.alert(t('Please enter the date of birth in DD/MM/YYYY format.'));
      } else {
        Alert.alert(t('Validation'), t('Please enter the date of birth in DD/MM/YYYY format.'));
      }
      return;
    }

    try {
      setSaving(true);
      const user = await customerApi.updateCurrentUser({
        name: nameText,
        email: toText(form.email).trim() || undefined,
        address: toText(form.address).trim() || undefined,
        dob: dobRaw ? toIsoDate(dobRaw) : undefined,
        phone: toText(form.phone).replace(/\D/g, '') || undefined,
        profilePhoto: toText(form.profilePhoto) || undefined,
      });
      await updateStoredUser(user);
      onNavigate('Account');
    } catch (error) {
      console.error('Failed to update profile', error);
      if (Platform.OS === 'web') {
        window.alert(error?.message || t('Failed to update profile'));
      } else {
        Alert.alert(t('Update Failed'), error?.message || t('Failed to update profile'));
      }
    } finally {
      setSaving(false);
    }
  };

  const CustomField = ({ label, value, onChangeText, editable = true, keyboardType = 'default', maxLength = undefined }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Account')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Edit Your Details')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]} keyboardShouldPersistTaps="handled">
        <ProfilePhotoPicker
          value={form.profilePhoto}
          onChange={(url) => updateField('profilePhoto', url)}
        />

        <CustomField label={t('Full Name')} value={form.name} onChangeText={(value) => updateField('name', value)} />
        <CustomField label={t('Email Address')} value={form.email} onChangeText={(value) => updateField('email', value)} keyboardType="email-address" />

        {/* DOB is a calendar picker, not a free-text field */}
        <Pressable style={styles.fieldContainer} onPress={openDobPicker}>
          <Text style={styles.fieldLabel}>{t('Date of Birth')}</Text>
          <Text style={form.dob ? styles.fieldValue : styles.fieldPlaceholder}>
            {form.dob || t('Select your date of birth')}
          </Text>
        </Pressable>

        <CustomField label={t('Phone Number')} value={form.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" maxLength={15} />
        <CustomField label={t('Address')} value={form.address} onChangeText={(value) => updateField('address', value)} />

        {/* User ID — visible but never editable; tap Copy to copy it. */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('User ID')}</Text>
          <View style={styles.uidRow}>
            <Text style={styles.uidText} selectable>{userId || t('N/A')}</Text>
            {userId ? (
              <Pressable style={styles.copyButton} onPress={handleCopyUserId} hitSlop={8}>
                <Text style={styles.copyButtonText}>{t('Copy')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.updateButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.updateButtonText}>{t('Update')}</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => onNavigate('Account')}>
            <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showDobPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDobPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDobPicker(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {dobPickerStep === 'calendar'
                  ? t('Select Date of Birth')
                  : t('Select Year')}
              </Text>
              <Pressable onPress={() => setShowDobPicker(false)} hitSlop={12}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {dobPickerStep === 'calendar' ? (
              <>
                {/* Year + month quick navigation */}
                <View style={styles.pickerControls}>
                  <View style={styles.controlGroup}>
                    <Pressable
                      style={styles.controlButton}
                      onPress={() => setViewYear(viewYear - 1)}
                      hitSlop={8}
                    >
                      <Text style={styles.controlButtonText}>◀</Text>
                    </Pressable>
                    <Pressable
                      style={styles.controlLabelButton}
                      onPress={() => setDobPickerStep('year')}
                    >
                      <Text style={styles.controlLabelText}>{viewYear}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.controlButton}
                      onPress={() => setViewYear(Math.min(viewYear + 1, todayYear))}
                      hitSlop={8}
                    >
                      <Text style={styles.controlButtonText}>▶</Text>
                    </Pressable>
                  </View>

                  <View style={styles.controlGroup}>
                    <Pressable
                      style={styles.controlButton}
                      onPress={() => shiftMonth(-1)}
                      hitSlop={8}
                    >
                      <Text style={styles.controlButtonText}>◀</Text>
                    </Pressable>
                    <Pressable style={styles.controlLabelButton} onPress={() => setDobPickerStep('year')}>
                      <Text style={styles.controlLabelText}>{monthName(viewMonth)}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.controlButton}
                      onPress={() => shiftMonth(1)}
                      hitSlop={8}
                    >
                      <Text style={styles.controlButtonText}>▶</Text>
                    </Pressable>
                  </View>
                </View>

                <Calendar
                  current={`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`}
                  onDayPress={(day) => {
                    updateField('dob', isoToDisplay(day.dateString));
                    setShowDobPicker(false);
                  }}
                  onVisibleMonthsChange={(months) => {
                    const first = months?.[0];
                    if (first?.year && first?.month) {
                      setViewYear(first.year);
                      setViewMonth(first.month);
                    }
                  }}
                  maxDate={todayIso}
                  markedDates={
                    selectedDobIso
                      ? { [selectedDobIso]: { selected: true, selectedColor: '#5060D3', disableTouchEvent: true } }
                      : {}
                  }
                  theme={{
                    selectedDayBackgroundColor: '#5060D3',
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: '#5060D3',
                    arrowColor: '#5060D3',
                    textSectionTitleColor: '#5060D3',
                    monthTextColor: '#2F3542',
                  }}
                />
              </>
            ) : (
              <FlatList
                data={YEAR_RANGE}
                keyExtractor={(item) => String(item)}
                style={styles.yearList}
                initialScrollIndex={Math.max(0, YEAR_RANGE.indexOf(viewYear))}
                getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = item === viewYear;
                  return (
                    <Pressable
                      style={[styles.yearRow, isSelected && styles.yearRowSelected]}
                      onPress={() => {
                        setViewYear(item);
                        setDobPickerStep('calendar');
                      }}
                    >
                      <Text style={[styles.yearRowText, isSelected && styles.yearRowTextSelected]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}

            {form.dob ? (
              <Pressable
                style={styles.modalClearButton}
                onPress={() => {
                  updateField('dob', '');
                  setShowDobPicker(false);
                }}
              >
                <Text style={styles.modalClearText}>{t('Clear Date of Birth')}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
    fontSize: 22,
    fontWeight: '500',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  fieldContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 64,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  fieldInput: {
    fontSize: 16,
    color: '#374151',
    padding: 0,
    margin: 0,
  },
  fieldValue: {
    fontSize: 16,
    color: '#374151',
    padding: 0,
    margin: 0,
  },
  fieldPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    padding: 0,
    margin: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F3542',
  },
  modalClose: {
    fontSize: 20,
    color: '#4B5563',
    fontWeight: '600',
  },
  modalClearButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  modalClearText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 16,
    color: '#5060D3',
    fontWeight: '700',
  },
  controlLabelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  controlLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F3542',
  },
  yearList: {
    maxHeight: 300,
  },
  yearRow: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  yearRowSelected: {
    backgroundColor: '#5060D3',
  },
  yearRowText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
  yearRowTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6B7280',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  uidText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  copyButton: {
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#C7CEF9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyButtonText: {
    color: '#5060D3',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditDetailsScreen;
