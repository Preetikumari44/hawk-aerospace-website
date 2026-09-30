import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- RN#54832 workaround: keeps Text module loaded at the root
import { View, StyleSheet, StatusBar, ActivityIndicator, BackHandler, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Storage } from './src/utils/storage';
import {
  authApi,
  getSession,
  normalizeBackendRole,
  normalizeFrontendRole,
  updateStoredUser,
} from './src/utils/api';

// Customer Module Imports 
import CustomerTabBar from './src/customerModule/TabBar';
import SplashScreen from './src/customerModule/screens/SplashScreen';
import LocationAccessScreen from './src/customerModule/screens/LocationAccessScreen';
import LanguageSelectionScreen from './src/customerModule/screens/LanguageSelectionScreen';
import MobileNumberScreen from './src/customerModule/screens/MobileNumberScreen';
import OtpVerificationScreen from './src/customerModule/screens/OtpVerificationScreen';
import OtpVerifiedScreen from './src/customerModule/screens/OtpVerifiedScreen';
import CustomerHomeScreen from './src/customerModule/screens/HomeScreen';
import CustomerBookingsScreen from './src/customerModule/screens/BookingsScreen';
import CustomerMarketplaceScreen from './src/customerModule/screens/MarketplaceScreen';
import FarmLocationScreen from './src/customerModule/screens/FarmLocationScreen';
import FarmMapScreen from './src/customerModule/screens/FarmMapScreen';
import AdditionalDetailsScreen from './src/customerModule/screens/AdditionalDetailsScreen';
import ServiceBookingScreen from './src/customerModule/screens/ServiceBookingScreen';
import FlyingRestrictionCheckScreen from './src/customerModule/screens/FlyingRestrictionCheckScreen';
import WeatherForecastCheckScreen from './src/customerModule/screens/WeatherForecastCheckScreen';
import BookingConfirmationScreen from './src/customerModule/screens/BookingConfirmationScreen';
import BookingDetailsScreen from './src/customerModule/screens/BookingDetailsScreen';
import ChatScreen from './src/customerModule/screens/ChatScreen';
import SupportOptionsScreen from './src/customerModule/screens/SupportOptionsScreen';
import SupportBookingsScreen from './src/customerModule/screens/SupportBookingsScreen';
import SupportOrdersScreen from './src/customerModule/screens/SupportOrdersScreen';
import EditDetailsScreen from './src/customerModule/screens/EditDetailsScreen';
import NotificationPreferencesScreen from './src/customerModule/screens/NotificationPreferencesScreen';
import NewComplaintFormScreen from './src/customerModule/screens/NewComplaintFormScreen';
import SelectComplaintTypeScreen from './src/customerModule/screens/SelectComplaintTypeScreen';
import ComplaintHistoryScreen from './src/customerModule/screens/ComplaintHistoryScreen';
import CustomerRefundsScreen from './src/customerModule/screens/CustomerRefundsScreen';
import ComplaintDetailsScreen from './src/customerModule/screens/ComplaintDetailsScreen';
import LogoutScreen from './src/customerModule/screens/LogoutScreen';
import DeleteAccountScreen from './src/customerModule/screens/DeleteAccountScreen';
import AddBiometricsScreen from './src/customerModule/screens/AddBiometricsScreen';
import TwoFactorAuthScreen from './src/customerModule/screens/TwoFactorAuthScreen';
import UpdateLocationScreen from './src/customerModule/screens/UpdateLocationScreen';
import MappingAdditionalDetailsScreen from './src/customerModule/screens/MappingAdditionalDetailsScreen';
import DronePilotApplicationScreen from './src/customerModule/screens/DronePilotApplicationScreen';
import ApplicationSuccessScreen from './src/customerModule/screens/ApplicationSuccessScreen';
import ApplicationStatusScreen from './src/customerModule/screens/ApplicationStatusScreen';
import RoleApplicationFormScreen from './src/commonScreens/RoleApplicationFormScreen';
import ReferAndEarnScreen from './src/commonScreens/ReferAndEarnScreen';
import ReferralLandingScreen from './src/commonScreens/ReferralLandingScreen';
import {
  frontendRoleForInvite,
  getPendingReferral,
  initReferralDeepLinks,
} from './src/utils/referral';
import ProductDetailsScreen from './src/customerModule/screens/ProductDetailsScreen';
import YourOrdersScreen from './src/customerModule/screens/YourOrdersScreen';
import OrderDetailsScreen from './src/customerModule/screens/OrderDetailsScreen';
import CartScreen from './src/customerModule/screens/Cartscreen';
import PaymentSelectionScreen from './src/customerModule/screens/PaymentSelectionScreen';


