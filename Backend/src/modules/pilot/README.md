# Pilot Module

## Overview
The Pilot module manages drone pilots including registration, certification, mission assignments, performance tracking, and earnings management.

## Features
- Pilot onboarding and KYC verification
- License and certification management
- Mission assignment and tracking
- Availability management
- Performance metrics and ratings
- Earnings and payout management
- Auto-assignment algorithms

## Key Components
- `PilotService`: Core pilot operations
- `PilotAdminService`: Admin-specific pilot management
- `MissionService`: Mission management
- `PilotController`: Pilot API endpoints
- `PilotAdminController`: Admin API endpoints

## API Endpoints

### Pilot Operations
- `POST /pilots/register` - Register new pilot
- `GET /pilots/profile` - Get pilot profile
- `PUT /pilots/profile` - Update profile
- `PUT /pilots/availability` - Update availability
- `GET /pilots/missions` - Get assigned missions
- `GET /pilots/earnings` - View earnings

### Admin Operations
- `GET /admin/pilots` - List all pilots
- `POST /admin/pilots/:id/verify` - Verify pilot KYC
- `POST /admin/pilots/:id/assign-booking` - Manual booking assignment
- `PUT /admin/pilots/:id/status` - Update pilot status
- `GET /admin/pilots/performance` - Performance analytics

## Data Model
```typescript
interface IPilot {
  pilotId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: 'pending' | 'active' | 'suspended';
  rating: number;
  totalMissions: number;
  totalEarnings: number;
  availability: AvailabilitySchedule;
  location: GeoPoint;
}
```

## Related Modules
- [Booking Module](../booking/README.md)
- [Fleet Module](../fleet/README.md)
- [Payment Module](../payment/README.md)

## Testing
```bash
npm test -- pilot.service.spec.ts
```
