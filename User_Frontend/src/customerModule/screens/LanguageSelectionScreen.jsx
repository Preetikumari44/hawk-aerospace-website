import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import PrimaryButton from '../components/PrimaryButton';
import ScreenContainer from '../components/ScreenContainer';
import DropdownArrowIcon from '../assets/Icons_V02/Icons/DropdownArrowIcon.svg';
import { useLanguage } from '../../i18n';

const CONSTANT_LANGUAGE_CODES = ['en', 'hi'];

const LanguageSelectionScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, language, setLanguage, regionalLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isOtherLanguagesOpen, setIsOtherLanguagesOpen] = useState(false);

  const allLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  ];

  const regionalCode = regionalLanguage && !CONSTANT_LANGUAGE_CODES.includes(regionalLanguage)
    ? regionalLanguage
    : null;

  const constantLanguages = allLanguages.filter((lang) => CONSTANT_LANGUAGE_CODES.includes(lang.code));
  const regionalLanguageEntry = regionalCode
    ? allLanguages.find((lang) => lang.code === regionalCode) || null
    : null;
  const otherLanguages = allLanguages.filter(
    (lang) => !CONSTANT_LANGUAGE_CODES.includes(lang.code) && lang.code !== regionalCode,
  );

  const handleSelect = (code) => {
    setSelectedLanguage(code);
    setLanguage(code);
  };

  const renderLanguageRow = (lang) => (
    <Pressable
      key={lang.code}
      style={styles.languageRow}
      onPress={() => handleSelect(lang.code)}
    >
      <View style={styles.languageNameWrap}>
        <Text style={styles.languageText}>{lang.name}</Text>
        <Text style={styles.languageNative}>{lang.nativeName}</Text>
      </View>

      <View
        style={[
          styles.radioOuter,
          selectedLanguage === lang.code && styles.radioOuterSelected,
        ]}
      >
        {selectedLanguage === lang.code && (
          <View style={styles.radioInner} />
        )}
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer backgroundColor={COLORS.primary}>
      <View style={styles.contentWrapper}>

        <View style={styles.card}>
          <Text style={styles.title}>{t('Select Language')}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {constantLanguages.map(renderLanguageRow)}

            {regionalLanguageEntry && (
              <View style={styles.groupBlock}>
                <Text style={styles.groupLabel}>{t('Regional Language')}</Text>
                {renderLanguageRow(regionalLanguageEntry)}
              </View>
            )}

            <View style={styles.groupBlock}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => setIsOtherLanguagesOpen((prev) => !prev)}
              >
                <Text style={styles.groupLabel}>{t('Other Languages')}</Text>
                {/* NOTE: Do NOT pass an RN style array directly to the SVGR-generated
                    SVG component. On web (@svgr/webpack) it renders a plain DOM
                    <svg>, and React DOM tries to assign style[0] on the
                    CSSStyleDeclaration, crashing with:
                    "Failed to set an indexed property [0] on 'CSSStyleDeclaration'".
                    The rotation therefore lives on an RN View wrapper, which
                    react-native-web understands (transform array -> CSS). */}
                <View
                  style={[
                    styles.groupChevron,
                    isOtherLanguagesOpen && styles.groupChevronOpen,
                  ]}
                >
                  <DropdownArrowIcon width={18} height={18} />
                </View>
              </Pressable>
              {isOtherLanguagesOpen && otherLanguages.map(renderLanguageRow)}
            </View>
          </ScrollView>
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={t('Continue')}
            backgroundColor={selectedLanguage ? COLORS.white : 'rgba(255,255,255,0.5)'}
            textColor={COLORS.primary}
            onPress={() => {
              if (selectedLanguage) {
                onNavigate('MobileNumberScreen');
              }
            }}
          />
        </View>

      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },

  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginBottom: 24,
    gap: 20,
  },

  title: {
    ...TYPOGRAPHY.headlineSmallEmphasized,
    textAlign: 'center',
    color: '#2F3542',
  },

  scrollContent: {
    gap: 4,
    paddingBottom: 20,
  },

  groupBlock: {
    marginTop: 12,
  },

  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  groupLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  groupChevron: {
    transform: [{ rotate: '0deg' }],
  },

  groupChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },

  languageNameWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },

  languageText: {
    ...TYPOGRAPHY.bodyLargeEmphasized,
    color: '#2F3542',
  },

  languageNative: {
    ...TYPOGRAPHY.bodySmall,
    color: '#6B7280',
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioOuterSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  buttonContainer: {
    width: '100%',
  },
});

export default LanguageSelectionScreen;
