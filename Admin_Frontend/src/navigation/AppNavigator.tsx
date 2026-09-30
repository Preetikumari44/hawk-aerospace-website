import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerItem } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';

// ------------------------------------------------------
// Import SVG Icons (Relative paths pointing to src/assets/icons)
// ------------------------------------------------------
import DashboardIcon from '../assets/icons/dashboard-icon.svg';
import AdminIcon from '../assets/icons/admin-icon.svg';
import SubAdminsIcon from '../assets/icons/sub-admin-icon.svg'; 
import CustomerIcon from '../assets/icons/customer-icon.svg';
import SalesAggregatorsIcon from '../assets/icons/sa-icon.svg'; 
import PilotsIcon from '../assets/icons/pilot-icon.svg'; 
import FleetManagementIcon from '../assets/icons/fleet-management-icon.svg';
import BookingsIcon from '../assets/icons/bookings-icon.svg';
import RevenueIcon from '../assets/icons/rupee-icon.svg'; 
import MarketplaceIcon from '../assets/icons/marketplace-icon.svg'; 
import TechnicianIcon from '../assets/icons/technician-icon.svg'; 
import ServiceCenterIcon from '../assets/icons/settings.svg'; 
import IncidentsIcon from '../assets/icons/incident-icon.svg'; 
import MessageIcon from '../assets/icons/MessageIcon.svg'; 
import RoleApplicationsIcon from '../assets/icons/BriefcaseIcon.svg'; 

// ------------------------------------------------------
// Import Screens
// ------------------------------------------------------
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AdminManagementScreen from '../screens/AdminManagementScreen';
import StateAdminProfile from '../screens/StateAdminProfile';
import DepartmentAdminProfile from '../screens/DepartmentAdminProfile';
import IncidentDetailScreen from '../screens/IncidentDetailScreen';
import IncidentsManagementScreen from '../screens/IncidentsManagementScreen';
import SalesAggregatorsScreen from '../screens/SalesAggregatorsScreen';
import PilotsScreen from '../screens/PilotsScreen';
import FleetManagementScreen from '../screens/FleetManagementScreen';
import BookingsScreen from '../screens/BookingsScreen';
import RevenueScreen from '../screens/RevenueScreen';
import MarketplaceManagementScreen from '../screens/MarketplaceManagementScreen';
import TechnicianManagementScreen from '../screens/TechnicianManagementScreen';
import ServiceCentreScreen from '../screens/ServiceCentreScreen';
import RoleApplicationsScreen from '../screens/RoleApplicationsScreen';
import ChatScreen from '../screens/ChatScreen';
import SendNotificationScreen from '../screens/SendNotificationScreen';
import CouponManagementScreen from '../screens/CouponManagementScreen';
import ReferralRulesScreen from '../screens/ReferralRulesScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import RefundsScreen from '../screens/RefundsScreen';
import PayoutManagementScreen from '../screens/PayoutManagementScreen';

// ------------------------------------------------------
// Stack Types
// ------------------------------------------------------
export type RootStackParamList = {
  Login: undefined;
  AppHome: undefined;
};

