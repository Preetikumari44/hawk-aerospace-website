import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';

import TYPOGRAPHY from '../constants/typography';
import PilotIcon from '../assets/Icons/pilot-icon.svg';
import SalesIcon from '../assets/Icons/sa-icon.svg';
import FleetIcon from '../assets/Icons/fleet-management-icon.svg';
import TechnicianIcon from '../assets/Icons/technician-icon.svg';
import { useLanguage } from '../../i18n';

const roles = [
  {
    id: 'DronePilotApplicationScreen',
    title: 'Drone Pilot',
    icon: PilotIcon,
  },
  {
    id: 'SalesAggregatorApplicationScreen',
    title: 'Sales Aggregator',
    icon: SalesIcon,
  },
  {
    id: 'FleetManagerApplicationScreen',
    title: 'Fleet Manager',
    icon: FleetIcon,
  },
  {
    id: 'TechnicianApplicationScreen',
    title: 'Technician',
    icon: TechnicianIcon,
  },
];

const ExploreRoles = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Explore Other Roles')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {roles.map((role) => {
          const IconComponent = role.icon;
          return (
            <Pressable
              key={role.id}
              style={styles.roleItem}
              onPress={() => onNavigate(role.id)}
            >
              <View style={styles.iconContainer}>
                <IconComponent width={44} height={44} />
              </View>
              <Text style={styles.title}>{t(role.title)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  heading: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  roleItem: {
    alignItems: 'center',
    marginRight: 24,
    width: 100,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});

export default ExploreRoles;