// Pilot Module Imports
import PilotTabBar from './src/pilotModule/TabBar';
import PilotHomeScreen from './src/pilotModule/screens/HomeScreen';
import PilotMissionScreen from './src/pilotModule/screens/MissionScreen';
import PilotEarningsScreen from './src/pilotModule/screens/EarningScreen';
import PilotPendingEarningsScreen from './src/pilotModule/screens/PendingEarningsScreen';
import PilotActiveMissionDetails from './src/pilotModule/screens/ActiveMissionDetails';
import PilotAddPayoutMethodScreen from './src/pilotModule/screens/AddPayoutMethodScreen';
import PilotWithdrawScreen from './src/pilotModule/screens/WithdrawScreen';
import PilotWithdrawalHistoryScreen from './src/pilotModule/screens/WithdrawalHistoryScreen';
import PilotRefundStatusScreen from './src/pilotModule/screens/RefundStatusScreen';
import PilotDashboard from './src/pilotDashboard/PilotDashboard';

// Technician Module Imports
import TechnicianTabBar from './src/technicianModule/TabBar';
import TechnicianHomeScreen from './src/technicianModule/screens/TechnicianHomeScreen';
import TechnicianDashboard from './src/technicianModule/newDashboard/TechnicianDashboard';
import RepairsScreen from './src/technicianModule/screens/RepairsScreen';
import ActiveTicketDetails from './src/technicianModule/screens/ActiveTicketDetails';
import TechnicianEarningsScreen from './src/technicianModule/screens/TechnicianEarningsScreen';


// Sales aggregator module imports
import SalesTabBar from './src/salesaggregatorModule/TabBar';
import SalesHomeScreen from './src/salesaggregatorModule/screens/HomeScreen';
import SalesBookingsScreen from './src/salesaggregatorModule/screens/BookingsScreen';
import SalesServiceBookingScreen from './src/salesaggregatorModule/screens/ServiceBookingScreen';
import SalesCommissionScreen from './src/salesaggregatorModule/screens/CommissionScreen';
import SalesAddCustomerScreen from './src/salesaggregatorModule/screens/AddCustomerScreen';
import SalesCustomerOtpVerificationScreen from './src/salesaggregatorModule/screens/CustomerOtpVerificationScreen';

// ─── Fleet Manager Module ───
import FleetManagerTabBar from './src/fmModule/FMtabBar';
import FMHomeScreen from './src/fmModule/screens/fmHomeScreen';
import FMMissionScreen from './src/fmModule/screens/fmMissionScreen';
import FMResourcesScreen from './src/fmModule/screens/fmResourceScreen';
import FMBookingDetailsScreen from './src/fmModule/screens/fmBookingDetailsscreen';
import FMIncomingRequestsScreen from './src/fmModule/screens/fmIncomingReqScreen';
import FMIncomingRequestDetailsScreen from './src/fmModule/screens/fmIncomingReqDetails';
import FMYourPilotsScreen from './src/fmModule/screens/fmPilotList';
import FMYourDronesScreen from './src/fmModule/screens/YourDronesScreen';
import FMPilotDetailsScreen from './src/fmModule/screens/PilotDetailsScreen';
import FMDroneDetailsScreen from './src/fmModule/screens/DroneDetailsScreen';
import FMAddResourceScreen from './src/fmModule/screens/AddResourceScreen';
import FMAddDroneScreen from './src/fmModule/screens/AddDroneScreen';
import FMAddDroneConfirmation from './src/fmModule/screens/AddDroneConfirmationScreen';
import FMAddPilotScreen from './src/fmModule/screens/AddPilotScreen';
import FMOTPVerificationScreen from './src/fmModule/screens/OTPVerificationScreen';
import FMRejectedMissionsScreen from './src/fmModule/screens/RejectedMissionsScreen';
import FmEarningsScreen from './src/fmModule/screens/fmEarningsScreen';
import FmPendingEarningsScreen from './src/fmModule/screens/fmPendingEarningsScreen';
import FmAddPayoutMethodScreen from './src/fmModule/screens/fmAddPayoutMethodScreen';
import FmWithdrawScreen from './src/fmModule/screens/fmWithdrawScreen';
import FmWithdrawalHistoryScreen from './src/fmModule/screens/fmWithdrawalHistoryScreen';
import FmRefundStatusScreen from './src/fmModule/screens/fmRefundStatusScreen';

