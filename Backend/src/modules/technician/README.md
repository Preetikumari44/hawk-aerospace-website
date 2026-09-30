# Technician Module

## Overview
Manages drone technicians responsible for maintenance, repairs, and health checks of the drone fleet.

## Features
- Technician registration and management
- Work ticket assignment
- Diagnosis and repair tracking
- Parts inventory management
- Service history
- Performance metrics
- Availability scheduling

## Key Components
- `TechnicianService`: Core technician operations
- `TechnicianController`: API endpoints

## API Endpoints
- `GET /technicians/profile` - Get technician profile
- `GET /technicians/tickets` - Get assigned tickets
- `POST /technicians/tickets/:id/diagnose` - Add diagnosis
- `POST /technicians/tickets/:id/complete` - Complete work
- `POST /technicians/parts/request` - Request parts
- `GET /technicians/schedule` - View schedule

## Data Model
```typescript
interface ITechnician {
  technicianId: string;
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  certifications: Certification[];
  status: 'available' | 'busy' | 'off_duty';
  completedTickets: number;
  rating: number;
}
```

## Usage Example
```typescript
await technicianService.addDiagnosis(ticketId, {
  issue: 'Motor malfunction',
  severity: 'high',
  estimatedRepairTime: 4,
  partsRequired: ['motor_shaft', 'bearing']
});
```

## Related Modules
- [Fleet Module](../fleet/README.md)
- [Service Centre Module](../service-centre/README.md)

## Testing
```bash
npm test -- technician.service.spec.ts
```
