# Fleet Module

## Overview
The Fleet module manages the drone fleet including drone registration, maintenance tracking, health monitoring, pilot-drone assignments, and fleet analytics.

## Features
- Drone registration and inventory management
- Real-time health monitoring
- Maintenance scheduling and tracking
- Pilot-drone matching and assignment
- Fleet utilization analytics
- Drone availability management
- Service history tracking

## Key Components
- `FleetService`: Core fleet operations
- `FleetManagerService`: Fleet manager specific operations
- `DronePilotMatchingService`: Drone-pilot assignment logic
- `FleetController`: REST API endpoints
- `FleetManagerController`: Fleet manager endpoints

## API Endpoints

### Drone Management
- `POST /fleet/drones` - Register new drone
- `GET /fleet/drones/:id` - Get drone details
- `PUT /fleet/drones/:id` - Update drone info
- `GET /fleet/drones` - List drones (with filters)
- `DELETE /fleet/drones/:id` - Decommission drone

### Health & Maintenance
- `GET /fleet/drones/:id/health` - Get health status
- `POST /fleet/drones/:id/maintenance` - Schedule maintenance
- `GET /fleet/drones/:id/maintenance-history` - Maintenance logs
- `PUT /fleet/drones/:id/health-check` - Update health metrics

### Assignment
- `POST /fleet/assign-pilot` - Assign drone to pilot
- `GET /fleet/available-drones` - Get available drones
- `POST /fleet/match-pilot-drone` - Auto-match pilot with drone

### Analytics
- `GET /fleet/stats` - Fleet statistics
- `GET /fleet/utilization` - Utilization metrics
- `GET /fleet/maintenance-schedule` - Upcoming maintenance

## Data Models

### Drone Interface
```typescript
interface IDrone {
  droneId: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  registrationNumber: string;
  
  // Specifications
  maxPayload: number; // kg
  maxFlightTime: number; // minutes
  maxRange: number; // km
  tankCapacity: number; // liters
  
  // Status
  status: 'available' | 'in_use' | 'maintenance' | 'decommissioned';
  health: {
    battery: number;
    motorStatus: string;
    gpsStatus: string;
    cameraStatus: string;
    overallHealth: number;
  };
  
  // Assignment
  assignedPilotId?: string;
  currentLocation?: GeoPoint;
  
  // Maintenance
  lastMaintenanceDate: Date;
  nextMaintenanceDate: Date;
  totalFlightHours: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Maintenance Ticket
```typescript
interface IMaintenanceTicket {
  ticketId: string;
  droneId: string;
  type: 'scheduled' | 'emergency' | 'repair';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  technicianId?: string;
  estimatedCost?: number;
  completedAt?: Date;
}
```

## Usage Example

```typescript
import { FleetService } from './fleet.service';

// Register drone
const drone = await fleetService.registerDrone({
  model: 'DJI Agras T30',
  manufacturer: 'DJI',
  serialNumber: 'DJI123456',
  maxPayload: 30,
  maxFlightTime: 20,
  maxRange: 8
});

// Update health status
await fleetService.updateHealth(drone.droneId, {
  battery: 95,
  motorStatus: 'good',
  gpsStatus: 'excellent',
  overallHealth: 92
});

// Schedule maintenance
await fleetService.scheduleMaintenance(drone.droneId, {
  type: 'scheduled',
  scheduledDate: new Date('2024-08-01'),
  description: 'Regular 100-hour maintenance'
});

// Assign to pilot
await fleetService.assignToPilot(drone.droneId, 'pilot123');
```

## Business Logic

### Maintenance Scheduling
- Every 50 flight hours: Minor service
- Every 100 flight hours: Major service
- Annual comprehensive inspection
- Emergency maintenance based on health metrics

### Health Monitoring
```typescript
overallHealth = (
  batteryHealth * 0.3 +
  motorHealth * 0.4 +
  gpsHealth * 0.15 +
  cameraHealth * 0.15
);
```

### Auto-Assignment Rules
1. Drone must be available
2. Health status > 80%
3. Compatible with booking requirements
4. Within service range
5. Maintenance schedule allows booking duration

## Dependencies
- Firebase Firestore
- IoT sensors for real-time monitoring
- Pilot Module
- Booking Module
- Technician Module

## WebSocket Events
- `drone:location-update`
- `drone:health-update`
- `drone:battery-low`
- `drone:maintenance-required`

## Related Modules
- [Pilot Module](../pilot/README.md)
- [Booking Module](../booking/README.md)
- [Technician Module](../technician/README.md)
- [Service Centre Module](../service-centre/README.md)

## Testing
```bash
npm test -- fleet.service.spec.ts
npm test -- drone-pilot-matching.service.spec.ts
```

## Performance Monitoring
- Real-time health metrics dashboard
- Predictive maintenance alerts
- Fleet utilization optimization
- Downtime analysis
