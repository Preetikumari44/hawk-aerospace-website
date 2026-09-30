# Fleet Manager API Documentation

This module provides comprehensive endpoints for managing fleet managers and their associated resources (pilots, drones, bookings, maintenance tickets, and support tickets).

## Base URL
```
/fleet-managers
```

## Authentication
All endpoints require admin role authentication.

## Endpoints

### 1. List All Fleet Managers
Get a paginated list of all fleet managers with optional filters.

**Endpoint:** `GET /fleet-managers`

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by status - `ACTIVE` | `INACTIVE`
- `approvalStatus` (optional, string): Filter by approval status - `PENDING` | `APPROVED` | `REJECTED`
- `state` (optional, string): Filter by state name
- `region` (optional, string): Filter by region name
- `district` (optional, string): Filter by district name
- `search` (optional, string): Search by name, email, or mobile

**Response:**
```json
{
  "data": [
    {
      "fleetManagerId": "FM001",
      "fullName": "Vikas Agarwal",
      "mobile": "9790847608",
      "email": "vikas.agarwal363@yahoo.com",
      "status": "ACTIVE",
      "approvalStatus": "APPROVED",
      "assignedPilots": 2,
      "assignedDrones": 3,
      "activeBookings": 5,
      "completedBookings": 56,
      "totalRevenue": 404096,
      "region": "Ahmednagar",
      "state": "Maharashtra",
      "district": "Ahmednagar",
      "rating": 4.6,
      "responseTime": 29,
      "licenseNumber": "DGCA-MA-2024-000001",
      "licenseExpiry": "2032-06-25T18:30:00.000Z",
      "createdAt": "2025-08-15T12:06:00.000Z",
      "updatedAt": "2025-08-15T12:06:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

**Example Requests:**
```bash
# Get all fleet managers
GET /fleet-managers?page=1&limit=20

# Get only active fleet managers
GET /fleet-managers?status=ACTIVE

# Get fleet managers in Maharashtra
GET /fleet-managers?state=Maharashtra

# Get pending approval fleet managers
GET /fleet-managers?approvalStatus=PENDING
```

---

### 2. Get Fleet Manager Profile
Get detailed profile information for a specific fleet manager.

**Endpoint:** `GET /fleet-managers/:id`

**Path Parameters:**
- `id` (required, string): Fleet manager ID (e.g., "FM001")

**Response:**
```json
{
  "fleetManager": {
    "fleetManagerId": "FM001",
    "fullName": "Vikas Agarwal",
    "mobile": "9790847608",
    "email": "vikas.agarwal363@yahoo.com",
    "firebaseUid": "Nr68SMkhjd2fDsaucs8hyHWHoVE6",
    "status": "ACTIVE",
    "approvalStatus": "APPROVED",
    "assignedPilots": 2,
    "assignedDrones": 3,
    "activeBookings": 5,
    "completedBookings": 56,
    "totalRevenue": 404096,
    "region": "Ahmednagar",
    "state": "Maharashtra",
    "district": "Ahmednagar",
    "coverageRadius": 92,
    "licenseNumber": "DGCA-MA-2024-000001",
    "licenseType": "RPAS Operator Permit",
    "licenseIssueDate": "2024-06-15T18:30:00.000Z",
    "licenseExpiry": "2032-06-25T18:30:00.000Z",
    "panNumber": "FGHIJ3595B",
    "gstNumber": "15ABCDE9698B1Z1",
    "bankDetails": {
      "accountNumber": "539027777777",
      "ifscCode": "HDFC0894174",
      "accountHolderName": "Vikas Agarwal",
      "bankName": "ICICI Bank"
    },
    "rating": 4.6,
    "responseTime": 29,
    "address": "19, Main Road, Ahmednagar",
    "pincode": "782241",
    "createdAt": "2025-08-15T12:06:00.000Z",
    "updatedAt": "2025-08-15T12:06:00.000Z"
  }
}
```

**Example Request:**
```bash
GET /fleet-managers/FM001
```

---

### 3. Get Fleet Manager Statistics
Get statistical data for a fleet manager over a specific time period.

**Endpoint:** `GET /fleet-managers/:id/stats`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `period` (optional, string): Time period - `week` | `month` | `year` (default: `month`)

**Response:**
```json
{
  "period": "month",
  "startDate": "2026-06-01T00:00:00.000Z",
  "endDate": "2026-06-26T00:00:00.000Z",
  "bookings": {
    "total": 25,
    "completed": 18,
    "active": 5,
    "cancelled": 2
  },
  "revenue": {
    "total": 125000,
    "average": 6944
  }
}
```

**Example Requests:**
```bash
# Get monthly stats
GET /fleet-managers/FM001/stats?period=month

