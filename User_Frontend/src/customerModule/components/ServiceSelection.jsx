import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import ServiceCard from './ServiceCard';
import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

const services = [
  { id: 4, title: 'Videography', image: require('../assets/images/DroneVideographyIcon.png') },
  { id: 1, title: 'Spraying', image: require('../assets/images/DroneSprayingIcon.png') },
  { id: 2, title: 'Mapping', image: require('../assets/images/DroneMappingIcon.png') },
  { id: 3, title: 'Surveillance', image: require('../assets/images/DroneSurveillanceIcon.png') },
];

const ServiceSelection = ({ selectedService, setSelectedService }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Choose Service')}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingRight: 40 }}
      >
        {services.map(service => (
          <ServiceCard
            key={service.id}
            title={t(service.title)}
            // image={require('../assets/images/service_drone.png')}
            image={service.image}
            selected={selectedService === service.title}
            onPress={() => setSelectedService(service.title)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 20,
    gap: 10, 
  },
  heading: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    color: '#2F3542',
    fontWeight: '700',
  },
});

export default ServiceSelection;