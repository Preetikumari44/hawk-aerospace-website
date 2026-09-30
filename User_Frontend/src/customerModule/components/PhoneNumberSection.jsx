import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import DropdownIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';
import { useLanguage } from '../../i18n';

const PhoneNumberSection = ({
  mobileNumber,
  onChangeText,
  countryCode = '+91',
  onChangeCountryCode,
  readOnly = false,
}) => {
  const { t, locale } = useLanguage();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('Enter Mobile Number')}<Text style={styles.required}> *</Text>
      </Text>

      <View style={styles.inputWrapper}>
        <Pressable
          style={styles.countryCodeBox}
          onPress={() => !readOnly && setShowPicker(true)}
        >
          <View style={styles.countryRow}>
            <Text style={styles.countryCodeText}>
              {countryCode || '+91'}
            </Text>
            <DropdownIcon width={20} height={20} />
          </View>
        </Pressable>

        <TextInput
          style={styles.mobileInput}
          value={mobileNumber}
          editable={!readOnly}
          onChangeText={(value) => onChangeText?.(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          // inputMode makes web (and mobile web) open the numeric keypad.
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="8845414199"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <CountryPicker
        show={showPicker}
        pickerButtonOnPress={(item) => {
          onChangeCountryCode?.(item.dial_code);
          setShowPicker(false);
        }}
        onBackdropPress={() => setShowPicker(false)}
        style={{
          modal: {
            height: '75%',
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  label: {
    ...TYPOGRAPHY.bodyMediumEmphasized,
    color: COLORS.white,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 2,
    width: '100%',
  },
  countryCodeBox: {
    width: 90,
    height: 54,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryCodeText: {
    ...TYPOGRAPHY.bodyLarge,
    color: '#4B5563',
  },
  mobileInput: {
    flex: 1,
    height: 54,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    ...TYPOGRAPHY.bodyLarge,
    color: '#111827',
    //marginRight: 20
  },
});

export default PhoneNumberSection;
