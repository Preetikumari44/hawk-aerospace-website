# Revenue Module

## Overview
Tracks and analyzes revenue across different dimensions including bookings, pilots, aggregators, and time periods.

## Features
- Revenue tracking by booking
- Aggregator commission calculation
- Pilot earnings tracking
- Revenue analytics and reporting
- Financial reconciliation
- Revenue forecasting
- Tax calculations

## API Endpoints
- `GET /revenue/bookings` - Revenue by bookings
- `GET /revenue/aggregators` - Aggregator commissions
- `GET /revenue/pilots` - Pilot earnings
- `GET /revenue/analytics` - Revenue analytics
- `GET /revenue/report` - Generate revenue report

## Data Model
```typescript
interface IRevenue {
  revenueId: string;
  bookingId: string;
  totalAmount: number;
  platformFee: number;
  aggregatorCommission: number;
  pilotEarnings: number;
  netRevenue: number;
  currency: string;
  recordedAt: Date;
}
```

## Usage Example
```typescript
const report = await revenueService.getReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  groupBy: 'month'
});
```

## Related Modules
- [Booking Module](../booking/README.md)
- [Payment Module](../payment/README.md)
- [Aggregator Module](../aggregator/README.md)

## Testing
```bash
npm test -- revenue.service.spec.ts
```
