import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

import CrossIcon from '../assets/Icons_V02/Icons/CrossIcon.svg';
import { useLanguage } from '../../i18n';

const roles = [
  {
    id: 'DronePilotApplicationScreen', // Matches the screen name for easy onNavigate
    title: 'Drone Pilot',
    description: 'Fly missions, earn per job. Execute drone services for farmers and engineers, complete pre-flight checklists, and get paid directly after every successful flight. The more you fly, the more you earn.',
    image: require('../assets/images/role_drone_pilot.png'), 
    color: '#4F46E5', // Indigo color for the bottom tag
  },
  {
    id: 'SalesAggregatorApplicationScreen',
    title: 'Sales Aggregator',
    description: 'is the bridge between customers and modern drone technology. Register people, book services on their behalf, and earn commission on every booking - all from your phone.',
    image: require('../assets/images/role_drone_pilot.png'), // Replace with actual image later
    color: '#6B7280',
  },
  {
    id: 'FleetManagerApplicationScreen',
    title: 'Fleet Manager',
    description: 'onboards Drones and Pilots. Run your drone business end-to-end. Receive bookings, assign pilots, manage your resources, and track revenue - all in one place. Scale from one drone to a full operation.',
    image: require('../assets/images/role_drone_pilot.png'),
    color: '#6B7280',
  },
  {
    id: 'TechnicianApplicationScreen',
    title: 'Technician',
    description: 'keeps the fleet airworthy. Service drones, log repairs, and manage maintenance tickets so every mission takes off safely and on time.',
    image: require('../assets/images/role_drone_pilot.png'),
    color: '#6B7280',
  }
];

const SwitchRoleModal = ({ visible, onClose, onNavigate }) => {
  const { t, locale } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.bottomSheet}>
          
          <View style={styles.header}>
            <Text style={styles.heading}>{t('Switch Role')}</Text>
            <Pressable onPress={onClose}>
              {/* <MaterialIcons name="close" size={28} color="#4B5563" /> */}
              <CrossIcon width={28} height={28} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {roles.map((role, index) => (
              <Pressable 
                key={index} 
                style={styles.roleCard}
                onPress={() => {
                  onClose(); // Close modal first
                  onNavigate(role.id); // Navigate to specific app form
                }}
              >
                {/* Left Side: Image + Tag */}
                <View style={styles.imageContainer}>
                  <Image source={role.image} style={styles.roleImage} resizeMode="cover" />
                  <View style={[styles.roleTag, { backgroundColor: role.color }]}>
                    <Text style={styles.roleTagText}>{t(role.title)}</Text>
                  </View>
                </View>

                {/* Right Side: Description */}
                <View style={styles.textContainer}>
                  <Text style={styles.description}>
                    <Text style={styles.boldTitle}>{t(role.title)}</Text> {t(role.description)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%', // Takes up most of the screen like Figma
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4F46E5', // Matches the blue text in your figma
  },
  scrollContent: {
    paddingBottom: 40,
  },
  roleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: 110,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  roleImage: {
    width: '100%',
    height: '75%',
  },
  roleTag: {
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  boldTitle: {
    fontWeight: '700',
    color: '#374151',
  }
});

export default SwitchRoleModal;