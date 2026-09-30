import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import StatCard from '../components/StatCard';
import TicketCard from '../components/TicketCard';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import PromotionCard from '../components/PromotionCard';
import { useApp } from '../context/AppContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

import { popularProducts, promotion } from '../data/marketplaceData';

export default function TechnicianHome({ navigation }) {
  const { technician, addToCart, overview, activeTicket, nextTicket, incomingTicketsCount } = useApp();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const displayName = technician.name || 'Technician';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top profile / status */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back, {displayName}</Text>
          <Text style={styles.rating}>Your current rating on the app is {technician.rating}</Text>
        </View>
        {!isMobile ? (
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{technician.status}</Text>
          </View>
        ) : null}
      </View>
      {isMobile ? (
        <View style={styles.statusPillMobile}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{technician.status}</Text>
        </View>
      ) : null}
      <Text style={[styles.statusDescription, isMobile && styles.statusDescriptionMobile]}>
        {technician.statusDescription}
      </Text>

      {/* Overview stat cards — 4-across on desktop/tablet, 2x2 on mobile */}
      <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
        <View style={[styles.statItem, isMobile && styles.statItemMobile]}>
          <StatCard label="Total Earnings" value={`₹${overview.totalEarnings}`} glyph="₹" />
        </View>
        <View style={[styles.statItem, isMobile && styles.statItemMobile]}>
          <StatCard label="Total Repairs" value={overview.totalRepairs} glyph="🔧" />
        </View>
        <View style={[styles.statItem, isMobile && styles.statItemMobile]}>
          <StatCard label="Upcoming Tickets" value={overview.upcomingTickets} glyph="🗓" />
        </View>
        <View style={[styles.statItem, isMobile && styles.statItemMobile]}>
          <StatCard label="Rejected Tickets" value={overview.rejectedTickets} glyph="✕" />
        </View>
      </View>

      {/* Active / Next ticket */}
      <View style={[styles.ticketsRow, isMobile && styles.ticketsRowMobile]}>
        <View style={isMobile ? styles.ticketItemMobile : { flex: 1, marginRight: spacing.md }}>
          <TicketCard title="Active Ticket" ticket={activeTicket} emptyMessage="No active ticket at the moment." />
        </View>
        <View style={isMobile ? styles.ticketItemMobile : { flex: 1 }}>
          <TicketCard title="Next Ticket" ticket={nextTicket} emptyMessage="No upcoming ticket assigned." />
        </View>
      </View>

      {/* Incoming tickets + Popular products */}
      <View style={[styles.midRow, isMobile && styles.midRowMobile]}>
        <View style={isMobile ? styles.midItemMobile : styles.midLeft}>
          <SectionHeader
            title={`Incoming Tickets (${incomingTicketsCount})`}
            actionLabel="View All"
            onAction={() => navigation.navigate('Repairs')}
          />
          <EmptyState message="No incoming tickets right now." icon="🗂" />

          <View style={{ height: spacing.lg }} />

          <SectionHeader title="Popular Products" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {popularProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
            ))}
          </ScrollView>
        </View>

        <View style={isMobile ? styles.midItemMobile : styles.midRight}>
          <PromotionCard promotion={promotion} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mintSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarInitial: { color: colors.forestGreen, fontWeight: '700', fontSize: 16 },
  greeting: { ...typography.h2, color: colors.textPrimary },
  rating: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  statusPillMobile: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: spacing.sm,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.forestGreenDark, marginRight: 6 },
  statusText: { ...typography.bodyMedium, color: colors.forestGreenDark },
  statusDescription: { ...typography.caption, color: colors.textMuted, marginLeft: 56, marginBottom: spacing.lg },
  statusDescriptionMobile: { marginLeft: 0, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', marginBottom: spacing.lg },
  statsRowMobile: { flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem: { flex: 1 },
  statItemMobile: { width: '48%', flex: 0, marginRight: 0, marginBottom: spacing.sm },
  ticketsRow: { flexDirection: 'row', marginBottom: spacing.lg },
  ticketsRowMobile: { flexDirection: 'column' },
  ticketItemMobile: { marginBottom: spacing.md },
  midRow: { flexDirection: 'row' },
  midRowMobile: { flexDirection: 'column' },
  midLeft: { flex: 2, marginRight: spacing.lg },
  midRight: { flex: 1 },
  midItemMobile: { marginBottom: spacing.lg },
});
