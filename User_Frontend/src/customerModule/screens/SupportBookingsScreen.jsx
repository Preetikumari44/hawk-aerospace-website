import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BackIcon from '../assets/images/ArrowBackwardIcon.svg';
import { customerApi, chatApi } from '../../utils/api';
import { formatBookingDate } from '../../utils/bookingFormat';
import { useLanguage } from '../../i18n';

const normalizeBookings = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const SupportBookingsScreen = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    customerApi
      .getBookings({ limit: 50 })
      .then((response) => setBookings(normalizeBookings(response)))
      .catch((error) => console.error('Failed to load bookings for support', error))
      .finally(() => setLoading(false));
  }, []);

  const openBookingChat = useCallback(async (booking) => {
    try {
      setOpeningId(booking.id);
      const conversation = await chatApi.createConversation({
        participantUid: 'admin',
        participantRole: 'admin',
        type: 'support',
        supportCategory: 'booking',
        bookingId: booking.id,
      });
      if (conversation?.id) {
        onNavigate('ChatScreen', {
          conversationId: conversation.id,
          type: 'support',
          supportCategory: 'booking',
          refId: booking.id,
          refTitle: booking.serviceType || booking.title || 'Drone Service',
        });
      } else {
        Alert.alert(t('Error'), t('Could not start support chat. Please try again.'));
      }
    } catch (error) {
      console.error('[SupportBookings] Failed to open chat:', error);
      Alert.alert(t('Error'), t('Could not reach support right now. Please try again.'));
    } finally {
      setOpeningId(null);
    }
  }, [onNavigate, t]);

  const renderItem = ({ item }) => (
    <Pressable style={styles.card} onPress={() => openBookingChat(item)}>
      <View style={styles.textWrap}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.serviceType || item.title || t('Drone Service')}
        </Text>
        <Text style={styles.cardId}>ID: #{item.id}</Text>
        <Text style={styles.cardDate}>{formatBookingDate(item.scheduledDate || item.createdAt, locale)}</Text>
      </View>
      {openingId === item.id ? (
        <ActivityIndicator size="small" color="#5060D3" />
      ) : (
        <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')} style={styles.backButton}>
          <BackIcon width={22} height={22} color="#4B5563" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('Select a booking')}</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#5060D3" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{t('No bookings found')}</Text>
              <Text style={styles.emptySub}>{t('Your bookings will appear here.')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { paddingRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginLeft: 4 },
  content: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 12 },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  cardId: { fontSize: 13, fontWeight: '600', color: '#5060D3', marginTop: 4 },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});

export default SupportBookingsScreen;