# Get yearly stats
GET /fleet-managers/FM001/stats?period=year
```

---

### 4. Get Assigned Pilots
Get all pilots assigned to a specific fleet manager.

**Endpoint:** `GET /fleet-managers/:id/pilots`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by pilot status - `AVAILABLE` | `ON_MISSION` | `ON_BREAK` | `OFFLINE`

**Response:**
```json
{
  "data": [
    {
      "pilotId": "PLT001",
      "fullName": "Ajay More",
      "mobile": "9876543210",
      "email": "ajay.more@example.com",
      "assignedFleetManagerId": "FM001",
      "currentDroneId": "DR001",
      "status": "ON_MISSION",
      "licenseNumber": "DGCA-PLT-2024-001",
      "licenseExpiry": "2029-12-31T18:30:00.000Z",
      "rating": 4.8,
      "flightHours": 520,
      "missions": 150,
      "completedMissions": 145,
      "onTimePercentage": 96.7,
      "safetyScore": 98.5,
      "state": "Maharashtra",
      "district": "Ahmednagar",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "lastActiveAt": "2026-06-26T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

**Example Requests:**
```bash
# Get all pilots
GET /fleet-managers/FM001/pilots

# Get only available pilots
GET /fleet-managers/FM001/pilots?status=AVAILABLE
```

---

### 5. Get Assigned Drones
Get all drones assigned to a specific fleet manager.

**Endpoint:** `GET /fleet-managers/:id/drones`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by drone status - `AVAILABLE` | `IN_USE` | `MAINTENANCE` | `OUT_OF_SERVICE`

**Response:**
```json
{
  "data": [
    {
      "droneId": "DR001",
      "model": "DJI Agras T30",
      "manufacturer": "DJI",
      "serialNumber": "DJI202400000001",
      "assignedFleetManagerId": "FM001",
      "currentPilotId": "PLT001",
      "currentBookingId": "BK0001",
      "status": "IN_USE",
      "serviceCapabilities": ["SPRAYING", "SEEDING"],
      "batteryHealth": 95,
      "flightHours": 320,
      "missions": 180,
      "completedMissions": 175,
      "lastMaintenance": "2026-05-15T00:00:00.000Z",
      "nextMaintenance": "2026-07-15T00:00:00.000Z",
      "registrationNumber": "IN-RPAS-MA-12345",
      "registrationExpiry": "2030-12-31T18:30:00.000Z",
      "insuranceExpiry": "2027-06-30T18:30:00.000Z",
      "overallCondition": "Excellent",
      "createdAt": "2024-01-10T00:00:00.000Z",
      "lastFlightAt": "2026-06-26T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

**Example Requests:**
```bash
# Get all drones
GET /fleet-managers/FM001/drones

# Get only available drones
GET /fleet-managers/FM001/drones?status=AVAILABLE

# Get drones under maintenance
GET /fleet-managers/FM001/drones?status=MAINTENANCE
```

---

### 6. Get Fleet Manager Bookings
Get all bookings associated with a specific fleet manager.

**Endpoint:** `GET /fleet-managers/:id/bookings`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by booking status - `PENDING` | `CONFIRMED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
- `startDate` (optional, string): Filter bookings from this date (ISO 8601 format)
- `endDate` (optional, string): Filter bookings until this date (ISO 8601 format)

**Response:**
```json
{
  "data": [
    {
      "bookingId": "BK0001",
      "bookingNumber": "BKG-2026-00001",
      "bookingSource": "CUSTOMER",
      "customerId": "CUS0051",
      "fleetManagerId": "FM001",
      "pilotId": "PLT001",
      "droneId": "DR001",
      "farmId": "FARM102",
      "serviceType": "SPRAYING",
      "serviceSubType": "Pesticide",
      "cropType": "Rice",
      "area": 10.5,
      "unit": "Acres",
      "priority": "HIGH",
      "scheduledStart": "2026-06-27T06:00:00.000Z",
      "scheduledEnd": "2026-06-27T08:30:00.000Z",
      "location": {
        "state": "Maharashtra",
        "district": "Ahmednagar",
        "village": "Rahuri",
        "lat": 19.3919,
        "lng": 74.6491
      },
      "price": {
        "basePrice": 5250,
        "chemicalCost": 2000,
        "travelCost": 500,
        "tax": 1395,
        "total": 9145
      },
      "paymentStatus": "PAID",
      "bookingStatus": "CONFIRMED",
      "createdAt": "2026-06-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 56,
    "totalPages": 3
  }
}
```

**Example Requests:**
```bash
# Get all bookings
GET /fleet-managers/FM001/bookings

# Get completed bookings
GET /fleet-managers/FM001/bookings?status=COMPLETED

# Get bookings in date range
GET /fleet-managers/FM001/bookings?startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.000Z

# Get active bookings
GET /fleet-managers/FM001/bookings?status=IN_PROGRESS
```

---

### 7. Get Maintenance Tickets
Get all maintenance tickets for drones managed by this fleet manager.

**Endpoint:** `GET /fleet-managers/:id/maintenance-tickets`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by status - `OPEN` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
- `priority` (optional, string): Filter by priority - `LOW` | `NORMAL` | `HIGH` | `URGENT`

**Response:**
```json
{
  "data": [
    {
      "ticketId": "MNT0001",
      "ticketNumber": "MNT-2026-0001",
      "category": "Routine Service",
      "droneId": "DR001",
      "fleetManagerId": "FM001",
      "title": "Scheduled maintenance for DJI Agras T30",
      "description": "Routine inspection and service",
      "priority": "NORMAL",
      "status": "COMPLETED",
      "reportedBy": "FM001",
      "assignedTo": "TECH-101",
      "assignedTechnician": "Rajesh Kumar",
      "estimatedCost": 5000,
      "actualCost": 4800,
      "estimatedDuration": 120,
      "actualDuration": 105,
      "partsReplaced": ["Battery", "Propellers"],
      "createdAt": "2026-06-01T00:00:00.000Z",
      "completedAt": "2026-06-02T00:00:00.000Z",
      "resolution": "Maintenance completed successfully. Drone tested and operational."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Example Requests:**
```bash
# Get all maintenance tickets
GET /fleet-managers/FM001/maintenance-tickets

# Get open tickets
GET /fleet-managers/FM001/maintenance-tickets?status=OPEN

# Get urgent priority tickets
GET /fleet-managers/FM001/maintenance-tickets?priority=URGENT

# Get in-progress tickets
GET /fleet-managers/FM001/maintenance-tickets?status=IN_PROGRESS
```

---

### 8. Get Support Tickets
Get all customer support tickets related to bookings handled by this fleet manager.

**Endpoint:** `GET /fleet-managers/:id/support-tickets`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)
- `status` (optional, string): Filter by status - `PENDING` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`
- `priority` (optional, string): Filter by priority - `LOW` | `NORMAL` | `HIGH` | `URGENT`

**Response:**
```json
{
  "data": [
    {
      "ticketId": "SUP0001",
      "ticketNumber": "SUP-2026-0001",
      "category": "Service Quality",
      "customerId": "CUS0051",
      "bookingId": "BK0001",
      "subject": "Excellent service quality",
      "description": "Very satisfied with the spraying service",
      "priority": "NORMAL",
      "status": "RESOLVED",
      "submittedBy": "CUS0051",
      "assignedTo": "AGENT-101",
      "channel": "App",
      "responseTime": 15,
      "resolutionTime": 30,
      "createdAt": "2026-06-25T00:00:00.000Z",
      "resolvedAt": "2026-06-25T01:00:00.000Z",
      "resolution": "Customer feedback recorded. Thank you!",
      "customerSatisfactionRating": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

**Example Requests:**
```bash
# Get all support tickets
GET /fleet-managers/FM001/support-tickets

# Get pending tickets
GET /fleet-managers/FM001/support-tickets?status=PENDING

# Get high priority tickets
GET /fleet-managers/FM001/support-tickets?priority=HIGH

# Get resolved tickets
GET /fleet-managers/FM001/support-tickets?status=RESOLVED
```

---

### 9. Get Fleet Manager Dashboard
Get comprehensive dashboard data combining all metrics for a fleet manager.

**Endpoint:** `GET /fleet-managers/:id/dashboard`

**Path Parameters:**
- `id` (required, string): Fleet manager ID

**Response:**
```json
{
  "fleetManager": {
    "fleetManagerId": "FM001",
    "fullName": "Vikas Agarwal",
    "status": "ACTIVE",
    "rating": 4.6,
    "totalRevenue": 404096,
    "region": "Ahmednagar",
    "state": "Maharashtra"
  },
  "summary": {
    "totalPilots": 2,
    "totalDrones": 3,
    "totalBookings": 56,
    "completedBookings": 51,
    "totalRevenue": 404096,
    "averageCustomerRating": 4.5
  },
  "pilots": {
    "total": 2,
    "byStatus": {
      "AVAILABLE": 0,
      "ON_MISSION": 2,
      "ON_BREAK": 0,
      "OFFLINE": 0
    }
  },
  "drones": {
    "total": 3,
    "byStatus": {
      "AVAILABLE": 1,
      "IN_USE": 2,
      "MAINTENANCE": 0,
      "OUT_OF_SERVICE": 0
    }
  },
  "bookings": {
    "total": 56,
    "byStatus": {
      "PENDING": 0,
      "CONFIRMED": 2,
      "IN_PROGRESS": 3,
      "COMPLETED": 51,
      "CANCELLED": 0
    }
  },
  "maintenance": {
    "total": 12,
    "byStatus": {
      "OPEN": 1,
      "IN_PROGRESS": 2,
      "COMPLETED": 9
    },
    "byPriority": {
      "URGENT": 1,
      "HIGH": 3,
      "NORMAL": 6,
      "LOW": 2
    }
  },
  "support": {
    "total": 8,
    "byStatus": {
      "PENDING": 1,
      "IN_PROGRESS": 2,
      "RESOLVED": 4,
      "CLOSED": 1
    },
    "averageRating": 4.5
  }
}
```

**Example Request:**
```bash
GET /fleet-managers/FM001/dashboard
```

---

## Data Relationships

The fleet manager system integrates data from multiple collections:

### Direct Relationships
- **Fleet Managers → Pilots**: Via `pilots.assignedFleetManagerId`
- **Fleet Managers → Drones**: Via `drones.assignedFleetManagerId`
- **Fleet Managers → Bookings**: Via `bookings.fleetManagerId`
- **Fleet Managers → Maintenance Tickets**: Via `maintenanceTickets.fleetManagerId`

### Indirect Relationships
- **Fleet Managers → Support Tickets**: Via `bookings.bookingId` → `supportTickets.bookingId`

### Collection Names
Based on the seed data, the following Firestore collections are used:
- `fleetManagers` - Fleet manager profiles
- `pilots` - Pilot information
- `drones` - Drone inventory
- `bookings` - Service bookings
- `maintenanceTickets` - Drone maintenance records
- `supportTickets` - Customer support tickets

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Fleet manager FM999 not found",
  "error": "Not Found"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

## Notes

1. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters
2. **Filters**: Most endpoints support filtering by status, priority, or date ranges
3. **Authentication**: All endpoints require admin authentication
4. **Firestore Limitations**: 
   - The `in` query is limited to 10 values
   - Support tickets are fetched in batches when there are many bookings
5. **Performance**: Dashboard endpoint may be slower for fleet managers with large amounts of data due to aggregation

## Frontend Integration

Example usage in frontend:

```typescript
// Fetch fleet managers list
const response = await fetch('/api/fleet-managers?page=1&limit=20&status=ACTIVE');
const { data, pagination } = await response.json();

// Get fleet manager dashboard
const dashboard = await fetch('/api/fleet-managers/FM001/dashboard');
const dashboardData = await dashboard.json();

// Get assigned pilots
const pilots = await fetch('/api/fleet-managers/FM001/pilots?status=AVAILABLE');
const pilotData = await pilots.json();
```