// Unified Imports
import UnifiedAccountScreen from './src/commonScreens/AccountsScreen';

// First-login permission gate (rendered only around the Home screen)
import FirstLoginPermissionsGate from './src/common/FirstLoginPermissionsGate';

// App-unlock biometrics gate (native only)
import BiometricUnlockGate from './src/common/BiometricUnlockGate';

// Auto-update
import UpdateOverlay from './src/components/UpdateOverlay';

// Push notifications
import { setupPushNotifications } from './src/utils/notificationService';

// Real-time socket (auto role-switch on admin approval)
import { connectSocket } from './src/utils/socket';

// Localization
import { LanguageProvider, DEFAULT_LANGUAGE, STORAGE_KEY, isLanguageCode } from './src/i18n';

const MAIN_TABS = [
  // Main Tab Screens (original)
  'Home', 'Missions', 'Repairs', 'Earnings', 'Marketplace', 'Account', 'Bookings', 'Commission', 'Resources',
  // Customer Module Screens
  'ServiceBookingScreen', 'FarmLocationScreen', 'FarmMapScreen', 'AdditionalDetailsScreen', 
  'MappingAdditionalDetailsScreen', 'FlyingRestrictionCheckScreen', 'WeatherForecastCheckScreen', 
  'BookingConfirmationScreen', 'BookingDetailsScreen', 'UpdateLocationScreen', 'ChatScreen',
  'SupportOptionsScreen', 'SupportBookingsScreen', 'SupportOrdersScreen',
  'EditDetailsScreen', 'NotificationPreferencesScreen', 'LogoutScreen', 'DeleteAccountScreen',
  'NewComplaintFormScreen', 'SelectComplaintTypeScreen', 'ComplaintHistoryScreen', 
  'CustomerRefundsScreen', 'ComplaintDetailsScreen', 'DronePilotApplicationScreen', 
  'SalesAggregatorApplicationScreen', 'FleetManagerApplicationScreen', 'TechnicianApplicationScreen',
  'RoleApplicationFormScreen', 'ApplicationSuccessScreen', 'ApplicationStatusScreen',
  'ProductDetailsScreen', 'YourOrdersScreen', 'OrderDetailsScreen', 'CartScreen', 'PaymentSelectionScreen',
  // Pilot Module Screens
  'PendingEarnings', 'ActiveMissionDetails',
  // Sales Aggregator Module Screens
  'AddCustomerScreen', 'CustomerOtpVerification', 'BookingDetails',
  // Technician Module Screens
  'ActiveTicketDetails',
  // Fleet Manager Module Screens
  'IncomingRequests', 'IncomingRequestDetails', 'YourPilots', 'YourDrones', 
  'PilotDetails', 'DroneDetails', 'AddResource', 'AddDrone', 'AddDroneConfirmation', 
  'AddPilot', 'OTPVerification', 'RejectedMissions'
];
const DEFAULT_STACK_ENTRY = { screen: 'SplashScreen', params: {} };

