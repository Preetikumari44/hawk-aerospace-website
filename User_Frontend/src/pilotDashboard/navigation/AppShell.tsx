import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { useResponsive } from '../hooks/useResponsive';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import BottomNav from './BottomNav';
import TopHeader from './TopHeader';
import CommonHeader, { COMMON_HEADER_HEIGHT } from './CommonHeader';
import CommonFooter from './CommonFooter';
import TopoBackground from '../components/TopoBackground';
import { ScreenKey } from './navConfig';
import { Pilot } from '../types';

interface AppShellProps {
  active: ScreenKey;
  onNavigate: (key: ScreenKey) => void;
  pilot: Pilot | null;
  unreadCount?: number;
  onPressNotifications?: () => void;
  onPressAccount?: () => void;
  onSwitchRole?: (role: string) => void;
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ active, onNavigate, pilot, unreadCount, onPressNotifications, onPressAccount, onSwitchRole, children }) => {
  const { isDesktop } = useResponsive();

  return (
    <View style={styles.root}>
      {/* Common Hawk Aerospace platform header — shared style with
          SkyMap/Customer/Fleet Manager/Sales Aggregator. Fixed on web so it
          stays above the Pilot-specific header and sidebar. */}
      <CommonHeader onPressMarketplace={() => onNavigate('Marketplace')} onSwitchRole={onSwitchRole} />
      <View style={[styles.contentOffset, Platform.OS === 'web' && styles.contentOffsetWeb]}>
        <TopoBackground />
        <View style={styles.body}>
          {isDesktop && <Sidebar active={active} onNavigate={onNavigate} />}
          <View style={[styles.main, isDesktop && Platform.OS === 'web' && styles.mainWithFixedSidebar]}>
            <TopHeader
              pilot={pilot}
              unreadCount={unreadCount}
              onPressNotifications={onPressNotifications}
              onPressAccount={onPressAccount}
              showSidebarBrand={!isDesktop}
            />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {children}
              <CommonFooter />
            </ScrollView>
          </View>
        </View>
        {!isDesktop && <BottomNav active={active} onNavigate={onNavigate} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamBackground },
  // Pushes the rest of the app below the fixed common header on web; native
  // keeps CommonHeader in normal flex flow so no offset is needed there.
  contentOffset: { flex: 1 },
  contentOffsetWeb: { marginTop: COMMON_HEADER_HEIGHT },
  body: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  // The sidebar is position:fixed on web (see Sidebar.tsx) so it can span
  // the full viewport height below the common header; offset the content
  // by its width so nothing sits underneath it. Native keeps the sidebar
  // in normal flex flow, so no offset is applied there.
  mainWithFixedSidebar: { marginLeft: SIDEBAR_WIDTH },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8, flexGrow: 1 },
});

export default AppShell;
