import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import PrimaryButton from '../components/PrimaryButton';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import DropdownArrowIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const NewComplaintFormScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [type, setType] = useState(routeParams?.type || 'OTHER');
  const [description, setDescription] = useState('');
  const [relatedEntityId, setRelatedEntityId] = useState(routeParams?.bookingId || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || saving) {
      return;
    }

    try {
      setSaving(true);
      await customerApi.createComplaint({
        type,
        description: description.trim(),
        relatedEntityType: relatedEntityId ? 'BOOKING' : 'GENERAL',
        relatedEntityId: relatedEntityId.trim() || undefined,
      });
      onNavigate('ComplaintHistoryScreen');
    } catch (error) {
      console.error('Failed to submit complaint', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Account')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('New Complaint Form')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>{t('Enter Complaint Type')} <Text style={styles.asterisk}>*</Text></Text>
          <Pressable style={styles.dropdownInput} onPress={() => onNavigate('SelectComplaintTypeScreen')}>
            <Text style={styles.inputText}>{t(type)}</Text>
            <DropdownArrowIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>{t('Description')}</Text>
          <TextInput
            style={styles.textArea}
            placeholder={t('Enter a description...')}
            placeholderTextColor="#6B7280"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>{t('Booking ID (if complaint is related to a booking)')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('Booking ID')}
            placeholderTextColor="#6B7280"
            value={relatedEntityId}
            onChangeText={setRelatedEntityId}
          />
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={saving ? t('Submitting...') : t('Submit')}
            backgroundColor={COLORS.primary}
            textColor="#FFFFFF"
            onPress={handleSubmit}
          />
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
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  fieldWrapper: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '500', color: '#374151', marginBottom: 8 },
  asterisk: { color: '#DC2626' },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
  },
  inputText: { fontSize: 15, color: '#6B7280' },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#374151',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    height: 120,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#374151',
  },
  buttonContainer: { marginTop: 10 },
});

export default NewComplaintFormScreen;
