// Technician identity data.
//
// IMPORTANT: this is intentionally NOT a real person's identity.
// getMockTechnician() is a placeholder used only until authentication
// is wired up. Once auth/API exists, replace calls to getMockTechnician()
// with the logged-in technician's real profile (see AppContext.js) —
// no other file needs to change, since every screen/component reads the
// technician object from context rather than importing a fixed name.

export function getMockTechnician() {
  return {
    name: 'Technician',
    phone: '',
    email: '',
    role: 'Technician',
    id: '',
    address: '',
    rating: '0.0 (0)',
    status: 'Active',
    statusDescription: 'You are Active Full Day',
  };
}

export const workspaces = [
  { id: 'customer', label: 'Customer', icon: '👤' },
  { id: 'fleet-manager', label: 'Fleet Manager', icon: '🚚' },
  { id: 'drone-pilot', label: 'Drone Pilot', icon: '🛩' },
  { id: 'sales-aggregator', label: 'Sales Aggregator', icon: '💼' },
  { id: 'technician', label: 'Technician', icon: '🔧' },
];

export const currentWorkspace = 'technician';

export const roleSwitchOptions = [
  'Customer',
  'Drone Pilot',
  'Sales Aggregator',
  'Fleet Manager',
  'Technician',
];

export default { getMockTechnician, workspaces, currentWorkspace, roleSwitchOptions };
