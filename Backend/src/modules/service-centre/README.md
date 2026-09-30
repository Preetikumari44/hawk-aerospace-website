# Service Centre Module

## Overview
Manages drone service centres including maintenance scheduling, ticket management, technician assignments, and service operations.

## Features
- Service centre management
- Maintenance ticket creation and tracking
- Technician assignment
- Schedule management
- Service history
- Inventory tracking
- Quality assurance

## API Endpoints
- `POST /service-centre/tickets` - Create maintenance ticket
- `GET /service-centre/tickets` - List tickets
- `POST /service-centre/tickets/:id/assign` - Assign technician
- `PUT /service-centre/tickets/:id/schedule` - Schedule service
- `GET /service-centre/availability` - Check availability
- `GET /service-centre/stats` - Service centre statistics

## Data Model
```typescript
interface IServiceCentre {
  centreId: string;
  name: string;
  location: GeoPoint;
  capacity: number;
  technicians: string[];
  services: string[];
  operatingHours: Schedule;
  rating: number;
}
```

## Ticket Lifecycle
```
created → assigned → scheduled → in_service → completed → closed
```

## Usage Example
```typescript
const ticket = await serviceCentreService.createTicket({
  droneId: 'drone123',
  type: 'scheduled',
  priority: 'medium',
  description: '100-hour maintenance',
  preferredDate: new Date('2024-08-01')
});
```

## Related Modules
- [Fleet Module](../fleet/README.md)
- [Technician Module](../technician/README.md)

## Testing
```bash
npm test -- service-centre.service.spec.ts
```
