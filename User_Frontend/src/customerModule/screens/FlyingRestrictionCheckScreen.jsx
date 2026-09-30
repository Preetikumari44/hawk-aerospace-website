import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import CheckHeader from '../components/CheckHeader';
import InfoRow from '../components/InfoRow';
import SuccessCard from '../components/SuccessCard';
import { aggregatorApi, customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const FlyingRestrictionCheckScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [isChecking, setIsChecking] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const runCheck = async () => {
      try {
        const isAggregatorFlow = !!routeParams?.customerUid;
        const payload = {
          latitude: routeParams?.location?.lat || 28.4595,
          longitude: routeParams?.location?.lng || 77.0266,
          serviceType: routeParams?.serviceType || 'spraying',
        };
        const response = isAggregatorFlow
          ? await aggregatorApi.checkRestrictions(payload)
          : await customerApi.checkRestrictions(payload);
        setResult(response);
      } catch (error) {
        console.error('Flying restriction check failed', error);
      } finally {
        setIsChecking(false);
      }
    };

    runCheck();
  }, [routeParams]);

  useEffect(() => {
    if (!isChecking) {
      const timer = setTimeout(() => {
        onNavigate('WeatherForecastCheckScreen', {
          ...routeParams,
          restrictionResult: result,
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isChecking, onNavigate, result, routeParams]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={[styles.mainContent, { paddingBottom: tabBarPadding }]}>
        <CheckHeader
          title={t('Checking Flying Restrictions')}
          date={routeParams?.scheduledDate || new Date().toISOString()}
          location={routeParams?.address || t('Selected booking location')}
        />

        <View style={styles.radarWrapper}>
          <Image source={require('../assets/images/radar.png')} style={styles.radar} resizeMode="contain" />
        </View>

        {!isChecking && (
          <View style={styles.cardWrapper}>
            <SuccessCard
              title={result?.zone ? `${result.zone}` : t('Check Complete')}
              description={t(result?.status || result?.summary || 'Flying restriction check completed')}
            />
          </View>
        )}

        <View style={styles.infoContainer}>
          <InfoRow title={t('Airspace Class')} value={isChecking ? '-' : result?.airspaceClass || result?.classification || '-'} />
          <InfoRow title={t('Zone Type')} value={isChecking ? '-' : result?.zoneType || result?.zone || '-'} />
          <InfoRow title={t('Nearest Airport')} value={isChecking ? '-' : result?.nearestAirport || '-'} />
          <InfoRow title={t('Max Altitude')} value={isChecking ? '-' : result?.maxAltitude || '-'} />
          <InfoRow title={t('Active NOTAMs')} value={isChecking ? '-' : result?.activeNotams || '-'} />
          <InfoRow title={t('Zone Details')} value={isChecking ? '-' : result?.message || result?.status || '-'} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  mainContent: { flex: 1 },
  radarWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
  radar: { width: 180, height: 180, maxHeight: '100%' },
  cardWrapper: { marginBottom: 12 },
  infoContainer: { marginBottom: 10 },
});

export default FlyingRestrictionCheckScreen;