// ------------------------------------------------------
// Drawer Types
// ------------------------------------------------------
export type DrawerParamList = {
  Dashboard: undefined;
  Admin: undefined;
  'Sub-Admins': undefined;
  Customer: undefined;
  'Sales Aggregators': undefined;
  Pilots: undefined;
  'Fleet Management': undefined;
  Bookings: undefined;
  Revenue: undefined;
  'MarketPlace Management': undefined;
  'Technician Management': undefined;
  'Service Center': undefined;
  'Role Applications': undefined;
  Incidents: undefined;
  'Incident Detail': { incidentId: string };
  Coupons: undefined;
  'Refer & Earn Rules': undefined;
  Referrals: undefined;
  Chat: undefined;
  'Send Notification': undefined;
  Refunds: undefined;
  'Payout Management': undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// ------------------------------------------------------
// Drawer Icon Wrapper Component
// Renders the component dynamically, handles scaling and transforms
// ------------------------------------------------------
const DrawerIconWrapper = ({ 
  IconComponent, 
  isFocused, 
  style 
}: { 
  IconComponent: React.ComponentType<any>; 
  isFocused: boolean;
  style?: any; // Added style property to forward transforms like rotations
}) => {
  return (
    <View style={styles.iconContainer}>
      <IconComponent 
        width={22} 
        height={22} 
        fill={isFocused ? "#111827" : "#64748B"} 
        style={style} // Pass transform arrays to the internal SVG rendering system
      />
    </View>
  );
};

// ------------------------------------------------------
// Drawer Main Navigator
// Handles responsiveness between mobile overlay & desktop permanent setups.
// ------------------------------------------------------
function DrawerNavigator() {
  const { width } = useWindowDimensions();

  // Desktop check flag (width >= 1024 on web runtime)
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const isLargeScreen = width >= 1024;

  return (
    <Drawer.Navigator
      id="main_drawer"
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        detachInactiveScreens: false, // 🚀 FIX 1: Prevents Android from native-freezing the background drawer element tree
        unmountOnBlur: false,
        headerShown: !isLargeScreen, 
        headerTitle: 'Hawk Admin',
        headerStyle: styles.header,
        headerTintColor: '#111827',
        headerTitleAlign: 'center',
        drawerType: isLargeScreen ? 'permanent' : 'front', // 🚀 FIX 2: Forces drawer onto a separate native layout layer overlaying the layout view
        swipeEnabled: !isLargeScreen,
        overlayColor: isLargeScreen ? 'transparent' : 'rgba(0, 0, 0, 0.4)', 
        drawerStyle: {
          width: isLargeScreen ? 280 : width,
          backgroundColor: '#FFFFFF',
          borderRightWidth: 1,
          borderColor: '#E5E7EB',
        },
        drawerIcon: ({ focused }) => {
          // Inline icon rendering logic
          let SelectedIcon = DashboardIcon;
          if (route.name === 'Dashboard') SelectedIcon = DashboardIcon;
          if (route.name === 'Admin') SelectedIcon = AdminIcon;
          if (route.name === 'Sub-Admins') SelectedIcon = SubAdminsIcon;
          if (route.name === 'Customer') SelectedIcon = CustomerIcon;
          if (route.name === 'Sales Aggregators') SelectedIcon = SalesAggregatorsIcon;
          if (route.name === 'Pilots') SelectedIcon = PilotsIcon;
          if (route.name === 'Fleet Management') SelectedIcon = FleetManagementIcon;
          if (route.name === 'Bookings') SelectedIcon = BookingsIcon;
          if (route.name === 'Revenue') SelectedIcon = RevenueIcon;
          if (route.name === 'MarketPlace Management') SelectedIcon = MarketplaceIcon;
          if (route.name === 'Technician Management') SelectedIcon = TechnicianIcon;
          if (route.name === 'Service Center') SelectedIcon = ServiceCenterIcon;
          if (route.name === 'Role Applications') SelectedIcon = RoleApplicationsIcon;
          if (route.name === 'Incidents') SelectedIcon = IncidentsIcon;
          if (route.name === 'Coupons') SelectedIcon = RevenueIcon;
          if (route.name === 'Chat') SelectedIcon = MessageIcon;
          if (route.name === 'Send Notification') SelectedIcon = MessageIcon;
          if (route.name === 'Refunds') SelectedIcon = RevenueIcon;
          if (route.name === 'Payout Management') SelectedIcon = RevenueIcon;
          const iconStyle = route.name === 'Sub-Admins' ? { transform: [{ rotate: '-90deg' }] } : undefined;
          return <DrawerIconWrapper IconComponent={SelectedIcon} isFocused={focused} style={iconStyle} />;
        },
        drawerActiveTintColor: '#111827',
        drawerActiveBackgroundColor: '#F3F4F6',
        drawerInactiveTintColor: '#334155',
        drawerLabelStyle: styles.drawerLabel,
        drawerItemStyle: styles.drawerItem,
      })}
      // Custom Drawer Rendering Section
      // ---------------------------------------
      drawerContent={(props) => {
        const { state, navigation } = props;

        return (
          <DrawerContentScrollView
            {...props}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: isDesktop ? 12 : 0,
              paddingBottom: 40,
            }}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              // Fallback Default SVG
              let SelectedIcon = DashboardIcon;

              // Map each view key cleanly to its respective SVG asset reference
              if (route.name === 'Dashboard') SelectedIcon = DashboardIcon;
              if (route.name === 'Admin') SelectedIcon = AdminIcon;
              if (route.name === 'Sub-Admins') SelectedIcon = SubAdminsIcon;
              if (route.name === 'Customer') SelectedIcon = CustomerIcon;
              if (route.name === 'Sales Aggregators') SelectedIcon = SalesAggregatorsIcon;
              if (route.name === 'Pilots') SelectedIcon = PilotsIcon;
              if (route.name === 'Fleet Management') SelectedIcon = FleetManagementIcon;
              if (route.name === 'Bookings') SelectedIcon = BookingsIcon;
              if (route.name === 'Revenue') SelectedIcon = RevenueIcon;
              if (route.name === 'MarketPlace Management') SelectedIcon = MarketplaceIcon;
              if (route.name === 'Technician Management') SelectedIcon = TechnicianIcon;
              if (route.name === 'Service Center') SelectedIcon = ServiceCenterIcon;
              if (route.name === 'Role Applications') SelectedIcon = RoleApplicationsIcon;
              if (route.name === 'Incidents') SelectedIcon = IncidentsIcon;
              if (route.name === 'Coupons') SelectedIcon = RevenueIcon;
              if (route.name === 'Refer & Earn Rules') SelectedIcon = RevenueIcon;
              if (route.name === 'Referrals') SelectedIcon = RoleApplicationsIcon;
              if (route.name === 'Chat') SelectedIcon = MessageIcon;
              if (route.name === 'Send Notification') SelectedIcon = MessageIcon;
              if (route.name === 'Refunds') SelectedIcon = RevenueIcon;
              if (route.name === 'Payout Management') SelectedIcon = RevenueIcon;

              // Hide Incident Detail from drawer menu
              if (route.name === 'Incident Detail') return null;

              return (
                <DrawerItem
                  key={route.key}
                  label={route.name}
                  focused={isFocused}
                  activeTintColor="#111827"
                  activeBackgroundColor="#F3F4F6"
                  inactiveTintColor="#334155"
                  labelStyle={styles.drawerLabel}
                  style={styles.drawerItem}
                  // Custom rendering block to apply the dynamic rotation style
                  icon={() => {
                    const iconStyle = route.name === 'Sub-Admins' ? { transform: [{ rotate: '-90deg' }] } : undefined;
                    return (
                      <DrawerIconWrapper 
                        IconComponent={SelectedIcon} 
                        isFocused={isFocused} 
                        style={iconStyle}
                      />
                    );
                  }}
                  onPress={() => {
                    if (isFocused) {
                      if (!isDesktop) {
                        navigation.closeDrawer();
                      }
                      return;
                    }

                    navigation.navigate(route.name);

                    if (!isDesktop) {
                      navigation.closeDrawer();
                    }
                  }}
                />
              );
            })}
          </DrawerContentScrollView>
        );
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Admin" component={AdminManagementScreen} />
      <Drawer.Screen name="Sub-Admins" component={StateAdminProfile} />
      <Drawer.Screen name="Customer" component={DepartmentAdminProfile} />
      <Drawer.Screen name="Sales Aggregators" component={SalesAggregatorsScreen} />
      <Drawer.Screen name="Pilots" component={PilotsScreen} />
      <Drawer.Screen name="Fleet Management" component={FleetManagementScreen} />
      <Drawer.Screen name="Bookings" component={BookingsScreen} />
      <Drawer.Screen name="Revenue" component={RevenueScreen} />
      <Drawer.Screen name="MarketPlace Management" component={MarketplaceManagementScreen} />
      <Drawer.Screen name="Technician Management" component={TechnicianManagementScreen} />
      <Drawer.Screen name="Service Center" component={ServiceCentreScreen} />
      <Drawer.Screen name="Role Applications" component={RoleApplicationsScreen} />
      <Drawer.Screen name="Incidents" component={IncidentsManagementScreen} />
      <Drawer.Screen name="Incident Detail" component={IncidentDetailScreen} />
      <Drawer.Screen name="Coupons" component={CouponManagementScreen} />
      <Drawer.Screen name="Refer & Earn Rules" component={ReferralRulesScreen} />
      <Drawer.Screen name="Referrals" component={ReferralsScreen} />
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="Send Notification" component={SendNotificationScreen} />
      <Drawer.Screen name="Refunds" component={RefundsScreen} />
      <Drawer.Screen name="Payout Management" component={PayoutManagementScreen} />
    </Drawer.Navigator>
  );
}

// ------------------------------------------------------
// Root Application Navigator Setup
// ------------------------------------------------------
export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  

  // Show spinner while hydrating stored JWT
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={[styles.appContainer, Platform.OS === 'web' && styles.webViewport]}>
      <NavigationContainer>
        <Stack.Navigator 
          id="root_stack"
          screenOptions={{ headerShown: false }}
        >
          {isAuthenticated ? (
            <Stack.Screen name="AppHome" component={DrawerNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ------------------------------------------------------
// Centralized Layout Component Styling
// ------------------------------------------------------
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // Web: pin root to viewport so drawer + content fit screen instead of growing/scrolling up
  webViewport: {
    height: '100vh' as any,
    maxHeight: '100vh' as any,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6, 
  },
  drawerItem: {
    marginVertical: -8,
    paddingVertical: 2, 
    paddingHorizontal: 12,
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginLeft: -10,
    flex: 1,
  },
});