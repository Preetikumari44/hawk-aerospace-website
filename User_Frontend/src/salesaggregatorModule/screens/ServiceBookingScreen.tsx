import React from 'react';
import CustomerServiceBookingScreen from '../../customerModule/screens/ServiceBookingScreen';

// Bookings for aggregators always start by identifying the customer: the
// location screen reached from the shared booking screen is intercepted so
// the customer details are attached before the flow continues.
const ServiceBookingScreen: React.FC<{ onNavigate?: any, routeParams?: any, onSwitchRole?: any }> = ({ onNavigate, routeParams, onSwitchRole }) => {
  const handleNavigate = (screenName: string, params?: any) => {
    if (screenName === 'FarmLocationScreen') {
      onNavigate('AddCustomerScreen', { bookingParams: params || {} });
      return;
    }
    onNavigate(screenName, params);
  };

  return (
    <CustomerServiceBookingScreen
      onNavigate={handleNavigate}
      routeParams={routeParams}
      onSwitchRole={onSwitchRole}
    />
  );
};

export default ServiceBookingScreen;
