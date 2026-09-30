import React from 'react';
import { NavigationProvider } from '../newDashboard/navigation/NavigationContext';
import SalesAggregatorDashboard from '../newDashboard/screens/SalesAggregatorDashboard';
import { CartProvider } from '../newDashboard/utils/CartContext';

interface Props {
  onNavigate?: (screen: string, params?: any) => void;
  onSwitchRole?: (role: string) => void;
}

const routeMap: Record<string, string> = {
  SalesAggregatorDashboard: 'Home',
  Bookings: 'Bookings',
  Commission: 'Commission',
  Marketplace: 'Marketplace',
  Account: 'EditDetailsScreen',
};

const HomeScreen: React.FC<Props> = ({ onNavigate, onSwitchRole }) => {
  const bridgeNavigate = (route: string, params: any = {}) => {
    const target = routeMap[route] || route;
    onNavigate?.(target, params);
  };

  return (
    <CartProvider>
      <NavigationProvider initialRoute="SalesAggregatorDashboard" onNavigate={bridgeNavigate}>
        <SalesAggregatorDashboard onSwitchRole={onSwitchRole} />
      </NavigationProvider>
    </CartProvider>
  );
};

export default HomeScreen;
