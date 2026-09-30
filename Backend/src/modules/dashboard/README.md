# Dashboard Module

## Overview
Provides analytics, metrics, and dashboard data for different user roles (customers, pilots, admins, fleet managers, aggregators).

## Features
- Role-specific dashboards
- Real-time statistics
- Revenue analytics
- Performance metrics
- Booking trends
- Fleet utilization
- Custom date range filtering

## API Endpoints
- `GET /dashboard/customer` - Customer dashboard
- `GET /dashboard/pilot` - Pilot dashboard
- `GET /dashboard/admin` - Admin dashboard
- `GET /dashboard/fleet-manager` - Fleet manager dashboard
- `GET /dashboard/aggregator` - Aggregator dashboard

## Metrics Provided
- Total bookings
- Revenue (daily/monthly/yearly)
- Active users
- Fleet status
- Pilot availability
- Complaint statistics
- Performance KPIs

## Usage Example
```typescript
const dashboard = await dashboardService.getAdminDashboard({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

## Related Modules
- All modules (aggregates data from all sources)

## Testing
```bash
npm test -- dashboard.service.spec.ts
```
