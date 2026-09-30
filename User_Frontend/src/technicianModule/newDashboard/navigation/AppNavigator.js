import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Header from '../components/Header';
import TechnicianSidebar from '../components/TechnicianSidebar';
import MobileDrawer from '../components/MobileDrawer';
import TechnicianHome from '../screens/TechnicianHome';
import RepairsScreen from '../screens/RepairsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CartScreen from '../screens/CartScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';

const Stack = createNativeStackNavigator();

// Exported so Header/TechnicianSidebar/MobileDrawer (which sit alongside
// the Stack.Navigator, not inside a screen) can trigger navigation
// without prop-drilling a navigation object down through every screen.
export const navigationRef = createNavigationContainerRef();

function getActiveRouteName(state) {
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
}

// ONE shared shell for Android, iOS and the web build (react-native-web
// renders the same tree in a browser). "Home" is not a sidebar item, but
// it is the default screen on launch. Repairs and Earnings are the ONLY
// sidebar entries; Marketplace lives in the header; Profile/Cart/
// OrderHistory are reachable only from the header profile area /
// marketplace icons, never from the sidebar.
//
// Responsive chrome, all keyed off the same useBreakpoint() as every
// screen's own internal layout:
//   desktop (>=1024) — full sidebar, full header nav row
//   tablet  (768-1023) — icon-only collapsed sidebar, full header nav row
//   mobile  (<768) — no persistent sidebar; a hamburger button in the
//                    header opens MobileDrawer instead
export default function AppNavigator() {
  const [activeRoute, setActiveRoute] = useState('Home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  const sidebarActive = ['Home', 'Repairs', 'Earnings'].includes(activeRoute) ? activeRoute : null;
  const headerActiveNav = activeRoute === 'Marketplace' ? 'Marketplace' : null;

  const goTo = (routeName) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(routeName);
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        if (state) setActiveRoute(getActiveRouteName(state));
      }}
    >
      <View style={styles.root}>
        <Header
          activeNav={headerActiveNav}
          currentRoute={activeRoute}
          onNavPress={(item) => {
            if (item === 'Marketplace') goTo('Marketplace');
            // Solutions / Technology / Platforms have no dedicated route
            // yet; header stays functional without breaking the shell.
          }}
          onOpenProfile={() => goTo('Profile')}
          onMenuPress={() => setDrawerOpen(true)}
        />
        <View style={styles.body}>
          {!isMobile ? (
            <TechnicianSidebar active={sidebarActive} onSelect={goTo} collapsed={isTablet} />
          ) : null}
          <View style={styles.content}>
            <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home" component={TechnicianHome} />
              <Stack.Screen name="Repairs" component={RepairsScreen} />
              <Stack.Screen name="Earnings" component={EarningsScreen} />
              <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
            </Stack.Navigator>
          </View>
        </View>

        {isMobile ? (
          <MobileDrawer
            visible={drawerOpen}
            active={activeRoute}
            onClose={() => setDrawerOpen(false)}
            onSelect={goTo}
          />
        ) : null}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, backgroundColor: colors.background },
});
