import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BackIcon from '../assets/images/ArrowBackwardIcon.svg';
import { chatApi } from '../../utils/api';
import { useLanguage } from '../../i18n';

const openTopicChat = async (onNavigate, t, supportCategory) => {
  const conversation = await chatApi.createConversation({
    participantUid: 'admin',
    participantRole: 'admin',
    type: 'support',
    supportCategory,
  });
  if (conversation?.id) {
    onNavigate('ChatScreen', {
      conversationId: conversation.id,
      type: 'support',
      supportCategory,
    });
  } else {
    Alert.alert(t('Error'), t('Could not start support chat. Please try again.'));
  }
};

const SupportOptionsScreen = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(null);

  const handlePress = useCallback(async (key) => {
    if (key === 'booking') {
      onNavigate('SupportBookingsScreen');
      return;
    }
    if (key === 'marketplace') {
      onNavigate('SupportOrdersScreen');
      return;
    }
    try {
      setLoading(key);
      await openTopicChat(onNavigate, t, key);
    } catch (error) {
      console.error('[SupportOptions] Failed to open support chat:', error);
      Alert.alert(t('Error'), t('Could not reach support right now. Please try again.'));
    } finally {
      setLoading(null);
    }
  }, [onNavigate, t]);

  const options = [
    { key: 'booking', icon: 'calendar-month', title: t('Booking / Service related'), subtitle: t('Get help with a specific booking') },
    { key: 'account', icon: 'person-outline', title: t('Account related'), subtitle: t('Profile, login and account help') },
    { key: 'marketplace', icon: 'shopping-bag', title: t('Marketplace order related'), subtitle: t('Get help with a specific order') },
    { key: 'other', icon: 'help-outline', title: t('Other issues'), subtitle: t('Anything else we can help with') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')} style={styles.backButton}>
          <BackIcon width={22} height={22} color="#4B5563" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('What do you need help with?')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {options.map((opt) => (
          <Pressable key={opt.key} style={styles.card} onPress={() => handlePress(opt.key)}>
            <View style={styles.iconWrap}>
              <MaterialIcons name={opt.icon} size={24} color="#5060D3" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{opt.title}</Text>
              <Text style={styles.cardSub}>{opt.subtitle}</Text>
            </View>
            {loading === opt.key ? (
              <ActivityIndicator size="small" color="#5060D3" />
            ) : (
              <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { paddingRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginLeft: 4, flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF0FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});

export default SupportOptionsScreen;
