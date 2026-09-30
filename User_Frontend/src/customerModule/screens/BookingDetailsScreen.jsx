import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';

import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import ScreenContainer from '../components/ScreenContainer';
import BookingStatusCard from '../components/BookingStatusCard';
import PersonalDetailsCard from '../components/PersonalDetailsCard';
import ServiceDetailsCard from '../components/ServiceDetailsCard';
import WeatherSummaryCard from '../components/WeatherSummaryCard';
import FlyingRestrictionSummaryCard from '../components/FlyingRestrictionSummaryCard';
import CancellationChanceCard from '../components/CancellationChanceCard';
import PricingBreakdownCard from '../components/PricingBreakdownCard';
import PilotTrackingCard from '../components/PilotTrackingCard';
import RatePilotCard from '../components/RatePilotCard';
import DeliverablesCard from '../components/DeliverablesCard';
import SupportCard from '../components/SupportCard';
import DashedDivider from '../components/DashedDivider';
import PrimaryButton from '../components/PrimaryButton';
import COLORS from '../constants/colors';
import { customerApi, chatApi } from '../../utils/api';
import { connectSocket, joinBookingRoom, leaveBookingRoom, joinConversationRoom } from '../../utils/socket';
import { useLanguage, useDynamicText } from '../../i18n';
import { formatBookingDateTime, resolveBookingLocationLabel } from '../../utils/bookingFormat';
import { useTabBarPadding } from '../../utils/responsive';

const TRACKING_REFRESH_MS = 5000;

const stageData = {
  1: { currentStep: 0, title: 'Assigning Fleet Manager', description: 'We are currently finding a vendor (drone owner) for you...' },
  2: { currentStep: 1, title: 'Assigning Pilot', description: 'A Fleet Manager has been assigned...' },
  3: { currentStep: 1, title: 'Pilot Assigned', description: 'A Drone Pilot has been assigned...' },
  4: { currentStep: 2, title: 'Pilot Coming', description: 'Your pilot is on the way...' },
  5: { currentStep: 3, title: 'Service Started', description: 'The spraying operation has started...' },
  6: { currentStep: 4, title: 'Service Ended', description: 'The pilot has successfully finished the service.' },
  7: { currentStep: 4, title: 'Service Ended', description: '...' },
};

