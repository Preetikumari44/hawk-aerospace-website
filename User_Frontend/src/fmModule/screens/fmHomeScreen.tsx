import React from 'react';
import FleetManagerDashboardReplacement from '../FleetManagerDashboardReplacement';

const HomeScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => (
  <FleetManagerDashboardReplacement onNavigate={onNavigate} />
);

export default HomeScreen;
