import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import AvatarIcon from '../assets/Icons_V02/Icons/AvatarProfile.svg';
import { useLanguage } from '../../i18n';

const getNextStepCopy = (booking) => {
  if (booking?.assignedPilot) {
    return {
      status: 'Assigned',
      title: 'Pilot Assigned',
      description: 'Your booking has a pilot assigned and is moving toward execution.',
      chipStyle: styles.statusChipAssigned,
      textStyle: styles.statusTextAssigned,
    };
  }

  if (booking?.fleetManagerUid) {
    return {
      status: 'Assigned',
      title: 'Fleet Manager Assigned',
      description: 'A fleet manager has been assigned and pilot/drone allocation is in progress.',
      chipStyle: styles.statusChipAssigned,
      textStyle: styles.statusTextAssigned,
    };
  }

  if (booking?.status === 'confirmed') {
    return {
      status: 'Confirmed',
      title: 'Preparing Mission',
      description: 'Your booking is confirmed and the operations team is preparing the mission.',
      chipStyle: styles.statusChipAssigned,
      textStyle: styles.statusTextAssigned,
    };
  }

  if (booking?.status === 'cancelled') {
    return {
      status: 'Cancelled',
      title: 'Booking Cancelled',
      description: 'This booking has been cancelled and no further assignment will happen.',
      chipStyle: styles.statusChipCancelled,
      textStyle: styles.statusTextCancelled,
    };
  }

  return {
    status: 'Pending',
    title: 'Assigning Fleet Manager',
    description: 'A drone owner will be assigned to your booking shortly.',
    chipStyle: styles.statusChipPending,
    textStyle: styles.statusTextPending,
  };
};

const NextStepCard = ({ booking }) => {
  const { t, locale } = useLanguage();
  const nextStep = getNextStepCopy(booking);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('NEXT STEPS')}</Text>
        <View style={[styles.statusChipBase, nextStep.chipStyle]}>
          <Text style={[styles.statusTextBase, nextStep.textStyle]}>{t(nextStep.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <AvatarIcon width={55} height={55} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t(nextStep.title)}</Text>
          <Text style={styles.description}>{t(nextStep.description)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    color: '#B9BDF3',
    fontSize: 14,
    fontWeight: '700',
  },
  statusChipBase: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
  },
  statusChipPending: {
    backgroundColor: '#FFF0C7',
  },
  statusChipAssigned: {
    backgroundColor: '#CFF6D8',
  },
  statusChipCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusTextBase: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#FF8A00',
  },
  statusTextAssigned: {
    color: '#0A8A44',
  },
  statusTextCancelled: {
    color: '#B42318',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default NextStepCard;
