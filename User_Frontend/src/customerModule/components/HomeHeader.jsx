import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import AvatarIcon from '../assets/Icons_V02/Icons/AvatarProfile.svg';
import NotificationIcon from '../assets/Icons_V02/Icons/NotificationIconIdle.svg';
import MoreOptionsIcon from '../assets/Icons_V02/Icons/3DotsIcon.svg';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';
import { useLocationLabel } from '../../common/useLocationLabel';
import NotificationBadge from '../../common/NotificationBadge';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const COUNTRIES = ['India', 'IN', 'Bharat'];

const WEATHER_CODE_MAP = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

const getWeatherIcon = (code, summary) => {
  const text = (summary || '').toLowerCase();
  if (code === 0 || code === 1 || /clear|sunny/.test(text)) return 'wb-sunny';
  if (/thunder|storm/.test(text)) return 'thunderstorm';
  if (/fog/.test(text)) return 'foggy';
  if (/rain|drizzle|shower/.test(text)) return 'rainy';
  if (/snow/.test(text)) return 'ac-unit';
  if (code === 2 || code === 3 || /cloud/.test(text)) return 'wb-cloudy';
  return 'cloud';
};

const HomeHeader = ({
  userName = '',
  locationText = '',
  location = null,
  weather = null,
  onLocationPress,
  onNotification,
  photoUrl = null,
  unreadCount = 0,
}) => {
  const { t } = useLanguage();
  const [headerWeather, setHeaderWeather] = useState(weather);
  const [weatherLoading, setWeatherLoading] = useState(Boolean(location && !weather));

  useEffect(() => {
    if (weather) {
      setHeaderWeather(weather);
      return;
    }
    if (!location?.lat || !location?.lng) return;
    let cancelled = false;
    setWeatherLoading(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const current = data?.current;
        const code = current?.weather_code;
        setHeaderWeather({
          summary: WEATHER_CODE_MAP[code] || (code !== undefined ? `Weather code ${code}` : 'Weather available'),
          currentTemp: current?.temperature_2m,
        });
      })
      .catch(() => {
        if (!cancelled) setHeaderWeather(null);
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lng, weather]);

  // Locality label: stored place names render immediately; stored "lat, lng"
  // pairs (or missing addresses) are reverse-geocoded from coordinates.
  // Raw coordinates are never displayed.
  const displayLocation = useLocationLabel({ address: locationText, location });
  const showWeather = headerWeather && headerWeather.currentTemp != null;
  const weatherIcon = showWeather
    ? getWeatherIcon(null, headerWeather.summary)
    : 'wb-cloudy';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <AvatarIcon width={30} height={30} />
            )}
          </View>
          <Text style={styles.userName} numberOfLines={1}>{userName || t('Customer')}</Text>
        </View>

        <View style={styles.iconSection}>
          <Pressable onPress={onNotification} hitSlop={10} style={styles.notificationPressable}>
            <NotificationIcon width={26} height={26} />
            <NotificationBadge count={unreadCount} />
          </Pressable>
          <MoreOptionsIcon width={26} height={26} />
        </View>
      </View>

      <Pressable onPress={onLocationPress} style={styles.locationSection}>
        <View style={styles.locationTextContainer}>
          <Text style={styles.locationLabel}>{t('Location')}</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {displayLocation || t('Location unavailable')}
          </Text>
        </View>

        {/*{weatherLoading ? (
          <ActivityIndicator size="small" color="#5060D3" />
        ) : showWeather ? (
          <View style={styles.weatherChip}>
            <MaterialIcons name={weatherIcon} size={16} color="#F5A623" />
            <Text style={styles.weatherTemp}>{Math.round(headerWeather.currentTemp)}°C</Text>
          </View>
        ) : null}*/}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10, // Spaces top row and location natively
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    color: '#2F3542',
  },
  iconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationPressable: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationTextContainer: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    ...TYPOGRAPHY.labelMedium,
    color: '#6B7280',
  },
  locationText: {
    ...TYPOGRAPHY.bodyLargeEmphasized,
    color: '#2F3542',
    marginTop: 2,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E3EA',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weatherTemp: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#374151',
  },
});

export default HomeHeader;