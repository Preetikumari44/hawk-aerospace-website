import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  RefreshControl, Alert, Platform,
} from 'react-native';
import { fleetApi } from '../utils/api';
import { DesktopPageShell } from '../common/DesktopLayouts';

type Props = { onNavigate?: (screen: string) => void };

const safeArray = (v: any) => Array.isArray(v) ? v : [];

const FleetManagerDashboardReplacement: React.FC<Props> = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [pilots, setPilots] = useState<any[]>([]);
  const [phone, setPhone] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [active, setActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        fleetApi.getDashboard().catch(() => null),
        fleetApi.getPilots().catch(() => []),
      ]);
      setDashboard(d || {});
      setPilots(safeArray(p?.data || p?.pilots || p));
      if (typeof d?.isAvailable === 'boolean') setActive(d.isAvailable);
      else if (typeof d?.availability === 'boolean') setActive(d.availability);
    } catch {
      // Keep the dashboard usable even when the API is temporarily unavailable.
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const mission = dashboard?.missionOverview || dashboard?.missions || dashboard || {};
  const pilotData = dashboard?.pilotOverview || dashboard?.pilotsOverview || {};
  const totalEarnings = dashboard?.totalEarnings ?? dashboard?.earnings ?? mission?.totalEarnings ?? 0;
  const completed = dashboard?.completedMissions ?? mission?.completedMissions ?? mission?.completed ?? 0;
  const upcoming = dashboard?.upcomingMissions ?? mission?.upcomingMissions ?? mission?.upcoming ?? 0;
  const rejected = dashboard?.rejectedMissions ?? mission?.rejectedMissions ?? mission?.rejected ?? 0;

  const counts = useMemo(() => ({
    total: pilotData.total ?? pilots.length,
    assigned: pilotData.assigned ?? pilots.filter(p => String(p?.status).toLowerCase() === 'assigned').length,
    available: pilotData.available ?? pilots.filter(p => ['available','active'].includes(String(p?.status).toLowerCase())).length,
    offDuty: pilotData.offDuty ?? pilots.filter(p => ['off-duty','off_duty','inactive'].includes(String(p?.status).toLowerCase())).length,
  }), [pilotData, pilots]);

  const availablePilots = pilots.filter(p => ['available','active'].includes(String(p?.status).toLowerCase())).slice(0, 6);

  const toggleAvailability = async () => {
    const next = !active;
    setActive(next);
    try {
      await fleetApi.updateAvailability({ isAvailable: next, available: next });
    } catch {
      setActive(!next);
      Alert.alert('Update failed', 'Could not update fleet manager availability.');
    }
  };

  const invite = async () => {
    if (!phone.trim()) return;
    try {
      // Preserve the existing backend onboarding flow. The verification step
      // can be completed from the existing Add Pilot screen.
      await fleetApi.initiatePilotCreation({ phone: phone.trim() });
      setInviteMsg('Pilot invitation initiated successfully.');
      setPhone('');
    } catch {
      setInviteMsg('Unable to initiate the pilot invitation.');
    }
  };

  const stat = (label: string, value: any, icon: string, tone: 'green'|'blue'|'red'|'dark'='dark') => (
    <View style={[styles.statCard, tone === 'green' && styles.statGreen, tone === 'blue' && styles.statBlue, tone === 'red' && styles.statRed]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const content = (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Welcome back, Fleet Manager</Text>
          <Text style={styles.heroSubtitle}>
            Your fleet is operating at healthy capacity today. {counts.available} pilots are ready for deployment.
          </Text>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.rating}>
            <Text style={styles.ratingLabel}>Team Rating</Text>
            <Text style={styles.ratingValue}>4.7 ★</Text>
          </View>
          <TouchableOpacity onPress={toggleAvailability} style={[styles.activeButton, !active && styles.inactiveButton]}>
            <Text style={styles.activeSmall}>{active ? 'You are Active Full Day' : 'You are Inactive'}</Text>
            <Text style={styles.activeText}>{active ? 'Active' : 'Go Active'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Mission Overview</Text></View>
      <View style={styles.grid}>{stat('Total Earnings', `₹${Number(totalEarnings || 0).toLocaleString('en-IN')}`, '₹', 'green')}
        {stat('Completed Missions', completed, '✓')}
        {stat('Upcoming Missions', upcoming, '◷', 'blue')}
        {stat('Rejected Missions', rejected, '×', 'red')}
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Pilots Overview</Text></View>
      <View style={styles.grid}>{stat('Total Pilots', counts.total, '👥')}
        {stat('Assigned Pilots', counts.assigned, '✓', 'blue')}
        {stat('Available Pilots', counts.available, '✓', 'green')}
        {stat('Off-Duty Pilots', counts.offDuty, '×', 'red')}
      </View>

      <View style={styles.inviteCard}>
        <Text style={styles.cardTitle}>Invite Pilots to Your Team</Text>
        <View style={styles.inviteRow}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Search pilot by phone number"
            placeholderTextColor="#8A98A8"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TouchableOpacity onPress={invite} style={styles.inviteButton}><Text style={styles.inviteText}>Invite</Text></TouchableOpacity>
        </View>
        {!!inviteMsg && <Text style={styles.message}>{inviteMsg}</Text>}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Pilots</Text>
        <TouchableOpacity onPress={() => onNavigate?.('PilotList')}><Text style={styles.link}>View all</Text></TouchableOpacity>
      </View>
      <View style={styles.pilotGrid}>
        {availablePilots.map((p, i) => (
          <View key={String(p?.id || i)} style={styles.pilotCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{String(p?.name || 'P').slice(0,1).toUpperCase()}</Text></View>
            <View style={{flex:1}}>
              <Text style={styles.pilotName}>{p?.name || 'Pilot'}</Text>
              <Text style={styles.pilotMeta}>{p?.phone || p?.serviceTags?.[0] || 'Available for deployment'}</Text>
            </View>
            <View style={styles.availableDot} />
          </View>
        ))}
        {!availablePilots.length && <Text style={styles.empty}>No available pilots returned by the backend.</Text>}
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quick} onPress={() => onNavigate?.('Missions')}><Text style={styles.quickIcon}>✈</Text><Text style={styles.quickText}>Manage Missions</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quick} onPress={() => onNavigate?.('Resources')}><Text style={styles.quickIcon}>▦</Text><Text style={styles.quickText}>Manage Resources</Text></TouchableOpacity>
        <TouchableOpacity style={styles.quick} onPress={() => onNavigate?.('Marketplace')}><Text style={styles.quickIcon}>⌂</Text><Text style={styles.quickText}>Marketplace</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  return Platform.OS === 'web' ? <DesktopPageShell>{content}</DesktopPageShell> : content;
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F7F5' },
  content: { padding: 16, paddingBottom: 32, maxWidth: 1600, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: '#123D31', borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  heroText: { flex: 1, paddingRight: 12 }, heroTitle: { color:'#FFF', fontSize:20, fontWeight:'800' },
  heroSubtitle:{color:'rgba(255,255,255,.72)',fontSize:12,marginTop:5,lineHeight:18},
  heroActions:{flexDirection:'row',alignItems:'center',gap:8}, rating:{backgroundColor:'rgba(255,255,255,.10)',borderRadius:10,paddingHorizontal:14,paddingVertical:8,alignItems:'center'},
  ratingLabel:{color:'rgba(255,255,255,.60)',fontSize:10},ratingValue:{color:'#A9E8C5',fontSize:15,fontWeight:'800',marginTop:2},
  activeButton:{backgroundColor:'#A9E8C5',borderRadius:10,paddingHorizontal:14,paddingVertical:8,alignItems:'center'},inactiveButton:{backgroundColor:'rgba(255,255,255,.10)'},
  activeSmall:{color:'#123D31',fontSize:10,opacity:.7},activeText:{color:'#123D31',fontSize:14,fontWeight:'800',marginTop:2},
  sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8,marginBottom:7},sectionTitle:{fontSize:15,fontWeight:'800',color:'#123D31'},link:{fontSize:12,fontWeight:'700',color:'#177A56'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:8},statCard:{backgroundColor:'#FFF',borderRadius:14,padding:12,minWidth:150,flex:1,borderWidth:1,borderColor:'rgba(18,61,49,.06)',minHeight:90},
  statGreen:{backgroundColor:'#EAF8F0'},statBlue:{backgroundColor:'#EEF5FF'},statRed:{backgroundColor:'#FFF0F0'},statIcon:{fontSize:18,color:'#123D31'},statValue:{fontSize:20,fontWeight:'900',color:'#123D31',marginTop:3},statLabel:{fontSize:11,color:'#62736D',marginTop:2},
  inviteCard:{backgroundColor:'#FFF',borderRadius:14,padding:14,marginTop:6,borderWidth:1,borderColor:'rgba(18,61,49,.06)'},cardTitle:{fontSize:13,fontWeight:'800',color:'#123D31',marginBottom:8},
  inviteRow:{flexDirection:'row',gap:8},input:{flex:1,minHeight:40,borderRadius:10,borderWidth:1,borderColor:'#D6E1DC',paddingHorizontal:12,color:'#123D31',backgroundColor:'#FAFCFB'},inviteButton:{backgroundColor:'#A9E8C5',borderRadius:10,paddingHorizontal:18,justifyContent:'center'},inviteText:{color:'#123D31',fontWeight:'800'},message:{fontSize:11,color:'#567269',marginTop:7},
  pilotGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},pilotCard:{backgroundColor:'#FFF',borderRadius:13,padding:12,flexDirection:'row',alignItems:'center',gap:10,minWidth:260,flex:1,borderWidth:1,borderColor:'rgba(18,61,49,.06)'},avatar:{width:36,height:36,borderRadius:18,backgroundColor:'#DDF3E7',alignItems:'center',justifyContent:'center'},avatarText:{fontWeight:'900',color:'#123D31'},pilotName:{fontSize:13,fontWeight:'800',color:'#123D31'},pilotMeta:{fontSize:10,color:'#71817B',marginTop:2},availableDot:{width:9,height:9,borderRadius:5,backgroundColor:'#31A96D'},empty:{fontSize:12,color:'#71817B',padding:12},
  quickRow:{flexDirection:'row',gap:10,marginTop:14},quick:{flex:1,backgroundColor:'#FFF',borderRadius:13,padding:13,flexDirection:'row',alignItems:'center',gap:9,borderWidth:1,borderColor:'rgba(18,61,49,.06)'},quickIcon:{fontSize:18,color:'#123D31'},quickText:{fontSize:12,fontWeight:'800',color:'#123D31'}
});

export default FleetManagerDashboardReplacement;
