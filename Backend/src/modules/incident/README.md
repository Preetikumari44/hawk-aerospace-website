# Incident Module

## Overview
Manages incident reporting, tracking, and resolution for drone operations including accidents, near-misses, technical failures, and safety events.

## Features
- Incident reporting and logging
- Severity classification
- Investigation management
- Evidence collection (photos/videos)
- Root cause analysis
- Regulatory compliance reporting
- Insurance claim integration

## API Endpoints
- `POST /incidents` - Report incident
- `GET /incidents/:id` - Get incident details
- `GET /incidents` - List incidents
- `PUT /incidents/:id` - Update incident
- `POST /incidents/:id/investigation` - Add investigation notes
- `POST /incidents/:id/close` - Close incident

## Incident Types
- Drone crash
- Near-miss collision
- Property damage
- Injury
- Technical malfunction
- Weather-related
- Pilot error
- Communication failure

## Severity Levels
- **Critical**: Injury, major damage, regulatory violation
- **High**: Significant property damage, service disruption
- **Medium**: Minor damage, near-miss
- **Low**: Technical glitch, no impact

## Data Model
```typescript
interface IIncident {
  incidentId: string;
  bookingId?: string;
  droneId: string;
  pilotId: string;
  type: IncidentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: GeoPoint;
  reportedBy: string;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  evidence: string[];
  rootCause?: string;
  corrective Actions?: string[];
  reportedAt: Date;
  resolvedAt?: Date;
}
```

## Usage Example
```typescript
const incident = await incidentService.report({
  droneId: 'drone123',
  pilotId: 'pilot456',
  type: 'technical_malfunction',
  severity: 'high',
  description: 'Motor failure during operation',
  location: { latitude: 28.7041, longitude: 77.1025 }
});
```

## Related Modules
- [Fleet Module](../fleet/README.md)
- [Pilot Module](../pilot/README.md)
- [Booking Module](../booking/README.md)

## Testing
```bash
npm test -- incident.service.spec.ts
```
