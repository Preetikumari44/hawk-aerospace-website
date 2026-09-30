import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Pressable } from 'react-native';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import MissionsIconInactive from '../../assets/Missions-Inactive.svg';
import Locationpin from '../../assets/location-pin.svg';
import { useLanguage } from '../../i18n';
import TYPOGRAPHY from '../constants/typography';
import { compactAddressOmitStatePincode, formatBookingDate, formatBookingTime, resolveBookingLocationLabel } from '../../utils/bookingFormat';

const formatTitle = (booking) => {
  const subtype = booking?.serviceDetails?.sprayingSubType;

  if (subtype) {
    return String(subtype)
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  if (booking?.serviceType) {
    return String(booking.serviceType)
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return 'No Active Booking';
};

const getScheduleParts = (scheduledDate, locale) => {
  if (!scheduledDate) {
    return { time: '--:-- --', date: 'Date pending' };
  }

  const date = new Date(scheduledDate);
  if (Number.isNaN(date.getTime())) {
    return { time: '--:-- --', date: 'Date pending' };
  }

  return {
    time: formatBookingTime(date, locale) || '--:-- --',
    date: formatBookingDate(date, locale) || 'Date pending',
  };
};

const getLocationLabel = (booking) => {
  const full = resolveBookingLocationLabel(booking);
  return compactAddressOmitStatePincode(full);
};

const stageData = {
  1: { currentStep: 0, title: 'Assigning Fleet Manager' },
  2: { currentStep: 1, title: 'Assigning Pilot' },
  3: { currentStep: 1, title: 'Pilot Assigned' },
  4: { currentStep: 2, title: 'Pilot Coming' },
  5: { currentStep: 3, title: 'Service Started' },
  6: { currentStep: 4, title: 'Service Ended' },
  7: { currentStep: 4, title: 'Service Ended' },
};

const deriveStage = (booking) => {
  const s = booking?.status;
  const aS = booking?.adminApprovalStatus;
  const hasFM = !!booking?.fleetManagerUid;
  const hasPilot = !!booking?.assignedPilot;
  const hasDrone = !!booking?.assignedDrone;
  const hasStarted = s === 'in_progress' || booking?.actualStartTime;
  const hasEnded = s === 'completed' || booking?.actualEndTime;

  if (hasEnded) return booking?.paymentStatus === 'paid' ? 7 : 6;
  if (hasStarted) return 5;
  if (hasPilot && hasDrone && hasFM) return 4;
  if (hasPilot && hasDrone) return 3;
  if (s === 'confirmed' && aS === 'approved') return 2;
  if (aS === 'pending' || aS === 'rejected') return 1;
  return 1;
};

const ActiveBookingCard = ({ booking, onPress, loading, showHeading = true }) => {
  const { t, locale } = useLanguage();
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: '#E5E7EB', minHeight: 120, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#5060D3" />
          <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 12 }}>{t('Loading bookings...')}</Text>
        </View>
      </View>
    );
  }

  if (!booking) {
    return null;
  }

  const schedule = getScheduleParts(booking?.scheduledDate, locale);
  const effectiveStage = deriveStage(booking);
  const stageInfo = stageData[effectiveStage] || stageData[1];
  const currentStep = stageInfo.currentStep;
  const steps = new Array(5).fill(null);

  return (
    <View style={styles.container}>
      {showHeading && <Text style={styles.heading} >{t('Active Bookings')}</Text>}
      <Pressable onPress={onPress} style={styles.pressableCard}>
        <CrossPlatformGradient colors={['#4F63D8', '#262F73']} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{t(formatTitle(booking))}</Text>
            <Text style={styles.bookingIdText}>ID: {booking.id}</Text>
            <Pressable style={styles.detailButton} onPress={onPress}>
              <Text style={styles.detailButtonText}>{t('View Details')}</Text>
            </Pressable>
          </View>

          <View style={styles.gridRow}>
            <View style={[styles.infoBox, styles.timeBox]}>
              <Text style={styles.infoLabel}>{t('Time: ')}</Text>
              <Text style={styles.infoValue}>{schedule.time}</Text>
            </View>
            <View style={[styles.infoBox, styles.dateBox]}>
              <Text style={styles.infoLabel}>{t('Date: ')}</Text>
              <Text style={styles.dateValue}>{t(schedule.date)}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Locationpin width={14} height={14} />
            <Text style={styles.locationText} numberOfLines={1}>{t(getLocationLabel(booking))}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusHeading}>{t('Booking Status')}</Text>
            <Text style={styles.statusValue}>: {t(stageInfo.title)}</Text>
          </View>

          <View style={styles.progressRow}>
            {steps.map((_, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <View
                    style={[
                      styles.progressLine,
                      index <= currentStep && styles.progressLineActive,
                    ]}
                  />
                )}
                <View style={index === currentStep ? styles.activeNode : styles.node}>
                  {index === currentStep ? (
                    <MissionsIconInactive
                      width={16}
                      height={16}
                    />
                  ) : null}
                </View>
              </React.Fragment>
            ))}
          </View>

        </CrossPlatformGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    //paddingRight: 20,
    
  },
  pressableCard: {
    width: '100%',
  },
  heading: {
    ...TYPOGRAPHY.titleLargeEmphasized,
    color: '#2F3542',
    fontWeight: 'bold',
    paddingBottom: 8,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    minHeight: 220,
    justifyContent:'space-between'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
  bookingIdText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    //marginBottom: 8,
    flex: 0,
    //lineHeight: 2,
  },
  detailButton: {
    //minWidth: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  infoBox: {
    //borderRadius: 14,
    //backgroundColor: 'rgba(27, 27, 33, 0.16)',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  timeBox: {
    //flex: 1.7,
    alignItems: 'center',
    //paddingHorizontal: 12,
    //paddingVertical: 8,
  },
  dateBox: {
    //flex: 1,
    alignItems: 'center',
    //paddingHorizontal: 12,
    //paddingVertical: 8,
  },
  infoLabel: {
    color: '#F4F0E8',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 1,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    //marginRight: 15
  },
  dateValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
  },
  locationText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  statusHeading: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(168, 168, 168, 0.85)',
  },
  progressLineActive: {
    backgroundColor: 'rgba(205, 205, 205, 0.95)',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8D9099',
  },
  activeNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});

export default ActiveBookingCard;
