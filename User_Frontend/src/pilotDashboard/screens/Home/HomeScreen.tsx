import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/ui';
import DataState from '../../components/DataState';
import OverviewCard from '../../components/OverviewCard';
import FleetManagerCard from '../../components/FleetManagerCard';
import AvailabilityToggle from '../../components/AvailabilityToggle';
import MyTeamsSection from '../../components/MyTeamsSection';
import PromoCard from '../../components/PromoCard';
import ProductMiniCard from '../../components/ProductMiniCard';
import { useAsync } from '../../hooks/useAsync';
import { pilotService } from '../../services/pilotService';
import { Pilot } from '../../types';

interface HomeScreenProps {
  pilot: Pilot | null;
  onUpdatePilot: (pilot: Pilot) => void;
  onOpenMarketplace: () => void;
}

// Mission details (Active/Assigned/etc.) intentionally live on the Missions
// screen only — Home stays a clean, compact overview. See MissionsScreen.

const HomeScreen: React.FC<HomeScreenProps> = ({ pilot, onUpdatePilot, onOpenMarketplace }) => {
  const assigned = useAsync(() => pilotService.getAssignedMissions(), []);
  const completed = useAsync(() => pilotService.getCompletedMissions(), []);
  const fleetManagers = useAsync(() => pilotService.getFleetManagers(), []);
  const suggested = useAsync(() => pilotService.getSuggestedFleetManagers(), []);
  const teams = useAsync(() => pilotService.getTeamRequests(), []);
  const earnings = useAsync(() => pilotService.getEarningsSummary(), []);
  const promotions = useAsync(() => pilotService.getPromotions(), []);
  const products = useAsync(() => pilotService.getMarketplaceProducts(), []);

  const [busyToggle, setBusyToggle] = useState(false);

  const handleToggleAvailability = async () => {
    if (!pilot) return;
    setBusyToggle(true);
    const next = pilot.availability === 'active' ? 'offDuty' : 'active';
    try {
      const updated = await pilotService.updateAvailability(next);
      onUpdatePilot(updated);
    } finally {
      setBusyToggle(false);
    }
  };

  return (
    <Screen>
      {/* Welcome / status row */}
      <View style={styles.profileRow}>
        <View style={styles.profileLeft}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{(pilot?.name || 'P').charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.pilotName}>{pilot?.name || 'Pilot'}</Text>
          </View>
        </View>
        {pilot && (
          <AvailabilityToggle status={pilot.availability} onToggle={busyToggle ? () => {} : handleToggleAvailability} />
        )}
      </View>

      {/* Statistics — compact horizontal row */}
      <View style={styles.overviewGrid}>
        <DataState state={earnings} emptyTitle="No earnings yet">
          {(data) => <OverviewCard label="Total Earnings" value={`${data.currency}${data.totalEarnings.toLocaleString()}`} tone="dark" compact />}
        </DataState>
        <DataState state={completed} isEmpty={(d) => d.length === 0} emptyTitle="0">
          {(data) => <OverviewCard label="Completed Missions" value={String(data.length)} compact />}
        </DataState>
        <DataState state={assigned} isEmpty={(d) => d.length === 0} emptyTitle="0">
          {(data) => <OverviewCard label="Upcoming Missions" value={String(data.length)} compact />}
        </DataState>
        <OverviewCard label="Rejected Missions" value="0" compact />
      </View>

      {/* Promotions & Offers — small compact cards */}
      <SectionHeader title="Promotions & Offers" style={styles.sectionSpacing} />
      <DataState state={promotions} isEmpty={(d) => d.length === 0} emptyTitle="No offers right now">
        {(data) => (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollTight}>
            {data.map((o) => (
              <PromoCard key={o.id} offer={o} />
            ))}
          </ScrollView>
        )}
      </DataState>

      {/* Popular Products — now full-width after the Support card moved to the sidebar */}
      <SectionHeader title="Popular Products" action="View All" onAction={onOpenMarketplace} style={styles.sectionSpacing} />
      <DataState state={products} isEmpty={(d) => d.length === 0} emptyTitle="No products available">
        {(data) => (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollTight}>
            {data.slice(0, 6).map((p) => (
              <ProductMiniCard key={p.id} product={p} />
            ))}
          </ScrollView>
        )}
      </DataState>

      {/* Fleet Managers + Suggested Fleet Managers — side by side */}
      <View style={styles.splitRow}>
        <View style={styles.splitMain}>
          <SectionHeader title={`Fleet Managers (${fleetManagers.data?.length ?? 0}/3)`} />
          <DataState state={fleetManagers} isEmpty={(d) => d.length === 0} emptyTitle="No fleet managers yet">
            {(data) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollTight}>
                {data.map((m) => (
                  <FleetManagerCard key={m.id} manager={m} compact />
                ))}
              </ScrollView>
            )}
          </DataState>
        </View>
        <View style={styles.splitSide}>
          <SectionHeader title="Suggested" />
          {!!suggested.data?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollTight}>
              {suggested.data.map((m) => (
                <FleetManagerCard key={m.id} manager={m} compact />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyInline}>None right now</Text>
          )}
        </View>
      </View>

      {/* My Teams — compact tabbed card */}
      <SectionHeader title="My Teams" style={styles.sectionSpacing} />
      <DataState state={teams} emptyTitle="No team activity">
        {(data) => (
          <MyTeamsSection
            suggested={suggested.data || []}
            pending={data.pending}
            invites={data.invites}
            onAcceptInvite={() => teams.reload()}
            onRejectInvite={() => teams.reload()}
            onWithdraw={() => teams.reload()}
            compact
          />
        )}
      </DataState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarLg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: { ...typography.bodyMedium, color: colors.mintGreen },
  greeting: { ...typography.caption, color: colors.textSecondary, textTransform: 'none' },
  pilotName: { ...typography.h3, color: colors.textPrimary },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  // Two-column smart layout: a wide "main" column and a narrower "side"
  // column sitting next to it on desktop, wrapping to a single stacked
  // column on narrower viewports.
  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  splitMain: { flexGrow: 3, flexBasis: 480, minWidth: 300 },
  splitSide: { flexGrow: 1, flexBasis: 220, minWidth: 200 },
  sectionSpacing: { marginTop: spacing.xs },
  hScrollTight: { gap: spacing.sm, paddingBottom: spacing.xs, paddingRight: spacing.md },
  emptyInline: { ...typography.small, color: colors.textMuted },
});

export default HomeScreen;

