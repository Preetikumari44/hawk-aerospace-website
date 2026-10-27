// The 9-dot switcher lists the four sibling roles. Single platform: every
// dashboard lives in this app, so hrefs are always in-app routes (no env gate).

export type WorkspaceIcon = 'person' | 'drone' | 'truck' | 'wrench';

export interface Workspace {
  key: string;
  label: string;
  icon: WorkspaceIcon;
  route: string;
  href: string;
  role: 'customer' | 'pilot' | 'fleet' | 'technician';
}

export const workspaces: readonly Workspace[] = [
  { key: 'customer', label: 'Customer', icon: 'person', route: 'CustomerDashboard', href: '/my-bookings', role: 'customer' },
  { key: 'pilot', label: 'Pilot', icon: 'drone', route: 'PilotDashboard', href: '/pilot', role: 'pilot' },
  { key: 'fleetManager', label: 'Fleet Manager', icon: 'truck', route: 'FleetManagerDashboard', href: '/fleet/dashboard', role: 'fleet' },
  { key: 'technician', label: 'Technician', icon: 'wrench', route: 'TechnicianDashboard', href: '/technician', role: 'technician' },
];
