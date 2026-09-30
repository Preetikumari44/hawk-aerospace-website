import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ScreenContainer from '../components/ScreenContainer';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const complaintTypes = [
  { title: 'Booking or Scheduling Issue', desc: 'A problem with your confirmed, pending, or upcoming booking' },
  { title: 'Service Not Delivered', desc: "Your drone service didn't happen as planned" },
  { title: 'Incomplete or Poor Service', desc: "The service happened but didn't meet expectations" },
  { title: 'Payment or Billing Problem', desc: 'An incorrect charge, failed payment, or missing refund' },
  { title: 'Cancellation & Refund Request', desc: 'You want to cancel and get your money back' },
  { title: 'Safety Incident or Accident', desc: 'Damage, injury, or unsafe behaviour during a flight' },
  { title: 'Pilot or Operator Conduct', desc: 'Concerns about how your pilot behaved or communicated' },
  { title: 'Privacy or Data Concern', desc: 'Footage or data was captured, shared, or stored without your consent' },
  { title: 'App or Technical Issue', desc: 'A bug, crash, or error in the Hawk Aerosystem app' },
  { title: 'Something Else', desc: "My issue doesn't fit any of the above" },
];

const SelectComplaintTypeScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          {/* <MaterialIcons name="arrow-back" size={28} color="#2F3542" /> */}
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Select Complaint Type')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        {complaintTypes.map((item, index) => (
          <Pressable 
            key={index} 
            style={styles.itemRow}
            onPress={() => onNavigate('Back')} // In a real app, this would pass the selected data back
          >
            <Text style={styles.itemTitle}>{t(item.title)}</Text>
            <Text style={styles.itemDesc}>{t(item.desc)}</Text>
            <View style={styles.dashedDivider} />
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  heading: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '500',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  itemRow: {
    paddingTop: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F3542',
  },
  itemDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
});

export default SelectComplaintTypeScreen;