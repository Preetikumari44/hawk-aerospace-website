import React, { createContext, useContext } from 'react';

const NavigationContext = createContext({ routeName: 'SalesAggregatorDashboard', navigate: () => {} });

export function NavigationProvider({ initialRoute = 'SalesAggregatorDashboard', onNavigate, children }) {
  const value = {
    routeName: initialRoute,
    navigate: (route, params = {}) => {
      if (onNavigate) onNavigate(route, params);
    },
  };
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  return useContext(NavigationContext);
}