const BookingDetailsScreen = ({ onNavigate, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [booking, setBooking] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [progress, setProgress] = useState(null);
  const [weather, setWeather] = useState(null);
  const [restrictions, setRestrictions] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [stage, setStage] = useState(1);
  const socketRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const cancelReasonText = useDynamicText(booking?.cancellationReason || '');

  const loadBookingData = useCallback(async () => {
    const bookingId = routeParams?.bookingId;
    if (!bookingId) return;
    try {
      const [bookingData, metadataData, progressData, weatherData, restrictionsData, trackingData] = await Promise.all([
        customerApi.getBooking(bookingId).catch(() => null),
        customerApi.getBookingMetadata(bookingId).catch(() => null),
        customerApi.getBookingProgress(bookingId).catch(() => null),
        customerApi.getBookingWeather(bookingId).catch(() => null),
        customerApi.getBookingRestrictions(bookingId).catch(() => null),
        customerApi.getBookingTracking(bookingId).catch(() => null),
      ]);
      if (bookingData) setBooking(bookingData);
      if (metadataData) setMetadata(metadataData);
      if (progressData) setProgress(progressData);
      if (weatherData) setWeather(weatherData);
      if (restrictionsData) setRestrictions(restrictionsData);
      if (trackingData) setTracking(trackingData);
      if (bookingData) setStage(bookingData.stage || 1);
    } catch (error) {
      console.error('Failed to load booking details', error);
    }
  }, [routeParams?.bookingId]);

  useEffect(() => {
    loadBookingData();
  }, [loadBookingData]);

  useEffect(() => {
    const bookingId = routeParams?.bookingId;
    if (!bookingId) return;
    const isActive = booking?.status === 'in_progress' || booking?.status === 'confirmed';
    if (isActive) {
      trackingIntervalRef.current = setInterval(() => {
        customerApi.getBookingTracking(bookingId).then(setTracking).catch(() => {});
      }, TRACKING_REFRESH_MS);
    }
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [routeParams?.bookingId, booking?.status]);

  useEffect(() => {
    const bookingId = routeParams?.bookingId;
    if (!bookingId) return;
    const initSocket = async () => {
      const sock = await connectSocket();
      if (sock) {
        socketRef.current = sock;
        joinBookingRoom(bookingId);
        sock.on('booking:status', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('booking:admin-approved', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('booking:admin-rejected', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('booking:admin-assignment-changed', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('booking:assigned', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('booking:cancelled', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('mission:started', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        sock.on('mission:completed', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
        // ⭐ Live pilot location broadcast (sent by the pilot app every 5s)
        sock.on('mission:location', (data) => {
          if (data.bookingId === bookingId && data.lat != null && data.lng != null) {
            setTracking((prev) => ({
              ...prev,
              pilotLocation: {
                lat: data.lat,
                lng: data.lng,
                timestamp: data.timestamp,
              },
            }));
          }
        });
        sock.on('payment:confirmed', (data) => {
          if (data.bookingId === bookingId) loadBookingData();
        });
      }
    };
    initSocket();
    return () => {
      if (bookingId) leaveBookingRoom(bookingId);
    };
  }, [routeParams?.bookingId, loadBookingData]);

  const derivedStage = useMemo(() => {
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
  }, [booking]);

  const effectiveStage = Math.max(stage, derivedStage);

  const stageInfo = stageData[effectiveStage] || stageData[1];
  const isMapping = booking?.serviceType === 'mapping';
  const isPending = booking?.status === 'pending' && booking?.adminApprovalStatus === 'pending';
  const isApproved = booking?.adminApprovalStatus === 'approved';
  const isRejected = booking?.adminApprovalStatus === 'rejected';
  const isCancelled = booking?.status === 'cancelled';
  const isAwaitingAssignment = booking?.status === 'confirmed' && !booking?.assignedPilot;
  const hasPilot = !!booking?.assignedPilot;
  const isMissionActive = booking?.status === 'in_progress' && booking?.actualStartTime;
  const isCompleted = booking?.status === 'completed';
  const canCancelByCustomer = booking?.status === 'pending' || booking?.status === 'confirmed';
  const isInProgress = booking?.status === 'in_progress';
  const paymentPending = booking?.paymentStatus === 'pending';
  const paymentPaid = booking?.paymentStatus === 'paid';
  const cashPending = booking?.cashPending === true;

  const handleOpenChat = useCallback(async () => {
    if (!booking?.assignedPilot) return;
    try {
      const conversation = await chatApi.createConversation({
        participantUid: booking.assignedPilot,
        participantRole: 'pilot',
        bookingId: booking.id,
        type: 'customer_pilot',
      });
      onNavigate('ChatScreen', { conversationId: conversation.id, bookingId: booking.id });
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [booking, onNavigate]);

  const handlePayNow = useCallback(() => {
    if (!booking?.id) return;
    onNavigate('PaymentSelectionScreen', {
      mode: 'service',
      bookingId: booking.id,
      booking,
      total: booking?.finalPrice || booking?.priceEstimation || 0,
    });
  }, [booking, onNavigate]);

  const handleBookAgain = useCallback(() => {
    onNavigate('FarmLocationScreen', {});
  }, [onNavigate]);

  const handleRaiseComplaint = useCallback(() => {
    onNavigate('NewComplaintFormScreen', { bookingId: booking?.id });
  }, [booking, onNavigate]);

  const handleCancelBooking = useCallback(() => {
    if (!booking?.id) return;
    const cancel = async () => {
      try {
        await customerApi.cancelBooking(booking.id, 'Cancelled by customer');
        if (Platform.OS === 'web') {
          window.alert(t('Booking Cancelled'));
        } else {
          Alert.alert(
            t('Booking Cancelled'),
            t('Your booking has been cancelled successfully.'),
          );
        }
        loadBookingData();
      } catch (error) {
        const message = error?.message || t('Could not cancel the booking. Please try again.');
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert(
            t('Cancellation Failed'),
            message,
          );
        }
      }
    };

    // react-native-web's Alert.alert is a no-op, so on web we use a native
    // confirm dialog instead — otherwise the cancel feature silently does
    // nothing in the browser.
    if (Platform.OS === 'web') {
      if (window.confirm(t('Are you sure you want to cancel this booking?'))) {
        cancel();
      }
      return;
    }

    Alert.alert(
      t('Cancel Booking'),
      t('Are you sure you want to cancel this booking?'),
      [
        { text: t('No'), style: 'cancel' },
        { text: t('Yes, Cancel'), style: 'destructive', onPress: cancel },
      ],
    );
  }, [booking, loadBookingData, t]);

  const pilotName = booking?.assignedPilotName || 'Pilot';

  if (!booking) {
    return (
      <ScreenContainer backgroundColor="#FAFAFA">
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Booking Details')}</Text>
        </View>
        <Text style={styles.loadingText}>{t('Loading...')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Booking Details')}</Text>
        </View>

        {isPending && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{t('Awaiting Admin Approval')}</Text>
          </View>
        )}

        {isRejected && (
          <View style={[styles.statusBanner, styles.rejectedBanner]}>
            <Text style={styles.statusBannerText}>
              {t('Booking Rejected: {{reason}}', { reason: cancelReasonText || t('Rejected by admin') })}
            </Text>
          </View>
        )}

        {isApproved && isAwaitingAssignment && (
          <View style={[styles.statusBanner, styles.approvedBanner]}>
            <Text style={styles.statusBannerText}>{t('Booking Approved — Awaiting Assignment')}</Text>
          </View>
        )}

        {isCancelled && !isRejected && (
          <View style={[styles.statusBanner, styles.rejectedBanner]}>
            <Text style={styles.statusBannerText}>{t('Booking Cancelled')}</Text>
          </View>
        )}

        {effectiveStage <= 5 && (
          <>
            <BookingStatusCard
              currentStep={stageInfo.currentStep}
              title={t(stageInfo.title)}
              description={t(stageInfo.description)}
              showPilotInfo={effectiveStage >= 3 && hasPilot}
              pilotName={pilotName}
              onMessagePress={handleOpenChat}
            />
            <DashedDivider />
            {effectiveStage >= 4 && hasPilot && (
              <>
                <PilotTrackingCard
                  title={t('Pilot Tracking')}
                  description={t("Track your pilot's real-time location")}
                  customerLocation={booking?.location || tracking?.location}
                  pilotLocation={tracking?.pilotLocation}
                  customerAddress={booking?.address}
                  pilotName={pilotName}
                />
                <DashedDivider />
              </>
            )}
            <PersonalDetailsCard
              customerName={booking?.customerName || metadata?.name || booking?.metadata?.name}
              customerPhone={booking?.customerPhone || metadata?.phone || booking?.metadata?.phone}
              customerEmail={booking?.customerEmail || metadata?.email || booking?.metadata?.email}
            />
            <ServiceDetailsCard
              isMapping={isMapping}
              stage={effectiveStage}
              booking={booking}
              service={{
                bookingId: booking?.bookingNumber || booking?.id,
                type: booking?.serviceType || metadata?.serviceType || booking?.metadata?.serviceType,
                subType: booking?.serviceDetails?.sprayingSubType || booking?.serviceDetails?.mappingType || booking?.serviceDetails?.seedingSubType || booking?.serviceDetails?.monitoringSubType || booking?.serviceDetails?.surveillanceType || booking?.serviceDetails?.videographyType || booking?.serviceDetails?.eventType || metadata?.subServiceType,
                infraType: booking?.serviceDetails?.mappingInfrastructure || booking?.serviceDetails?.surveillanceInfrastructure || metadata?.infrastructureType,
                locationLabel: resolveBookingLocationLabel(booking),
                location: booking?.address || metadata?.address || booking?.metadata?.address,
                date: booking?.scheduledDate || metadata?.scheduledDate,
                dateTime: formatBookingDateTime(booking?.scheduledDate, booking?.scheduledStartTime, locale),
                timeSlot: booking?.scheduledStartTime ? new Date(booking.scheduledStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : metadata?.scheduledTime,
                cropType: booking?.cropType || metadata?.cropType,
                landArea: booking?.area?.value != null ? `${booking.area.value} ${booking.area.unit}` : metadata?.landArea || '--',
                drawnLandArea: booking?.area?.value != null ? `${booking.area.value} ${booking.area.unit}` : metadata?.drawnLandArea || '--',
                estimatedServiceTime: metadata?.estimatedServiceTime || '--',
                serviceTime: booking?.actualDuration ? `${booking.actualDuration} min` : metadata?.actualServiceTime || '--',
                serviceDetails: booking?.serviceDetails,
              }}
            />
            <DashedDivider />
            <WeatherSummaryCard weatherData={weather} serviceDate={booking?.scheduledDate} />
            <DashedDivider />
            <FlyingRestrictionSummaryCard restrictions={restrictions} />
            <DashedDivider />
            <CancellationChanceCard cancellationChance={metadata?.cancellationChance} />
            <DashedDivider />
            <PricingBreakdownCard
              paymentStatus={paymentPaid ? 'Payment Completed' : paymentPending ? 'Payment Pending' : effectiveStage >= 6 ? 'Payment Completed' : 'Payment Pending'}
              pricing={{
                servicePrice: booking?.priceBreakdown?.baseAmount ?? booking?.priceEstimation ?? 'N/A',
                platformFee: booking?.priceBreakdown?.travelCharges ?? 0,
                gst: booking?.priceBreakdown?.taxAmount ?? booking?.priceBreakdown?.additionalCharges ?? 0,
                total: booking?.priceBreakdown?.totalAmount ?? booking?.finalPrice ?? booking?.priceEstimation ?? 'N/A',
              }}
            />
            <DashedDivider />
          </>
        )}

        {(effectiveStage === 6 || effectiveStage === 7) && (
          <>
            <PricingBreakdownCard
              paymentStatus={effectiveStage === 7 || paymentPaid ? 'Payment Completed' : paymentPending ? 'Payment Pending' : 'Payment Pending'}
              pricing={{
                servicePrice: booking?.priceBreakdown?.baseAmount ?? booking?.priceEstimation ?? 'N/A',
                platformFee: booking?.priceBreakdown?.travelCharges ?? 0,
                gst: booking?.priceBreakdown?.taxAmount ?? booking?.priceBreakdown?.additionalCharges ?? 0,
                total: booking?.priceBreakdown?.totalAmount ?? booking?.finalPrice ?? booking?.priceEstimation ?? 'N/A',
              }}
            />
            <DashedDivider />
            <PersonalDetailsCard
              customerName={booking?.customerName || metadata?.name || booking?.metadata?.name}
              customerPhone={booking?.customerPhone || metadata?.phone || booking?.metadata?.phone}
              customerEmail={booking?.customerEmail || metadata?.email || booking?.metadata?.email}
            />
            <ServiceDetailsCard isMapping={isMapping} stage={effectiveStage} booking={booking} service={{
              bookingId: booking?.bookingNumber || booking?.id,
              type: booking?.serviceType || metadata?.serviceType,
              subType: booking?.serviceDetails?.sprayingSubType || booking?.serviceDetails?.mappingType || booking?.serviceDetails?.monitoringSubType || booking?.serviceDetails?.surveillanceType || booking?.serviceDetails?.videographyType || booking?.serviceDetails?.eventType || metadata?.subServiceType,
              infraType: booking?.serviceDetails?.mappingInfrastructure || metadata?.infrastructureType,
              locationLabel: resolveBookingLocationLabel(booking),
              location: booking?.address || metadata?.address,
              date: booking?.scheduledDate || metadata?.scheduledDate,
              dateTime: formatBookingDateTime(booking?.scheduledDate, booking?.scheduledStartTime, locale),
              timeSlot: booking?.scheduledStartTime ? new Date(booking.scheduledStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : metadata?.scheduledTime,
              cropType: booking?.cropType || metadata?.cropType,
              landArea: booking?.area?.value != null ? `${booking.area.value} ${booking.area.unit}` : metadata?.landArea || '--',
              drawnLandArea: booking?.area?.value != null ? `${booking.area.value} ${booking.area.unit}` : metadata?.drawnLandArea || '--',
              estimatedServiceTime: metadata?.estimatedServiceTime || '--',
              serviceTime: booking?.actualDuration ? `${booking.actualDuration} min` : metadata?.actualServiceTime || '--',
              serviceDetails: booking?.serviceDetails,
            }} />
            {isMapping && effectiveStage === 7 && (
              <>
                <DashedDivider />
                <DeliverablesCard />
              </>
            )}
            {booking?.status === 'completed' && (
              <>
                <DashedDivider />
                <RatePilotCard
                  bookingId={booking?.id}
                  booking={booking}
                  pilotName={pilotName}
                  onRated={loadBookingData}
                />
              </>
            )}
          </>
        )}

        <View style={styles.buttonContainer}>
          {cashPending && (
            <View style={styles.cashPendingBox}>
              <Text style={styles.cashPendingText}>
                {t('Cash payment selected. Please pay the pilot in cash — payment will be confirmed once the pilot receives it.')}
              </Text>
            </View>
          )}
          {effectiveStage <= 5 && !isPending && !isCancelled && !isRejected && !paymentPaid && !cashPending && (
            <PrimaryButton
              title={`₹ ${booking?.finalPrice || booking?.priceEstimation || 0} Pay Now`}
              backgroundColor="#5060D3"
              textColor="#FFFFFF"
              onPress={handlePayNow}
            />
          )}
          {effectiveStage === 6 && !cashPending && (
            <PrimaryButton
              title="₹ Complete Payment"
              backgroundColor="#5060D3"
              textColor="#FFFFFF"
              onPress={handlePayNow}
            />
          )}
          {canCancelByCustomer && !isCancelled && !isRejected && (
            <PrimaryButton
              title={t('Cancel Booking')}
              backgroundColor="#FFFFFF"
              textColor="#DC2626"
              borderWidth={2}
              borderColor="#DC2626"
              onPress={handleCancelBooking}
            />
          )}
          {isInProgress && !isCancelled && !isRejected && (
            <PrimaryButton
              title={t('Request Cancellation')}
              backgroundColor="#FFFFFF"
              textColor="#DC2626"
              borderWidth={2}
              borderColor="#DC2626"
              onPress={handleRaiseComplaint}
            />
          )}
          {effectiveStage === 7 && (
            <>
              <PrimaryButton
                title={t('Book Again')}
                backgroundColor="#5060D3"
                textColor="#FFFFFF"
                onPress={handleBookAgain}
              />
              <View style={styles.buttonSpacer} />
              <PrimaryButton
                title={t('Raise a Complaint')}
                backgroundColor="#FFFFFF"
                textColor="#5060D3"
                borderWidth={2}
                borderColor="#5060D3"
                onPress={handleRaiseComplaint}
              />
            </>
          )}
        </View>

        <SupportCard onNavigate={onNavigate} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  heading: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3542',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6B7280',
  },
  statusBanner: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 8,
  },
  rejectedBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  approvedBanner: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cashPendingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cashPendingText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonSpacer: {
    height: 12,
  },
});

export default BookingDetailsScreen;
