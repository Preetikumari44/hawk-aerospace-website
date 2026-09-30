import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';

import CheckboxIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';
import { useLanguage } from '../../i18n';

// Checkbox with a label for agreeing to terms and conditions
const TermsCheckbox = ({ checked, onPress }) => {
  const { t, locale } = useLanguage();
  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
    >
      <View style={styles.checkbox}>
        {checked && (
          // <Icon
          //   name="check"
          //   size={16}
          //   color={COLORS.primary}
          // />
          <CheckboxIcon width={16} height={16} />
        )}
      </View>

      <Text style={styles.text}>
        {t('By Signing I agree to ')}
        <Text style={styles.linkText}>{t('Terms & Conditions')}</Text>
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Native spacing between box and text
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.white,
    flex: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});

export default TermsCheckbox;