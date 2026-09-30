import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, Text, useWindowDimensions, Platform, Dimensions } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import HomeHeader from '../components/HomeHeader';
import WeatherCard from '../components/WeatherCard';
import ActiveBookingCard from '../components/ActiveBookingCard';
import UpcomingBookingsSection, { UpcomingBookingCard } from '../components/UpcomingBookingsSection';
import ServiceSelection from '../components/ServiceSelection';
import ExploreRoles from '../components/ExploreRoles';
import PopularProducts from '../components/PopularProducts';
import PromoCard from '../../pilotModule/components/PromoCard';
import ReferAndEarnCard from '../../components/ReferAndEarnCard';
import SupportCard from '../components/SupportCard';

import COLORS from '../constants/colors';
import DEMO_PRODUCTS from '../constants/demoProducts';
import { customerApi, getSession } from '../../utils/api';
import NotificationHistory from '../../common/NotificationHistory';
import { useUnreadNotifications } from '../../common/useUnreadNotifications';
import { useLanguage } from '../../i18n';
import { getCityDistrictLocation } from '../../utils/locationFormat';
import { isUpcomingBooking } from '../../utils/bookingFormat';
import { isActiveBooking, markExpiredBookingsLocal } from '../../utils/bookingLifecycle';

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

const mockPromos = [1, 2, 3];

const HomeScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && windowWidth > 600;
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { unreadCount, refresh: refreshUnread } = useUnreadNotifications(true);

  // Derived location from routeParams (after updating from UpdateLocationScreen) or user profile
  const currentLocation = routeParams?.updatedLocation || user?.profileData?.location || user?.location || null;
  const rawAddress =
    routeParams?.updatedAddress ||
    user?.profileData?.address ||
    user?.address ||
    user?.profileData?.region ||
    user?.profileData?.state ||
    '';
  const locationAddress = getCityDistrictLocation(rawAddress);

  const fetchWeatherForLocation = useCallback(async (lat, lng) => {
    setWeatherLoading(true);
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const weatherRes = await fetch(openMeteoUrl);
      const weatherData = await weatherRes.json();

      if (weatherData) {
        const current = weatherData.current;
        const daily = weatherData.daily;
        const weatherCode = current?.weather_code;
        setWeather({
          summary: WEATHER_CODE_MAP[weatherCode] || (weatherCode !== undefined ? `Weather code ${weatherCode}` : 'Weather available'),
          currentTemp: current?.temperature_2m,
          maxTemp: daily?.temperature_2m_max?.[0],
          minTemp: daily?.temperature_2m_min?.[0],
          windSpeed: current?.wind_speed_10m,
          humidity: current?.relative_humidity_2m,
          rainProbability: daily?.precipitation_probability_max?.[0],
        });
      }
    } catch (weatherError) {
      console.error('Open-Meteo fetch failed, trying backend', weatherError);
      try {
        const weatherResponse = await customerApi
          .checkWeather({ latitude: lat, longitude: lng })
          .catch(() => null);

        if (weatherResponse) {
          setWeather({
            summary: weatherResponse.summary || weatherResponse.status || 'Weather available',
            currentTemp: weatherResponse.temperature ?? weatherResponse.current?.temperature,
            maxTemp: weatherResponse.maxTemperature ?? weatherResponse.forecast?.maxTemperature,
            minTemp: weatherResponse.minTemperature ?? weatherResponse.forecast?.minTemperature,
            windSpeed: weatherResponse.windSpeed ?? weatherResponse.current?.windSpeed,
            humidity: weatherResponse.humidity ?? weatherResponse.current?.humidity,
            rainProbability:
              weatherResponse.rainProbability ??
              weatherResponse.current?.rainProbability ??
              weatherResponse.precipitationProbability,
          });
        }
      } catch (err2) {
        console.error('Backend weather also failed', err2);
      }
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadHomeData = async () => {
      setBookingsLoading(true);
      setProductsLoading(true);
      setWeatherLoading(true);
      try {
        const session = await getSession();
        const currentUser = await customerApi.getCurrentUser().catch(() => session?.user);
        if (currentUser) {
          setUser(currentUser);
        }

        const [bookingResponse, productResponse] = await Promise.all([
          customerApi.getBookings({ limit: 20 }).catch(() => ({ items: [] })),
          customerApi.getProducts().catch(() => []),
        ]);

        const bookingItems = bookingResponse?.items || bookingResponse?.data || [];
        // Display-only reconciliation for expired bookings (date passed without
        // approval/completion/assignment/start). Actual cancellation + 100%
        // refund is owned by the backend expiry cron; the client must not call
        // the user cancel endpoint for expiries (tiered policy yields ₹0).
        setBookings(markExpiredBookingsLocal(bookingItems).bookings);
        setBookingsLoading(false);
        const apiItems = Array.isArray(productResponse) ? productResponse : [];
        const items = apiItems.length ? apiItems : DEMO_PRODUCTS;
        setProducts(items.slice(0, 5));
        setProductsLoading(false);

        // Determine location: first from routeParams (from UpdateLocationScreen), then user's stored data, then fallback
        const storedLoc = currentUser?.profileData?.location || currentUser?.location;
        let lat, lng;

        if (routeParams?.updatedLocation?.lat && routeParams?.updatedLocation?.lng) {
          lat = routeParams.updatedLocation.lat;
          lng = routeParams.updatedLocation.lng;
        } else if (storedLoc?.lat && storedLoc?.lng) {
          lat = storedLoc.lat;
          lng = storedLoc.lng;
        } else {
          // Fallback default
          lat = 19.9975;
          lng = 73.7898;
        }

        await fetchWeatherForLocation(lat, lng);
      } catch (error) {
        console.error('Failed to load customer home data', error);
      } finally {
        setWeatherLoading(false);
        setBookingsLoading(false);
        setProductsLoading(false);
      }
    };

    loadHomeData();
  }, [fetchWeatherForLocation, routeParams?.updatedLocation, routeParams?.updatedLocation?.lat, routeParams?.updatedLocation?.lng]);

  const handleLocationPress = useCallback(() => {
    onNavigate('UpdateLocationScreen', {
      currentLocation,
      currentAddress: locationAddress,
    });
  }, [onNavigate, currentLocation, locationAddress]);

  // Active = approved AND scheduled service date is TODAY. Everything else
  // (except cancelled/completed) is upcoming.
  const activeBookings = useMemo(
    () => bookings.filter((item) => isActiveBooking(item)),
    [bookings],
  );

  const upcomingBookings = useMemo(
    () => (Array.isArray(bookings) ? bookings.filter((b) => isUpcomingBooking(b)) : []),
    [bookings],
  );

  const hasBookings = activeBookings.length > 0 || upcomingBookings.length > 0;

  const CARD_GAP = 16;
  const SIDE_PADDING = 20;
  const IS_WEB = Platform.OS === 'web';
  const MAX_CARD_WIDTH = 420;
  const totalCardsCount = activeBookings.length + upcomingBookings.length;
  const visibleArea = Math.min(windowWidth, 800) - SIDE_PADDING * 2;
  const visibleCards = totalCardsCount === 1 ? 1 : 1.1;
  let bookingCardWidth = Math.round((visibleArea - CARD_GAP * (visibleCards - 1)) / visibleCards);
  if (IS_WEB || windowWidth > 600) {
    bookingCardWidth = Math.min(bookingCardWidth, MAX_CARD_WIDTH);
  }

  const handleServiceSelect = useCallback(
    (serviceTitle) => onNavigate('ServiceBookingScreen', { service: serviceTitle }),
    [onNavigate],
  );

  return (
    <ScreenContainer backgroundColor={COLORS.white}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HomeHeader
          userName={user?.name || user?.profileData?.displayName || t('Customer')}
          locationText={locationAddress || t('Location unavailable')}
          location={currentLocation}
          weather={weather}
          onLocationPress={handleLocationPress}
          onNotification={() => setNotificationsVisible(true)}
          photoUrl={user?.profileData?.photoUrl || user?.profilePhoto || user?.photoUrl || null}
          unreadCount={unreadCount}
        />
        <WeatherCard weather={weather} loading={weatherLoading} />
        {hasBookings && (
          <View style={styles.promoSection}>
            <Text style={styles.promoSectionTitle}>
              {activeBookings.length > 0 && upcomingBookings.length > 0
                ? t('Bookings')
                : activeBookings.length > 0
                ? t('Active Bookings')
                : t('Upcoming Bookings')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: SIDE_PADDING, paddingRight: 4 }}
            >
              {activeBookings.map((booking) => (
                <View key={`active-${booking.id}`} style={{ width: bookingCardWidth, marginRight: CARD_GAP }}>
                  <ActiveBookingCard
                    booking={booking}
                    loading={bookingsLoading}
                    showHeading={false}
                    onPress={() => onNavigate('BookingDetailsScreen', { bookingId: booking.id })}
                  />
                </View>
              ))}
              {upcomingBookings.map((booking) => (
                <UpcomingBookingCard
                  key={`upcoming-${booking.id}`}
                  booking={booking}
                  width={bookingCardWidth}
                  onSelectBooking={(b) => onNavigate('BookingDetailsScreen', { bookingId: b.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}
        <ServiceSelection
          selectedService=""
          setSelectedService={handleServiceSelect}
        />
        {/*<ExploreRoles onNavigate={onNavigate} />*/}
        
        <PopularProducts
          products={products}
          loading={productsLoading}
          onViewAll={() => onNavigate('Marketplace')}
          onSelectProduct={(product) => onNavigate('ProductDetailsScreen', { product })}
        />
        <View style={styles.promoSection}>
          <Text style={styles.promoSectionTitle}>{t('Promotions & Offers')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
          >
            <ReferAndEarnCard layout="carousel" onPress={() => onNavigate('ReferAndEarnScreen')} />
            {mockPromos.map((_, index) => (
              <PromoCard key={index} layout="carousel" />
            ))}
          </ScrollView>
        </View>
        <SupportCard onNavigate={onNavigate} />
      </ScrollView>
      <NotificationHistory visible={notificationsVisible} onClose={() => { setNotificationsVisible(false); refreshUnread(); }} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    //paddingTop: 12,
    gap: 22,
    paddingBottom: 86
  },
  activeBookingSection: {
    //paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeading: {
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
  },
  carouselContent: {
    //gap: 10,
    paddingLeft:20,
    paddingRight:4
  },
  promoSection: {
    //paddingBottom: 4,
    gap: 10,
  },
  promoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    paddingHorizontal: 20,
  },
});

export default HomeScreen;
