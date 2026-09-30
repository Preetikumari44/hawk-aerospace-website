// Technician Home / dashboard metrics. Values are data-driven and must
// never be fabricated — where the source has no data, show 0 / an
// empty state rather than an invented number.

export function getMockDashboardOverview() {
  return {
    totalEarnings: 0,
    totalRepairs: 0,
    upcomingTickets: 0,
    rejectedTickets: 0,
  };
}

export const earningsOverview = {
  earnings: 0,
  pendingEarnings: 0,
  pendingNote:
    'Pending is the amount which is being processed and will be added to payout as soon as possible',
};

export const earningsGraphMeta = {
  hasData: false,
  emptyMessage: 'No earnings data available',
  defaultRange: 'Last 1 year',
};

export const rewards = {
  hasData: false,
  emptyMessage: 'No rewards available.',
};

export const scheduleStatusLegend = [
  { id: 'full-active', label: 'Full Day', state: 'Active' },
  { id: 'morning-off', label: 'Morning', state: 'Off-Duty' },
  { id: 'evening-off', label: 'Evening', state: 'Off-Duty' },
  { id: 'full-off', label: 'Full Day', state: 'Off-Duty' },
];

export default {
  getMockDashboardOverview,
  earningsOverview,
  earningsGraphMeta,
  rewards,
  scheduleStatusLegend,
};
