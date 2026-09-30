import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppProvider } from './context/AppContext';
import { useBreakpoint } from './hooks/useBreakpoint';
import Header from './components/Header';
import TechnicianSidebar from './components/TechnicianSidebar';
import MobileDrawer from './components/MobileDrawer';
import TechnicianHome from './screens/TechnicianHome';

type Props = {
  onNavigate?: (screen: string) => void;
  currentRoute?: string;
};

function DashboardShell({ onNavigate, currentRoute = 'Home' }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  const goTo = (route: string) => {
    if (route === 'Home') {
      onNavigate?.('Home');
      return;
    }
    onNavigate?.(route);
  };

  return (
    <View style={styles.root}>
      <Header
        activeNav={currentRoute === 'Marketplace' ? 'Marketplace' : undefined}
        currentRoute={currentRoute}
        onNavPress={(item: string) => item === 'Marketplace' && goTo('Marketplace')}
        onOpenProfile={() => goTo('Profile')}
        onMenuPress={() => setDrawerOpen(true)}
      />
      <View style={styles.body}>
        {!isMobile ? (
          <TechnicianSidebar
            active={['Home', 'Repairs', 'Earnings'].includes(currentRoute) ? currentRoute : 'Home'}
            onSelect={goTo}
            collapsed={isTablet}
          />
        ) : null}
        <View style={styles.content}>
          <TechnicianHome navigation={{ navigate: goTo }} />
        </View>
      </View>
      {isMobile ? (
        <MobileDrawer
          visible={drawerOpen}
          active={currentRoute}
          onClose={() => setDrawerOpen(false)}
          onSelect={goTo}
        />
      ) : null}
    </View>
  );
}

export default function TechnicianDashboard(props: Props) {
  return (
    <AppProvider>
      <DashboardShell {...props} />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F8F6' },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, backgroundColor: '#F5F8F6' },
});
