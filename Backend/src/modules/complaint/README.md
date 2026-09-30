# Complaint Module

## Overview
The Complaint module manages customer complaints, issues, and feedback related to drone delivery services. It provides a comprehensive system for logging, tracking, resolving, and analyzing customer complaints.

## Features

### Core Functionality
- **Complaint Registration**: Log customer complaints with detailed information
- **Priority Management**: Categorize complaints by severity (low, medium, high, critical)
- **Status Tracking**: Track complaint resolution progress
- **Assignment System**: Assign complaints to appropriate support personnel
- **Resolution Tracking**: Document resolution steps and outcomes
- **Escalation Management**: Automatic escalation for unresolved complaints
- **Reporting**: Generate complaint analytics and reports

### Key Components
- `ComplaintService`: Core complaint operations
- `ComplaintController`: REST API endpoints
- `ComplaintModule`: Module configuration

## Complaint Lifecycle

```
new → assigned → in_progress → resolved → closed
         ↓
    escalated → assigned → resolved → closed
```

### Status Definitions
- **new**: Complaint just registered
- **assigned**: Assigned to support personnel
- **in_progress**: Being actively worked on
- **escalated**: Escalated to higher management
- **resolved**: Solution provided
- **closed**: Complaint closed after resolution

## API Endpoints

### Complaint Operations
- `POST /complaints` - Register new complaint
- `GET /complaints/:id` - Get complaint details
- `GET /complaints` - List complaints (with filters)
- `PUT /complaints/:id` - Update complaint
- `DELETE /complaints/:id` - Delete complaint (admin only)

### Management Operations
- `POST /complaints/:id/assign` - Assign to support agent
- `PUT /complaints/:id/status` - Update status
- `POST /complaints/:id/escalate` - Escalate complaint
- `POST /complaints/:id/resolve` - Mark as resolved
- `POST /complaints/:id/close` - Close complaint

### Communication
- `POST /complaints/:id/comments` - Add comment/update
- `GET /complaints/:id/comments` - Get comment history
- `POST /complaints/:id/attachments` - Upload evidence/attachments

### Analytics
- `GET /complaints/stats` - Complaint statistics
- `GET /complaints/trends` - Complaint trends
- `GET /complaints/categories` - Complaints by category

## Data Models

### Complaint Interface
```typescript
interface IComplaint {
  complaintId: string;
  
  // Customer info
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Related entities
  bookingId?: string;
  pilotId?: string;
  droneId?: string;
  
  // Complaint details
  category: ComplaintCategory;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: ComplaintStatus;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Resolution
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Escalation
  escalatedTo?: string;
  escalatedAt?: Date;
  escalationReason?: string;
  
  // Attachments
  attachments?: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Complaint Categories
```typescript
enum ComplaintCategory {
  SERVICE_QUALITY = 'service_quality',
  PILOT_BEHAVIOR = 'pilot_behavior',
  DRONE_MALFUNCTION = 'drone_malfunction',
  PAYMENT_ISSUE = 'payment_issue',
  BOOKING_ISSUE = 'booking_issue',
  DELIVERY_DELAY = 'delivery_delay',
  DAMAGED_CROPS = 'damaged_crops',
  PRICING_DISPUTE = 'pricing_dispute',
  APP_TECHNICAL = 'app_technical',
  OTHER = 'other'
}
```

## Usage Example

```typescript
import { ComplaintService } from './complaint.service';

// Register complaint
const complaint = await complaintService.create({
  customerId: 'cust123',
  bookingId: 'book456',
  category: ComplaintCategory.SERVICE_QUALITY,
  subject: 'Poor spraying quality',
  description: 'The drone missed several areas of my farm',
  priority: 'high'
});

// Assign to support agent
await complaintService.assign(complaint.complaintId, {
  assignedTo: 'agent123',
  notes: 'Assigned to senior support agent'
});

// Update status
await complaintService.updateStatus(
  complaint.complaintId,
  'in_progress',
  'Investigating the issue'
);

// Escalate if needed
await complaintService.escalate(complaint.complaintId, {
  escalatedTo: 'manager456',
  reason: 'Requires management approval for refund'
});

// Resolve complaint
await complaintService.resolve(complaint.complaintId, {
  resolution: 'Full refund processed and rescheduled service',
  compensationType: 'refund',
  compensationAmount: 5000
});

// Get statistics
const stats = await complaintService.getStatistics({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

## Business Logic

### Auto-Escalation Rules
- High priority complaints unresolved for 24 hours
- Critical priority complaints unresolved for 6 hours
- Complaints with specific keywords (legal, police, media)
- Multiple complaints from same customer

### Priority Assignment
```typescript
priority = calculatePriority({
  customerTier: 'premium' | 'regular',
  complaintCategory: ComplaintCategory,
  financialImpact: number,
  repeatComplaint: boolean,
  timeElapsed: number
});
```

### SLA Targets
- **Critical**: 6 hours response, 24 hours resolution
- **High**: 12 hours response, 48 hours resolution
- **Medium**: 24 hours response, 5 days resolution
- **Low**: 48 hours response, 7 days resolution

## Dependencies
- Firebase Firestore
- Notification Module
- Customer Module
- Booking Module
- File Storage Module

## Notifications

Triggered for:
- New complaint registered
- Complaint assigned
- Status updates
- Escalations
- Resolution confirmation
- Complaint closed

## Related Modules
- [Customer Module](../customer/README.md)
- [Booking Module](../booking/README.md)
- [Pilot Module](../pilot/README.md)
- [Notification Module](../notification/README.md)

## Analytics & Reporting

### Key Metrics
- Total complaints by period
- Resolution rate
- Average resolution time
- Complaints by category
- Repeat complaint rate
- Customer satisfaction score

### Reports Generated
- Daily complaint summary
- Monthly trend analysis
- Category-wise breakdown
- Agent performance report
- Escalation report

## Testing
Run tests with:
```bash
npm test -- complaint.service.spec.ts
```

## Error Handling
- `ComplaintNotFoundException`: Complaint ID not found
- `InvalidStatusTransitionException`: Invalid status change
- `UnauthorizedAccessException`: User cannot access complaint
- `DuplicateComplaintException`: Similar complaint already exists