export default function App() {
  const [currentRole, setCurrentRole] = useState('customer'); // Default role 
  const [currentScreen, setCurrentScreen] = useState('SplashScreen'); // Default screen
  const [screenParams, setScreenParams] = useState<any>({});
  const [isReady, setIsReady] = useState(false);
  const [bootLanguage, setBootLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setNavigationStack] = useState<any[]>([DEFAULT_STACK_ENTRY]);
  const navigationStackRef = useRef<any[]>([DEFAULT_STACK_ENTRY]);

  const syncNavigationStack = useCallback((stack: any[]) => {
    navigationStackRef.current = stack;
    setNavigationStack(stack);
  }, []);

  const resetNavigation = useCallback((screen: string, params: any = {}) => {
    const entry = { screen, params: params || {} };
    syncNavigationStack([entry]);
    setCurrentScreen(screen);
    setScreenParams(entry.params);
  }, [syncNavigationStack]);

  const handleGoBack = useCallback(() => {
    const stack = navigationStackRef.current;
    const currentEntry = stack[stack.length - 1];

    // BookingConfirmationScreen always exits to Home (never back into the
    // booking flow or out of the app).
    if (currentEntry?.screen === 'BookingConfirmationScreen') {
      resetNavigation('Home');
      return true;
    }

    if (stack.length <= 1) {
      return false;
    }

    const nextStack = stack.slice(0, -1);
    const previousEntry = nextStack[nextStack.length - 1];
    syncNavigationStack(nextStack);
    setCurrentScreen(previousEntry.screen);
    setScreenParams(previousEntry.params || {});
    return true;
  }, [syncNavigationStack, resetNavigation]);

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        const savedRole = await Storage.getItem('@user_role');
        const session = await getSession();
        const savedLanguage = await Storage.getItem(STORAGE_KEY);
        if (isLanguageCode(savedLanguage)) {
          setBootLanguage(savedLanguage);
        }

        const sessionRole = normalizeFrontendRole(session?.user?.primaryRole || session?.user?.role);
        const bootRole = normalizeFrontendRole(savedRole || sessionRole || 'customer');
        setCurrentRole(bootRole);

        if (session?.accessToken) {
          setIsAuthenticated(true);
          resetNavigation('Home');
          setupPushNotifications().catch(() => {});
        } else if (savedRole) {
          // Returning user whose session expired
          resetNavigation('MobileNumberScreen');
        } else {
          // Truly first launch (no saved role, no session). An invite link
          // routes straight to the role's application form — no login first.
          const pending = await getPendingReferral().catch(() => ({ code: null, role: null }));
          const inviteRole = frontendRoleForInvite(pending?.role);
          if (pending?.code && inviteRole) {
            resetNavigation('RoleApplicationFormScreen', {
              role: inviteRole,
              guest: true,
              referralCode: pending.code,
            });
          } else {
            resetNavigation('SplashScreen');
          }
        }
      } catch (error) {
        console.error('Failed to bootstrap app', error);
        setCurrentRole('customer');
        resetNavigation('MobileNumberScreen');
      } finally {
        setIsReady(true);
      }
    };
    bootstrapApp();
  }, [resetNavigation]);

  // Refer & Earn deep links (/r/:code, hawk://invite?code=).
  // Cold start: the code is stashed (bootstrap routes invite links to the
  // guest form). Warm links (app already open): jump to the guest form now.
  useEffect(() => {
    let cleanup = () => {};
    initReferralDeepLinks((parsed) => {
      const inviteRole = frontendRoleForInvite(parsed?.role);
      if (parsed?.code && inviteRole && isReady) {
        handleNavigate('RoleApplicationFormScreen', {
          role: inviteRole,
          guest: true,
          referralCode: parsed.code,
        });
      }
    }).then((fn) => { cleanup = fn; }).catch(() => {});
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (handleGoBack()) {
        return true;
      }

      // Only exit the app when on the Home screen and no more back steps remain.
      // On any other screen, prevent exit.
      if (currentScreen === 'Home') {
        return false;
      }
      return true;
    });
    return () => subscription.remove();
  }, [handleGoBack, currentScreen]);

  const handleSwitchRole = async (newRole: string) => {
    try {
      const targetBackendRole = normalizeBackendRole(newRole);
      let switchedUser = null;

      // The only path to a role switch is the admin-gated /auth/switch-role.
      const session = await authApi.switchRole(newRole);
      switchedUser = session?.user || null;

      if (!switchedUser) {
        const session = await getSession();
        const role = normalizeFrontendRole(session?.user?.primaryRole || session?.user?.role);
        if (role === newRole) {
          await Storage.setItem('@user_role', newRole);
          setCurrentRole(newRole);
          resetNavigation('Home');
          return;
        }
        throw new Error(`The backend did not issue a session for the ${newRole} role.`);
      }

      const nextUser = {
        ...switchedUser,
        role: targetBackendRole,
        primaryRole: targetBackendRole,
      };
      await updateStoredUser(nextUser);

      await Storage.setItem('@user_role', newRole);
      setCurrentRole(newRole);
      resetNavigation('Home');
    } catch (error) {
      console.error('Failed to save role', error);
      if (newRole === 'customer') {
        await Storage.setItem('@user_role', 'customer').catch(() => {});
        setCurrentRole('customer');
        resetNavigation('SplashScreen');
      }
    }
  };

  const handleNavigate = (screen: string, params?: any) => {
    if (screen === 'Back') {
      handleGoBack();
      return;
    }

    // Navigating to Home must always reset the stack so Back never returns to auth/onboarding screens.
    if (screen === 'Home') {
      resetNavigation('Home', params);
      return;
    }

    // A non-customer module signing out must return to the customer login flow, since the
    // auth screens are only rendered under the customer role.
    if (screen === 'MobileNumberScreen' && currentRole !== 'customer') {
      Storage.setItem('@user_role', 'customer').catch(() => {});
      setCurrentRole('customer');
      resetNavigation('MobileNumberScreen');
      return;
    }

    const nextParams = params || {};
    const currentStack = navigationStackRef.current;
    const currentEntry = currentStack[currentStack.length - 1];

    if (currentEntry?.screen === screen) {
      const replacedStack = [...currentStack.slice(0, -1), { screen, params: nextParams }];
      syncNavigationStack(replacedStack);
      setCurrentScreen(screen);
      setScreenParams(nextParams);
      return;
    }

    const nextStack = [...currentStack, { screen, params: nextParams }];
    syncNavigationStack(nextStack);
    setCurrentScreen(screen);
    setScreenParams(nextParams);
  };

  // Keep a ref so the socket handler always calls the latest handleSwitchRole
  const handleSwitchRoleRef = useRef(handleSwitchRole);
  useEffect(() => {
    handleSwitchRoleRef.current = handleSwitchRole;
  });

  // ── Real-time role application updates from the admin ──────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let disposed = false;
    let currentSocket: any = null;

    const frontendRoleFor = (backendRole: string) => {
      if (backendRole === 'aggregator' || backendRole === 'sales') return 'sales';
      if (backendRole === 'fleet_manager' || backendRole === 'fleet' || backendRole === 'vendor') return 'fleet';
      return backendRole;
    };

    const onRoleApplicationUpdated = async (payload: any) => {
      if (!payload || disposed) {
        return;
      }
      const frontendRole = frontendRoleFor(payload.role);

      if (payload.status === 'rejected') {
        resetNavigation('ApplicationStatusScreen', {
          role: frontendRole,
          status: 'rejected',
          reason: payload.remarks || payload.rejectionReason || 'Your application has been rejected.',
        });
        return;
      }

      if (payload.status === 'approved') {
        await handleSwitchRoleRef.current(frontendRole);
      }
    };

    connectSocket().then((socket) => {
      if (disposed) {
        return;
      }
      currentSocket = socket;
      socket?.on('role-application:updated', onRoleApplicationUpdated);
    });

    return () => {
      disposed = true;
      currentSocket?.off('role-application:updated', onRoleApplicationUpdated);
    };
  }, [isAuthenticated, resetNavigation]);

  if (!isReady) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#5060D3" />
      </View>
    );
  }

  const renderScreen = () => {
    // Public invite landing (WEB ONLY): nginx serves index.html for /r/:code,
    // so intercept the browser path before any auth/onboarding screen.
    // The code is stashed to localStorage; the native app can't read it, so the
    // landing shows the code big for copy/paste after APK install.
    if (
      !isAuthenticated &&
      typeof window !== 'undefined' &&
      typeof window.location?.pathname === 'string' &&
      window.location.pathname.startsWith('/r/')
    ) {
      return <ReferralLandingScreen onNavigate={handleNavigate} routeParams={screenParams} />;
    }

    // Shared Global Screens
    if (currentScreen === 'Account') {
      if (currentRole === 'customer') {
        return <UnifiedAccountScreen onNavigate={handleNavigate} currentRole={currentRole} onSwitchRole={handleSwitchRole} />;
      }
      return <UnifiedAccountScreen onNavigate={handleNavigate} currentRole={currentRole} onSwitchRole={handleSwitchRole} />;
    }

    // Logout confirmation must be reachable from every module/role (not just customer).
    if (currentScreen === 'LogoutScreen') {
      return <LogoutScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
    }

    // Security screens must be reachable from the unified Accounts screen for every role.
    if (currentScreen === 'AddBiometricsScreen') {
      return <AddBiometricsScreen onNavigate={handleNavigate} />;
    }
    if (currentScreen === 'TwoFactorAuthScreen') {
      return <TwoFactorAuthScreen onNavigate={handleNavigate} />;
    }

    // Refer & Earn hub — reachable from every module/role (Refer card).
    if (currentScreen === 'ReferAndEarnScreen') {
      return <ReferAndEarnScreen onNavigate={handleNavigate} routeParams={screenParams} />;
    }

    // Role application + status screens must be reachable from every module/role.
    if (currentScreen === 'RoleApplicationFormScreen') {
      return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
    }
    if (currentScreen === 'ApplicationStatusScreen') {
      return <ApplicationStatusScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
    }
    if (currentScreen === 'ApplicationSuccessScreen') {
      return <ApplicationSuccessScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
    }

    // Support flow — reachable from every module/role (SupportCard + Help Centre).
    if (currentScreen === 'SupportOptionsScreen') {
      return <SupportOptionsScreen onNavigate={handleNavigate} />;
    }
    if (currentScreen === 'SupportBookingsScreen') {
      return <SupportBookingsScreen onNavigate={handleNavigate} />;
    }
    if (currentScreen === 'SupportOrdersScreen') {
      return <SupportOrdersScreen onNavigate={handleNavigate} />;
    }

    // 🔥 Role Based Switch
    if (currentRole === 'customer') {
      switch (currentScreen) {
        // --- Onboarding & Auth Flow ---
        case 'SplashScreen': return <SplashScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'LocationAccessScreen': return <LocationAccessScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'LanguageSelectionScreen': return <LanguageSelectionScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'MobileNumberScreen': return <MobileNumberScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OtpVerificationScreen': return <OtpVerificationScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OtpVerifiedScreen': return <OtpVerifiedScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        // --- Main Tabs ---
        case 'Home': return <CustomerHomeScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'Bookings': return <CustomerBookingsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'Marketplace': return <CustomerMarketplaceScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        // --- Booking Flow ---
        case 'ServiceBookingScreen': return <ServiceBookingScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'FarmLocationScreen': return <FarmLocationScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'FarmMapScreen': return <FarmMapScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'AdditionalDetailsScreen': return <AdditionalDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'MappingAdditionalDetailsScreen': return <MappingAdditionalDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'FlyingRestrictionCheckScreen': return <FlyingRestrictionCheckScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'WeatherForecastCheckScreen': return <WeatherForecastCheckScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'BookingConfirmationScreen': return <BookingConfirmationScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'BookingDetailsScreen': return <BookingDetailsScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'UpdateLocationScreen': return <UpdateLocationScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'ChatScreen': return <ChatScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        // --- Profile & Preferences ---
        case 'EditDetailsScreen': return <EditDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'NotificationPreferencesScreen': return <NotificationPreferencesScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'LogoutScreen': return <LogoutScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'DeleteAccountScreen': return <DeleteAccountScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        // --- Support & Complaints ---
        case 'NewComplaintFormScreen': return <NewComplaintFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'SelectComplaintTypeScreen': return <SelectComplaintTypeScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ComplaintHistoryScreen': return <ComplaintHistoryScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CustomerRefundsScreen': return <CustomerRefundsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ComplaintDetailsScreen': return <ComplaintDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        // --- Role Applications (Drone Pilot etc) ---
        case 'DronePilotApplicationScreen': return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={{ role: 'pilot', ...screenParams }} />;
        case 'SalesAggregatorApplicationScreen': return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={{ role: 'sales', ...screenParams }} />;
        case 'FleetManagerApplicationScreen': return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={{ role: 'fleet', ...screenParams }} />;
        case 'TechnicianApplicationScreen': return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={{ role: 'technician', ...screenParams }} />;
        case 'RoleApplicationFormScreen': return <RoleApplicationFormScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ApplicationSuccessScreen': return <ApplicationSuccessScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ApplicationStatusScreen': return <ApplicationStatusScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        // --- Marketplace Inner Screens ---
        case 'ProductDetailsScreen': return <ProductDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'YourOrdersScreen': return <YourOrdersScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OrderDetailsScreen': return <OrderDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CartScreen': return <CartScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'PaymentSelectionScreen': return <PaymentSelectionScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        // --- Default Fallback ---
        default: return <CustomerHomeScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
      }
    }
    // Pilot Role Screens
    else if (currentRole === 'pilot') {
      switch (currentScreen) {
        case 'Home':
        case 'Missions':
        case 'Earnings':
          return <PilotDashboard initialScreen={currentScreen} onSwitchRole={handleSwitchRole} />;
        case 'Marketplace': return <CustomerMarketplaceScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ProductDetailsScreen': return <ProductDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'YourOrdersScreen': return <YourOrdersScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OrderDetailsScreen': return <OrderDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CartScreen': return <CartScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'PaymentSelectionScreen': return <PaymentSelectionScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'PendingEarnings': return <PilotPendingEarningsScreen onNavigate={handleNavigate} />;
        case 'ActiveMissionDetails': return <PilotActiveMissionDetails onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'ChatScreen': return <ChatScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'AddPayoutMethod': return <PilotAddPayoutMethodScreen onNavigate={handleNavigate} />;
        case 'Withdraw': return <PilotWithdrawScreen onNavigate={handleNavigate} />;
        case 'WithdrawalHistory': return <PilotWithdrawalHistoryScreen onNavigate={handleNavigate} />;
        case 'RefundStatus': return <PilotRefundStatusScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'EditDetailsScreen': return <EditDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'UpdateLocationScreen': return <UpdateLocationScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        default: return <PilotDashboard initialScreen={currentScreen} onSwitchRole={handleSwitchRole} />;
      }
    }

    else if (currentRole === 'sales') {
      switch (currentScreen) {
        case 'Home': return <SalesHomeScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} />;

        case 'Bookings': return <SalesBookingsScreen onNavigate={handleNavigate} />;

        // --- Booking Flow (aggregator starts by identifying the customer) ---
        case 'ServiceBookingScreen': return <SalesServiceBookingScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        case 'Earnings':
        case 'Commission': return <SalesCommissionScreen onNavigate={handleNavigate} />;

        case 'AddCustomerScreen': return <SalesAddCustomerScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'CustomerOtpVerification': return <SalesCustomerOtpVerificationScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        // Reusing Customer Module's Farm Location Screen directly
        case 'FarmLocationScreen': return <FarmLocationScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;

        case 'Marketplace': return <CustomerMarketplaceScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />

        // Sales aggregator reuses customer marketplace screens
        case 'ProductDetailsScreen': return <ProductDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'YourOrdersScreen': return <YourOrdersScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OrderDetailsScreen': return <OrderDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CartScreen': return <CartScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'PaymentSelectionScreen': return <PaymentSelectionScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        case 'FarmMapScreen': return <FarmMapScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'AdditionalDetailsScreen': return <AdditionalDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'MappingAdditionalDetailsScreen': return <MappingAdditionalDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'FlyingRestrictionCheckScreen': return <FlyingRestrictionCheckScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'WeatherForecastCheckScreen': return <WeatherForecastCheckScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'BookingConfirmationScreen': return <BookingConfirmationScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'BookingDetailsScreen': return <BookingDetailsScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'BookingDetails': return <BookingDetailsScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'ChatScreen': return <ChatScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'EditDetailsScreen': return <EditDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'UpdateLocationScreen': return <UpdateLocationScreen onNavigate={handleNavigate} routeParams={screenParams} />;

        default: return <SalesHomeScreen onNavigate={handleNavigate} />;
      }
    }
    // Technician Role Screens
    else if (currentRole === 'technician') {
      switch (currentScreen) {
        case 'Home': return <TechnicianDashboard onNavigate={handleNavigate} currentRoute={currentScreen} />;
        case 'Repairs': return <RepairsScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'Earnings': return <TechnicianEarningsScreen onNavigate={handleNavigate} />;
        case 'Marketplace': return <CustomerMarketplaceScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ProductDetailsScreen': return <ProductDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'YourOrdersScreen': return <YourOrdersScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OrderDetailsScreen': return <OrderDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CartScreen': return <CartScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'PaymentSelectionScreen': return <PaymentSelectionScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'ActiveTicketDetails': return <ActiveTicketDetails onNavigate={handleNavigate} />;
        case 'ChatScreen': return <ChatScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'EditDetailsScreen': return <EditDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'UpdateLocationScreen': return <UpdateLocationScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        default: return <TechnicianHomeScreen onNavigate={handleNavigate} />;
      }
    }
    else if (currentRole === 'fleet') {
      switch (currentScreen) {
        case 'Home':
          return <FMHomeScreen onNavigate={handleNavigate} />;
        case 'Missions':
          return <FMMissionScreen onNavigate={handleNavigate} initialTab={screenParams?.tab} routeParams={screenParams} />;
        case 'Resources':
          return <FMResourcesScreen onNavigate={handleNavigate} />;
        case 'BookingDetails':
          return (
            <FMBookingDetailsScreen
              onNavigate={handleNavigate}
              initialStatus={screenParams?.status || 'mission_accepted'}
              routeParams={screenParams}
            />
          );
        case 'IncomingRequests':
          return <FMIncomingRequestsScreen onNavigate={handleNavigate} />;
        case 'IncomingRequestDetails':
          return <FMIncomingRequestDetailsScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'YourPilots':
          return (
            <FMYourPilotsScreen
              onNavigate={handleNavigate}
              initialTab={screenParams?.tab || 'Available'}
            />
          );
        case 'YourDrones':
          return (
            <FMYourDronesScreen
              onNavigate={handleNavigate}
              initialTab={screenParams?.tab || 'Deployable'}
            />
          );
        case 'PilotDetails':
          return (
            <FMPilotDetailsScreen
              onNavigate={handleNavigate}
              status={screenParams?.status || 'Available'}
              pilot={screenParams?.pilot}
              pilotId={screenParams?.pilotId}
              routeParams={screenParams}
            />
          );
        case 'DroneDetails':
          return (
            <FMDroneDetailsScreen
              onNavigate={handleNavigate}
              status={screenParams?.status || 'Deployable'}
              drone={screenParams?.drone}
              routeParams={screenParams}
            />
          );
        case 'AddResource':
          return <FMAddResourceScreen onNavigate={handleNavigate} />;
        case 'AddDrone':
          return <FMAddDroneScreen onNavigate={handleNavigate} />;
        case 'AddDroneConfirmation':
          return <FMAddDroneConfirmation onNavigate={handleNavigate} />;
        case 'AddPilot':
          return <FMAddPilotScreen onNavigate={handleNavigate} />;
        case 'OTPVerification':
          return <FMOTPVerificationScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'Earnings':
          return <FmEarningsScreen onNavigate={handleNavigate} />;
        case 'PendingEarnings':
          return <FmPendingEarningsScreen onNavigate={handleNavigate} />;
        case 'RejectedMissions':
          return <FMRejectedMissionsScreen onNavigate={handleNavigate} />;
        case 'Marketplace': return <CustomerMarketplaceScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'ProductDetailsScreen': return <ProductDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'YourOrdersScreen': return <YourOrdersScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'OrderDetailsScreen': return <OrderDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'CartScreen': return <CartScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'PaymentSelectionScreen': return <PaymentSelectionScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'ChatScreen': return <ChatScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'AddPayoutMethod': return <FmAddPayoutMethodScreen onNavigate={handleNavigate} />;
        case 'Withdraw': return <FmWithdrawScreen onNavigate={handleNavigate} />;
        case 'WithdrawalHistory': return <FmWithdrawalHistoryScreen onNavigate={handleNavigate} />;
        case 'RefundStatus': return <FmRefundStatusScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        case 'EditDetailsScreen': return <EditDetailsScreen onNavigate={handleNavigate} onSwitchRole={handleSwitchRole} routeParams={screenParams} />;
        case 'UpdateLocationScreen': return <UpdateLocationScreen onNavigate={handleNavigate} routeParams={screenParams} />;
        default:
          return <FMHomeScreen onNavigate={handleNavigate} />;
      }
    }
  };


  const showTabBar = MAIN_TABS.includes(currentScreen) && !(currentRole === 'pilot' && ['Home', 'Missions', 'Earnings'].includes(currentScreen)) && !(currentRole === 'sales' && currentScreen === 'Home');

  return (
    <LanguageProvider initialLanguage={bootLanguage}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <UpdateOverlay>
          <BiometricUnlockGate enabled={isReady && isAuthenticated}>
            <View style={styles.container}>
              <View style={styles.screenWrapper}>
                {currentScreen === 'Home' ? (
                  <FirstLoginPermissionsGate>{renderScreen()}</FirstLoginPermissionsGate>
                ) : (
                  renderScreen()
                )}
              </View>

              {showTabBar && (
              currentRole === 'customer' ? (
                <CustomerTabBar activeTab={currentScreen} onTabChange={(s) => handleNavigate(s)} />
              ) : currentRole === 'pilot' ? (
                <PilotTabBar activeTab={currentScreen} onTabChange={(s) => handleNavigate(s)} />
              ) : currentRole === 'sales' ? (
                <SalesTabBar activeTab={currentScreen} onTabChange={(s) => handleNavigate(s)} />
              ) : currentRole === 'technician' ? (
                currentScreen === 'Home' ? null : (
                  <TechnicianTabBar activeTab={currentScreen} onTabChange={(s) => handleNavigate(s)} />
                )
              ) : currentRole === 'fleet' ? (
                <FleetManagerTabBar activeTab={currentScreen} onTabChange={(s) => handleNavigate(s)} />
              ) : null
            )}
            </View>
          </BiometricUnlockGate>
        </UpdateOverlay>
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  screenWrapper: { flex: 1 },
  loaderContainer: { flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' }
});
