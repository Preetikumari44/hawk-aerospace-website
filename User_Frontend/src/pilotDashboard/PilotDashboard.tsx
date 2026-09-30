import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, Platform } from 'react-native';
import AppShell from './navigation/AppShell';
import { ScreenKey } from './navigation/navConfig';
import NotificationPanel from './components/NotificationPanel';
import HomeScreen from './screens/Home/HomeScreen';
import MissionsScreen from './screens/Missions/MissionsScreen';
import MissionDetailsScreen from './screens/MissionDetails/MissionDetailsScreen';
import EarningsScreen from './screens/Earnings/EarningsScreen';
import AddPayoutMethodScreen from './screens/Payout/AddPayoutMethodScreen';
import MarketplaceScreen from './screens/Marketplace/MarketplaceScreen';
import AccountScreen from './screens/Account/AccountScreen';
import { pilotService } from './services/pilotService';
import { Pilot, Mission, AppNotification } from './types';
import { colors } from './theme/colors';

interface Props {
  initialScreen?: string;
  onSwitchRole?: (role: string) => void;
}

const toScreenKey = (value?: string): ScreenKey => {
  if (value === 'Missions' || value === 'Earnings' || value === 'Marketplace' || value === 'Account') return value;
  return 'Home';
};

const PilotDashboard: React.FC<Props> = ({ initialScreen, onSwitchRole }) => {
  const [screen, setScreen] = useState<ScreenKey>(toScreenKey(initialScreen));
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => setScreen(toScreenKey(initialScreen)), [initialScreen]);

  useEffect(() => {
    let mounted = true;
    Promise.all([pilotService.getProfile(), pilotService.getNotifications()]).then(([profile, notes]) => {
      if (!mounted) return;
      setPilot(profile);
      setNotifications(notes);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const navigate = (key: ScreenKey) => setScreen(key);
  const openMissionDetails = (mission: Mission) => {
    setSelectedMission(mission);
    setScreen('MissionDetails');
  };
  const unreadCount = notifications.filter((n) => !n.read).length;

  let content: React.ReactNode;
  switch (screen) {
    case 'Missions': content = <MissionsScreen onOpenMissionDetails={openMissionDetails} />; break;
    case 'MissionDetails': content = <MissionDetailsScreen mission={selectedMission} onBack={() => setScreen('Missions')} />; break;
    case 'Earnings': content = <EarningsScreen onOpenPayout={() => setScreen('Payout')} />; break;
    case 'Payout': content = <AddPayoutMethodScreen onBack={() => setScreen('Earnings')} onSaved={() => setScreen('Earnings')} />; break;
    case 'Marketplace': content = <MarketplaceScreen />; break;
    case 'Account': content = <AccountScreen pilot={pilot} />; break;
    case 'Home':
    default:
      content = <HomeScreen pilot={pilot} onUpdatePilot={setPilot} onOpenMarketplace={() => setScreen('Marketplace')} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" backgroundColor={colors.creamBackground} />}
      <AppShell
        active={screen}
        onNavigate={navigate}
        pilot={pilot}
        unreadCount={unreadCount}
        onPressNotifications={() => setNotifOpen(true)}
        onPressAccount={() => setScreen('Account')}
        onSwitchRole={onSwitchRole}
      >
        {content}
      </AppShell>
      <NotificationPanel visible={notifOpen} notifications={notifications} onClose={() => setNotifOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: colors.creamBackground } });
export default PilotDashboard;
