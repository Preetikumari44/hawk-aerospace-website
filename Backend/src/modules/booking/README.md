# Booking Module

## Overview
The Booking module is the core of the HAWK drone delivery platform, managing the entire booking lifecycle from creation to completion. It handles customer requests, pilot assignments, pricing calculations, status tracking, and booking history.

## Features

### Core Functionality
- **Booking Creation**: Create and validate drone delivery bookings
- **Pilot Assignment**: Automatic and manual pilot assignment
- **Status Management**: Track booking through all lifecycle stages
- **Pricing Integration**: Calculate booking costs based on distance, crop type, and service
- **Booking History**: Maintain complete audit trail of booking changes
- **Filter & Search**: Advanced filtering and search capabilities
- **Real-time Updates**: WebSocket integration for live status updates

### Key Components
- `BookingService`: Core booking operations
- `BookingHistoryService`: Booking history and audit trails
- `BookingController`: REST API endpoints
- `BookingModule`: Module configuration

## Booking Lifecycle

```
pending → confirmed → pilot_assigned → in_progress → completed
                ↓
            cancelled
```

### Status Definitions
- **pending**: Initial booking created, awaiting confirmation
- **confirmed**: Booking confirmed, awaiting pilot assignment
- **pilot_assigned**: Pilot assigned, awaiting start
- **in_progress**: Drone operation in progress
- **completed**: Booking successfully completed
- **cancelled**: Booking cancelled by customer/admin

## API Endpoints

### Booking Operations
- `POST /bookings` - Create new booking
- `GET /bookings/:id` - Get booking details
- `GET /bookings` - List bookings (with filters)
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking

### Assignment & Management
- `POST /bookings/:id/assign-pilot` - Assign pilot to booking
- `POST /bookings/:id/auto-assign` - Auto-assign available pilot
- `PUT /bookings/:id/status` - Update booking status
- `POST /bookings/:id/reschedule` - Reschedule booking

### History & Tracking
- `GET /bookings/:id/history` - Get booking history
- `GET /bookings/:id/tracking` - Real-time tracking info
- `GET /bookings/:id/pilot` - Get assigned pilot details

### Analytics
- `GET /bookings/stats` - Booking statistics
- `GET /bookings/revenue` - Revenue analytics
- `GET /bookings/trends` - Booking trends

## Data Models

### Booking Interface
```typescript
interface IBooking {
  bookingId: string;
  customerId: string;
  pilotId?: string;
  droneId?: string;
  
  // Service details
  serviceType: 'spraying' | 'surveillance' | 'mapping';
  cropType: string;
  farmLocation: {
    latitude: number;
    longitude: number;
    address: string;
    farmSize: number; // in acres
  };
  
  // Scheduling
  scheduledDate: Date;
  scheduledTime: string;
  estimatedDuration: number; // in minutes
  
  // Pricing
  estimatedPrice: number;
  finalPrice?: number;
  currency: string;
  
  // Status
  status: BookingStatus;
  statusHistory: StatusChange[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}
```

### Booking Filter DTO
```typescript
interface BookingFilterDto {
  status?: BookingStatus;
  customerId?: string;
  pilotId?: string;
  serviceType?: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
```

## Usage Example

```typescript
import { BookingService } from './booking.service';

// Create new booking
const booking = await bookingService.create({
  customerId: 'cust123',
  serviceType: 'spraying',
  cropType: 'wheat',
  farmLocation: {
    latitude: 28.7041,
    longitude: 77.1025,
    address: 'Farm Address',
    farmSize: 10
  },
  scheduledDate: new Date('2024-07-15'),
  scheduledTime: '09:00'
});

// Auto-assign pilot
await bookingService.autoAssignPilot(booking.bookingId);

// Update status
await bookingService.updateStatus(
  booking.bookingId,
  'in_progress',
  'Pilot has started the operation'
);

// Get booking history
const history = await bookingService.getBookingHistory(
  booking.bookingId
);

// Filter bookings
const bookings = await bookingService.findAll({
  status: 'completed',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  page: 1,
  limit: 20
});
```

## Business Logic

### Pilot Assignment Rules
1. Pilot must be available on scheduled date/time
2. Pilot must have compatible drone available
3. Pilot location should be within service radius
4. Pilot rating should be above minimum threshold
5. Priority given to pilots with matching expertise

### Pricing Calculation
```typescript
basePrice = farmSize × cropRatePerAcre
serviceCharge = basePrice × serviceMultiplier
distanceCharge = distance × ratePerKm
totalPrice = basePrice + serviceCharge + distanceCharge
```

### Cancellation Policy
- Free cancellation: 24 hours before scheduled time
- 50% charge: 12-24 hours before
- Full charge: Less than 12 hours before

## Dependencies
- Firebase Firestore
- Pricing Module
- Pilot Module
- Fleet Module
- Notification Module
- Payment Module

## WebSocket Events

### Emitted Events
- `booking:created` - New booking created
- `booking:updated` - Booking status changed
- `booking:pilot-assigned` - Pilot assigned to booking
- `booking:started` - Booking operation started
- `booking:completed` - Booking completed
- `booking:cancelled` - Booking cancelled

### Subscribed Events
- `pilot:location-update` - Real-time pilot location
- `drone:status-update` - Drone status changes

## Notifications

The module triggers notifications for:
- Booking confirmation
- Pilot assignment
- Operation start
- Operation completion
- Booking cancellation
- Rescheduling updates

## Related Modules
- [Customer Module](../customer/README.md)
- [Pilot Module](../pilot/README.md)
- [Pricing Module](../pricing/README.md)
- [Payment Module](../payment/README.md)
- [Fleet Module](../fleet/README.md)
- [Notification Module](../notification/README.md)

## Testing
Run tests with:
```bash
npm test -- booking.service.spec.ts
npm test -- booking-history.service.spec.ts
```

## Performance Optimization
- Firestore composite indexes for complex queries
- Caching frequently accessed bookings
- Pagination for large result sets
- Batch operations for bulk updates
- Lazy loading of related entities

## Error Handling
- `BookingNotFoundException`: Booking ID not found
- `PilotNotAvailableException`: No pilots available for assignment
- `InvalidBookingStatusException`: Invalid status transition
- `BookingCancellationException`: Cannot cancel booking
- `DuplicateBookingException`: Duplicate booking detected
