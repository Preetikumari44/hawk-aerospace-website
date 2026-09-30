import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import WeatherCard from './WeatherCard';
import { useLanguage } from '../../i18n';

const WeatherSummaryCard = ({ weatherData, serviceDate }) => {
  const { t, locale } = useLanguage();
  const status = String(weatherData?.status || 'green').toLowerCase();
  const metrics = weatherData?.metrics || {};
  const temperature = metrics.temperatureC ?? weatherData?.temperature ?? 28;
  const windSpeed = metrics.windSpeedKmh ?? weatherData?.windSpeed ?? 12;
  const humidity = metrics.humidityPct ?? weatherData?.humidity ?? 40;
  const forecast = weatherData?.summary || weatherData?.forecast || '';
  const isSafe = status === 'green';
  // Use service date if provided, otherwise fall back to current date
  const displayDate = serviceDate ? new Date(serviceDate) : new Date();
  const dateStr = displayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const [daily, setDaily] = useState(null);

  const location = weatherData?.location;

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    let cancelled = false;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setDaily({
          maxTemp: data?.daily?.temperature_2m_max?.[0],
          minTemp: data?.daily?.temperature_2m_min?.[0],
          rainProbability: data?.daily?.precipitation_probability_max?.[0],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lng]);

  const maxTemp =
    metrics.maxTemperatureC ??
    weatherData?.maxTemp ??
    weatherData?.maxTemperature ??
    daily?.maxTemp;
  const minTemp =
    metrics.minTemperatureC ??
    weatherData?.minTemp ??
    weatherData?.minTemperature ??
    daily?.minTemp;
  const rainProbability =
    metrics.precipitationProbability ??
    weatherData?.rainProbability ??
    weatherData?.precipitationProbability ??
    daily?.rainProbability;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>{t('Weather Forecast on')}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        <View style={[styles.badge, !isSafe && { backgroundColor: status === 'yellow' ? '#F59E0B' : '#EF4444' }]}>
          <Text style={styles.badgeText}>{isSafe ? t('Safe to Fly') : status === 'yellow' ? t('Caution') : t('Unsafe')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Location */}
      <View style={styles.locationRow}>
        <Text style={styles.location}>{forecast || 'Nashik'}</Text>
      </View>

      {/* 1. The Weather Stats (28°C, Cloud, Wind, Humidity) */}
      <View style={styles.weatherCardWrapper}>
        <WeatherCard weather={{ temperature, maxTemp, minTemp, windSpeed, humidity, rainProbability, summary: forecast }} />
      </View>

      {/* 2. The Safe Text */}
      <Text style={styles.safeText}>
        {isSafe ? t('Weather Forecast is Safe for Flying') : status === 'yellow' ? t('Marginal conditions — proceed with caution') : t('Weather conditions are not suitable for flying')}
      </Text>

      {/* 3. The Radar Image */}
      <Image
        source={require('../assets/images/radar.png')}
        style={styles.radar}
        resizeMode="contain"
      />

      {/* 4. Last Checked Text */}
      <Text style={styles.lastChecked}>
        {t('Last checked · {{status}}', { status: weatherData ? t('Live') : t('2 min ago') })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 24, // Added bottom padding so "Last checked" breathes
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 13,
    //color: '#6B7280',
    color: '#2F3542',
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
  },
  badge: {
    backgroundColor: '#D1FAE5', // Light green
    borderWidth: 1,
    borderColor: '#10B981', // Solid green border
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#065F46', // Dark green
    fontWeight: '600',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  location: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  weatherCardWrapper: {
    marginHorizontal: -10, 
  },
  safeText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  radar: {
    width: 40, 
    height: 40,
    alignSelf: 'center',
    marginTop: 16,
  },
  lastChecked: {
    textAlign: 'center',
    color: '#9CA3AF', // Lighter grey text
    fontSize: 12,
    marginTop: 12,
  },
});

export default WeatherSummaryCard;