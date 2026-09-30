import React from 'react';
import HomeActive from '../assets/icons/Home-Active.svg';
import HomeInactive from '../assets/icons/Home-Inactive.svg';
import MissionsActive from '../assets/icons/Missions-Active.svg';
import MissionsInactive from '../assets/icons/Missions-Inactive.svg';
import EarningsActive from '../assets/icons/Earnings-Active.svg';
import EarningsInactive from '../assets/icons/Earnings-Inactive.svg';
import { colors } from '../theme/colors';

// Account and Marketplace remain reachable screens (via the header avatar and
// the Home "View All" / "Popular Products" links respectively) but are not
// sidebar/nav destinations — see the Home, Missions, Earnings-only nav below.
export type ScreenKey = 'Home' | 'Missions' | 'Earnings' | 'Marketplace' | 'Account' | 'MissionDetails' | 'Payout';

export interface NavItem {
  key: ScreenKey;
  label: string;
  Active: React.FC<any>;
  Inactive: React.FC<any>;
}

// Reuses the existing Hawk/SuperApp Pilot tab icon set — same meaning
// across the Customer and Pilot dashboards, per the design brief.
// Sidebar/nav intentionally has only Home, Missions and Earnings: Account is
// reached from the header avatar, Marketplace from Home's Popular Products.
export const NAV_ITEMS: NavItem[] = [
  { key: 'Home', label: 'Home', Active: HomeActive, Inactive: HomeInactive },
  { key: 'Missions', label: 'Missions', Active: MissionsActive, Inactive: MissionsInactive },
  { key: 'Earnings', label: 'Earnings', Active: EarningsActive, Inactive: EarningsInactive },
];

export const NAV_ICON_COLOR = { active: colors.forestGreen, inactive: colors.textMuted };
