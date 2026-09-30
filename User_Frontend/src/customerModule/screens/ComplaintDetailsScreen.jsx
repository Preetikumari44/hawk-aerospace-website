import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const DetailRow = ({ label, value, isGreen = false }) => {
  const { t, locale } = useLanguage();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isGreen && styles.greenValue]}>{value || t('Not available')}</Text>
    </View>
  );
};

const ComplaintDetailsScreen = ({ onNavigate, routeParams, onSwitchRole }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [complaint, setComplaint] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const complaintId = routeParams?.complaintId;
    if (!complaintId) {
      return;
    }

    customerApi
      .getComplaint(complaintId)
      .then(async (response) => {
        setComplaint(response);
        if (response?.relatedEntityId) {
          const bookingData = await customerApi.getBooking(response.relatedEntityId).catch(() => null);
          setBooking(bookingData);
        }
      })
      .catch((error) => console.error('Failed to load complaint details', error));
  }, [routeParams?.complaintId]);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('ComplaintHistoryScreen')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Complaint Details')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <Text style={styles.sectionTitle}>{t('Ticket Details')}</Text>
        <DetailRow label={t('Ticket Status')} value={t(complaint?.status)} isGreen={complaint?.status === 'RESOLVED' || complaint?.status === 'CLOSED'} />
        <DetailRow label={t('Complaint ID')} value={complaint?.complaintId} />
        <DetailRow label={t('Complaint Type')} value={t(complaint?.type)} />
        <DetailRow label={t('Complaint Description')} value={complaint?.description} />
        <DetailRow label={t('Related Entity Type')} value={t(complaint?.relatedEntityType)} />
        <DetailRow label={t('Related Entity ID')} value={complaint?.relatedEntityId} />
        <DetailRow label={t('Created At')} value={complaint?.createdAt ? new Date(complaint.createdAt).toLocaleString(locale) : null} />
        <DetailRow label={t('Resolution')} value={complaint?.resolution} />

        <View style={styles.dashedDivider} />

        <Text style={styles.sectionTitle}>{t('Booking Details')}</Text>
        <DetailRow label={t('Booking ID')} value={booking?.id || complaint?.relatedEntityId} />
        <DetailRow label={t('Location')} value={booking?.address?.line1 || booking?.address} />
        <DetailRow label={t('Date & Time')} value={booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleString(locale) : null} />
        <DetailRow label={t('Service')} value={t(booking?.serviceType)} />
        <DetailRow label={t('Crop Type')} value={t(booking?.cropType)} />
        <DetailRow label={t('Farm Area')} value={booking?.area ? `${booking.area.value} ${booking.area.unit}` : null} />
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
  heading: { marginLeft: 16, fontSize: 20, fontWeight: '500', color: '#2F3542' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12, marginTop: 8 },
  detailRow: { marginBottom: 12 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700', color: '#374151', lineHeight: 20 },
  greenValue: { color: '#10B981' },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginVertical: 20,
  },
});

export default ComplaintDetailsScreen;
