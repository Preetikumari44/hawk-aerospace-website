import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import ArrowForwardIcon from '../assets/Icons_V02/Icons/ArrowForwardIcon.svg';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

const SupportCard = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const handleSupportChat = () => {
    if (!onNavigate) {
      console.warn('[SupportCard] onNavigate not provided');
      return;
    }
    // Route through the support-type picker so booking/order chats stay
    // scoped per booking/order with their own history.
    onNavigate('SupportOptionsScreen');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        <View style={styles.topSection}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{t('24x7 Expert Support')}</Text>
            <Text style={styles.description}>
              {/*{t('Get help from our agricultural drone specialists anytime')}*/}
              {t('Get help from our support team anytime')}
            </Text>
          </View>

          <Image
            source={require('../assets/images/support_phone.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        <Pressable style={styles.button} onPress={handleSupportChat}>
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>{t('Support')}</Text>
            <ArrowForwardIcon width={18} height={18} />
          </View>
        </Pressable>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    width: '100%',
  },
  card: {
    backgroundColor: '#5A639C',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    gap: 12
    //height: 168, 
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#F9FAFB',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 'auto',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#72737E',
  },
  icon: {
    height: 65,
    width: 65,
  },
});

export default SupportCard;
