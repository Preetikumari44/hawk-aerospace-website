// src/data/workspacesData.js
// The 9-dots workspace switcher must contain exactly these four roles.
// Each dashboard lives in its own independent Hawk Aerospace project and
// is not bundled with this Sales Aggregator build — `route` is a stable
// key so a future integration (deep link / shared shell) can map it to
// the real destination without changing this UI.
import { IconPerson, IconDrone, IconTruck, IconWrench } from '../components/icons';

export const workspaces = [
  { key: 'customer', label: 'Customer', Icon: IconPerson, route: 'CustomerDashboard' },
  { key: 'pilot', label: 'Pilot', Icon: IconDrone, route: 'PilotDashboard' },
  { key: 'fleetManager', label: 'Fleet Manager', Icon: IconTruck, route: 'FleetManagerDashboard' },
  { key: 'technician', label: 'Technician', Icon: IconWrench, route: 'TechnicianDashboard' },
];

export default { workspaces };
