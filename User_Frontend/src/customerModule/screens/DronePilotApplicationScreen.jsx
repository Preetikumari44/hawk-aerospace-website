import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import CheckboxIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';
import PencilIcon from '../assets/Icons_V02/Icons/PencilIcon.svg';
import { useLanguage } from '../../i18n';

const InputField = ({ label, value, required = false }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.asterisk}>*</Text>}
      </Text>
      <TextInput
        value={value}
        style={styles.input}
        editable={false} // Keeping it false just to look like the filled figma state
      />
    </View>
  );
};

const DocumentRow = ({ title, uploaded = true, required = true }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.docRow}>
      {/* <MaterialIcons 
        name={uploaded ? "check-box" : "check-box-outline-blank"} 
        size={20} 
        color={uploaded ? COLORS.primary : "#9CA3AF"} 
      /> */}
      <CheckboxIcon width={20} height={20} />
      <Text style={styles.docText}>
        {title} {required && <Text style={styles.asterisk}>*</Text>}
      </Text>
    </View>
  );
};

const UploadedDocCard = ({ title }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.uploadedCard}>
      {/* <MaterialIcons name="article" size={20} color="#4B5563" /> */}
      <Text style={styles.uploadedCardText}>{title}</Text>
    </View>
  );
};

const DronePilotApplicationScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Application for Drone Pilot')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={styles.infoText}>
          {t("You Don't Have Access to Drone Pilot App yet. Fill the Form Below to Access the Drone Pilot App & its Amazing Features")}
        </Text>

        {/* Mock Phone Images */}
        <View style={styles.phonesContainer}>
          <Image source={require('../assets/images/mockphone.png')} style={styles.phoneImage} />
          <Image source={require('../assets/images/mockphone.png')} style={styles.phoneImage} />
        </View>

        <Text style={styles.sectionTitle}>{t('Upload Profile Photo')}</Text>
        <View style={styles.profileWrapper}>
          <Image source={require('../assets/images/mockprofile.png')} style={styles.profileImage} />
          <View style={styles.editIconWrapper}>
            {/* <MaterialIcons name="edit" size={16} color="#4F46E5" /> */}
            <PencilIcon width={16} height={16} />
          </View>
        </View>

        <InputField label={t('Enter Name')} value="Vishwas Rao" required={true} />
        <InputField label={t('Enter Phone Number')} value="+91 8845418177" required={true} />
        <InputField label={t('Enter Email ID')} value="DJI Mavrick" required={true} />
        <InputField label={t('Enter Address')} value="DJI Mavrick" required={true} />
        <InputField label={t('Pilot License Number')} value="DJI Mavrick" required={true} />
        <InputField label={t('Enter GST Number')} value="GST Number" />
        <InputField label={t('Date & Time')} value="01 May 2026" />

        <Text style={styles.sectionTitleBlack}>{t('Upload Documents')}</Text>
        <Text style={styles.subText}>
          {t('Documents help us verify your suitability for the role. Below is the list of mandatory documents. You can upload more if you want.')}
        </Text>

        <Text style={styles.boldLabel}>{t('Documents Needed:')}</Text>
        <DocumentRow title={t('Aadhar Card Front Side')} />
        <DocumentRow title={t('Aadhar Card Back Side')} />
        <DocumentRow title={t('Pilot License')} />
        <DocumentRow title={t('GST Registration Document')} />
        <DocumentRow title={t('Pilot Training Certifications')} />

        <Text style={[styles.sectionTitleBlack, { marginTop: 24, marginBottom: 12 }]}>{t('Documents Uploaded')}</Text>
        <UploadedDocCard title={t('Aadhar Card Front')} />
        <UploadedDocCard title={t('Aadhar Card Back')} />
        <UploadedDocCard title={t('Pilot License')} />
        <UploadedDocCard title={t('GST Document')} />
        <UploadedDocCard title={t('Pilot Training Certificate')} />

        <Pressable style={styles.addDocBtn}>
          {/* <MaterialIcons name="add-circle-outline" size={20} color="#4B5563" /> */}
          <Text style={styles.addDocText}>{t('Add New Document')}</Text>
        </Pressable>

        <Pressable 
          style={styles.submitBtn}
          onPress={() => onNavigate('ApplicationSuccessScreen')} // Tumhara next screen jo success wala hai
        >
          <Text style={styles.submitBtnText}>{t('Submit Application')}</Text>
        </Pressable>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  heading: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  infoText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  phonesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },

  phoneImage: {
    width: '45%',
    maxWidth: 140,
    height: 260,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },

  sectionTitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },

  sectionTitleBlack: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },

  subText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },

  boldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },

  profileWrapper: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 24,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  editIconWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  inputWrapper: {
    marginBottom: 16,
  },

  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },

  asterisk: {
    color: '#EF4444',
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  docText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
  },

  uploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  uploadedCardText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  addDocBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 24,
    marginBottom: 40,
  },

  addDocText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },

  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DronePilotApplicationScreen;