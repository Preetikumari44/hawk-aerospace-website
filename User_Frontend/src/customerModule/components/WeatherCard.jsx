import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Image } from 'react-native';

import TYPOGRAPHY from '../constants/typography';
import ArrowDownIcon from '../assets/Icons_V02/Icons/ArrowDownIcon.svg';
import ArrowDropUp from '../../assets/Icons/SVG/Light/keyboard_arrow_up.svg';
import ArrowDropDown from '../../assets/Icons/SVG/Light/keyboard_arrow_down.svg';
import HumidityIcon from '../assets/Icons/HumidityIcon.svg';
import Cloud1 from '../../assets/cloud1.svg'
import { useLanguage } from '../../i18n';

const WeatherCard = ({ weather, loading }) => {
  const { t, locale } = useLanguage();
  const summary = weather?.summary || t('Weather unavailable');
  const currentTemp = weather?.currentTemp ?? weather?.temperature ?? '--';
  const maxTemp = weather?.maxTemp ?? '--';
  const minTemp = weather?.minTemp ?? '--';
  const windSpeed = weather?.windSpeed ?? '--';
  const humidity = weather?.humidity ?? '--';
  const rainProbability = weather?.rainProbability ?? '--';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5060D3" />
          <Text style={styles.loadingText}>{t('Loading weather data...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.temperature}>{t('{{v}}°C', { v: Math.round(currentTemp) })}</Text>

        <View style={styles.weatherCenter}>
          <Cloud1 width={28} height={28} />
          <Text style={styles.weatherText}>{t(summary)}</Text>
        </View>

        <View style={styles.tempRange}>
          <View style={styles.tempItem}>
            <ArrowDropUp width={14} height={14} />
            <Text style={styles.tempText}>{t('{{v}}°', { v: maxTemp })}</Text>
          </View>
          <View style={styles.tempItem}>
            <ArrowDropDown width={14} height={14} />
            <Text style={styles.tempText}>{`${minTemp}°`}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <HumidityIcon width={14} height={14} />
            <Text style={styles.statTitle} numberOfLines={1}>{t('Wind')}</Text>
          </View>
          <Text style={styles.statValue}>{`${windSpeed} km/h`}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <HumidityIcon width={14} height={14} />
            <Text style={styles.statTitle} numberOfLines={1}>{t('Humidity')}</Text>
          </View>
          <Text style={styles.statValue}>{`${humidity}%`}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Cloud1 width={14} height={14} />
            <Text style={styles.statTitle} numberOfLines={1} adjustsFontSizeToFit>
              Rain %
            </Text>
          </View>
          <Text style={styles.statValue}>{`${rainProbability}%`}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  temperature: {
    fontFamily: 'Roboto-Medium',
    fontSize: 40,
    color: '#374151',
    letterSpacing: -1,
  },
  weatherCenter: {
    alignItems: 'center',
    flex: 1,
  },
  weatherImage: {
    width: 28,
    height: 28,
  },
  weatherText: {
    ...TYPOGRAPHY.labelMedium,
    fontSize: 12,
    color: '#6B7280',
  },
  tempRange: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tempItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tempText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 13,
    color: '#4B5563',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  statTitle: {
    ...TYPOGRAPHY.labelMedium,
    fontSize: 10,
    color: '#6B7280',
    flexShrink: 1,
  },
  statValue: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#4B5563',
  },
  rainIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default WeatherCard;
