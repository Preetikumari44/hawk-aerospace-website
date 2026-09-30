import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import COLORS from '../constants/colors';
import ScreenContainer from '../components/ScreenContainer';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { customerApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const ComplaintHistoryScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    customerApi
      .getComplaints({ limit: 50 })
      .then((response) => setComplaints(response?.items || []))
      .catch((error) => console.error('Failed to load complaint history', error));
  }, []);

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Account')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Complaint History')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        {complaints.map((item) => (
          <Pressable
            key={item.complaintId}
            style={styles.card}
            onPress={() => onNavigate('ComplaintDetailsScreen', { complaintId: item.complaintId })}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.typeText}>{t(item.type)}</Text>
                <Text style={styles.descText}>{item.description}</Text>
              </View>
              <View style={[styles.badge, item.status === 'OPEN' || item.status === 'IN_PROGRESS' ? styles.badgeActive : styles.badgeCompleted]}>
                <Text style={[styles.badgeText, item.status === 'OPEN' || item.status === 'IN_PROGRESS' ? styles.textActive : styles.textCompleted]}>
                  {t(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t('Ticket Status: ')}</Text>
              <Text style={styles.valueHighlight}>{item.resolution || t(item.status)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Complaint ID: ')}</Text>
              <Text style={styles.value}>{item.complaintId}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Related ID: ')}</Text>
              <Text style={styles.value}>{item.relatedEntityId || t('None')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Date & Time: ')}</Text>
              <Text style={styles.value}>{item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : t('Not available')}</Text>
            </View>
          </Pressable>
        ))}

        {!complaints.length && (
          <View style={styles.card}>
            <Text style={styles.typeText}>{t('No complaints found')}</Text>
            <Text style={styles.descText}>{t('Complaints submitted to the backend will appear here.')}</Text>
          </View>
        )}
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
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  descText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeActive: { borderColor: '#10B981' },
  badgeCompleted: { borderColor: '#6B7280' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  textActive: { color: '#10B981' },
  textCompleted: { color: '#6B7280' },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { fontSize: 14, color: '#6B7280', width: 105 },
  valueHighlight: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2F3542' },
  value: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2F3542' },
});

export default ComplaintHistoryScreen;
