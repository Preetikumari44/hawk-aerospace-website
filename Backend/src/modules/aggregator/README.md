# Aggregator Module

## Overview
The Aggregator module manages Sales Aggregators (SA) who act as intermediaries between customers and the drone delivery platform. Aggregators handle territory management, document verification, and customer acquisition.

## Features

### Core Functionality
- **Aggregator Management**: Onboarding, profile management, and status tracking
- **Territory Management**: Assign and manage geographical territories
- **Document Verification**: KYC and business document validation
- **Commission Tracking**: Calculate and manage aggregator earnings
- **Customer Acquisition**: Track customers brought by each aggregator

### Key Components
- `AggregatorService`: Core aggregator operations
- `SAManagementService`: Sales aggregator specific management
- `TerritoryService`: Territory assignment and management
- `DocumentVerificationService`: KYC and document validation
- `AggregatorController`: REST API endpoints

## API Endpoints

### Aggregator Operations
- `POST /aggregators/register` - Register new aggregator
- `GET /aggregators/profile` - Get aggregator profile
- `PUT /aggregators/profile` - Update aggregator profile
- `GET /aggregators/dashboard` - Aggregator dashboard stats

### Territory Management
- `GET /aggregators/territories` - List available territories
- `POST /aggregators/territories/request` - Request territory assignment
- `GET /aggregators/territories/assigned` - Get assigned territories

### Document Management
- `POST /aggregators/documents/upload` - Upload verification documents
- `GET /aggregators/documents/status` - Check verification status
- `PUT /aggregators/documents/resubmit` - Resubmit rejected documents

### Commission & Earnings
- `GET /aggregators/commissions` - View commission history
- `GET /aggregators/earnings` - Calculate total earnings
- `POST /aggregators/payout/request` - Request payout

## Data Models

### Aggregator Interface
```typescript
interface ISalesAggregator {
  aggregatorId: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  territories: string[];
  commissionRate: number;
  totalEarnings: number;
  documents: DocumentVerification[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Dependencies
- Firebase Firestore
- File Storage Module
- Notification Module
- Authentication Module

## Usage Example

```typescript
import { AggregatorService } from './aggregator.service';

// Register new aggregator
const aggregator = await aggregatorService.register({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  territory: 'North District'
});

// Verify documents
await aggregatorService.verifyDocuments(
  aggregatorId,
  { status: 'approved' }
);

// Calculate earnings
const earnings = await aggregatorService.calculateEarnings(
  aggregatorId,
  { startDate, endDate }
);
```

## Business Logic

### Commission Calculation
- Base commission rate: 5-15% depending on volume
- Bonus for high-performing aggregators
- Tiered commission structure based on monthly bookings

### Territory Assignment
- One aggregator per territory (exclusive)
- Territory performance monitoring
- Reassignment based on performance metrics

## Related Modules
- [Customer Module](../customer/README.md)
- [Booking Module](../booking/README.md)
- [Payment Module](../payment/README.md)

## Testing
Run tests with:
```bash
npm test -- aggregator.service.spec.ts
```
