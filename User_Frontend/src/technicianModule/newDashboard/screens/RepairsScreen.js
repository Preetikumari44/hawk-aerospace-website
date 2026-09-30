import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import CalendarCard from '../components/CalendarCard';
import ScheduleStatus from '../components/ScheduleStatus';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { scheduleStatusLegend } from '../data/dashboardData';
import { incomingRequestsCount, getTicketsForDate } from '../data/ticketData';

const TABS = ['Active', 'Upcoming', 'Completed'];

export default function RepairsScreen() {
  const [tab, setTab] = useState('Active');
  const [selectedDate, setSelectedDate] = useState(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  const dayTickets = selectedDate ? getTicketsForDate(selectedDate) : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Your Tickets</Text>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionHeader title={`Incoming Requests (${String(incomingRequestsCount).padStart(2, '0')})`} actionLabel="View All" />
      <EmptyState message={`No ${tab.toLowerCase()} tickets to show right now.`} icon="🗂" />

      <View style={{ height: spacing.lg }} />

      <View style={[styles.scheduleRow, isMobile && styles.scheduleRowMobile]}>
        <View style={isMobile ? styles.calendarColMobile : styles.calendarCol}>
          <CalendarCard onSelectDate={setSelectedDate} />
          <ScheduleStatus legend={scheduleStatusLegend} />
        </View>

        <View style={isMobile ? styles.sideColMobile : styles.sideCol}>
          <SectionHeader title="Tickets for the Day" />
          {dayTickets.length === 0 ? (
            <EmptyState message="No tickets scheduled for this day." icon="🗓" />
          ) : (
            dayTickets.map((t) => (
              <View key={t.id} style={styles.dayTicket}>
                <Text style={styles.dayTicketTitle}>{t.title}</Text>
                <Text style={styles.dayTicketMeta}>{t.meta}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', marginBottom: spacing.lg, flexWrap: 'wrap' },
  tab: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    marginRight: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  tabText: { ...typography.bodyMedium, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  scheduleRow: { flexDirection: 'row' },
  scheduleRowMobile: { flexDirection: 'column' },
  calendarCol: { flex: 1.4, marginRight: spacing.lg },
  calendarColMobile: { marginBottom: spacing.lg },
  sideCol: { flex: 1 },
  sideColMobile: {},
  dayTicket: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  dayTicketTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  dayTicketMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
