# Customer Module

## Overview
The Customer module manages all customer-related operations including registration, profile management, booking history, and customer analytics for the HAWK drone delivery platform.

## Features

### Core Functionality
- **Customer Registration**: Onboard new customers
- **Profile Management**: Update customer information and preferences
- **Booking History**: Access customer's past and current bookings
- **Farm Management**: Manage multiple farm locations
- **Payment Methods**: Store and manage payment preferences
- **Notifications**: Manage notification preferences
- **Loyalty Program**: Track rewards and loyalty points

### Key Components
- `CustomerService`: Core customer operations
- `CustomerController`: REST API endpoints
- `CustomerModule`: Module configuration

## API Endpoints

### Customer Operations
- `POST /customers/register` - Register new customer
- `GET /customers/profile` - Get customer profile
- `PUT /customers/profile` - Update profile
- `DELETE /customers/account` - Delete account

### Farm Management
- `POST /customers/farms` - Add new farm location
- `GET /customers/farms` - List all farms
- `PUT /customers/farms/:id` - Update farm details
- `DELETE /customers/farms/:id` - Remove farm

### Booking & History
- `GET /customers/bookings` - Get all bookings
- `GET /customers/bookings/upcoming` - Get upcoming bookings
- `GET /customers/bookings/history` - Get past bookings
- `GET /customers/bookings/:id` - Get booking details

### Preferences
- `PUT /customers/preferences` - Update preferences
- `PUT /customers/notifications` - Update notification settings
- `POST /customers/favorite-pilots` - Add favorite pilot

### Analytics
- `GET /customers/stats` - Customer statistics
- `GET /customers/spending` - Spending analytics

## Data Models

### Customer Interface
```typescript
interface ICustomer {
  customerId: string;
  
  // Personal info
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  
  // Address
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  
  // Farms
  farms: FarmLocation[];
  
  // Account info
  accountStatus: 'active' | 'suspended' | 'inactive';
  kycStatus: 'pending' | 'verified' | 'rejected';
  
  // Preferences
  preferences: {
    language: string;
    currency: string;
    notifications: NotificationPreferences;
  };
  
  // Loyalty
  loyaltyPoints: number;
  tier: 'regular' | 'silver' | 'gold' | 'platinum';
  
  // Statistics
  totalBookings: number;
  totalSpent: number;
  averageRating: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
```

### Farm Location
```typescript
interface FarmLocation {
  farmId: string;
  farmName: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  farmSize: number; // in acres
  cropTypes: string[];
  soilType?: string;
  isDefault: boolean;
}
```

## Usage Example

```typescript
import { CustomerService } from './customer.service';

// Register customer
const customer = await customerService.register({
  name: 'John Farmer',
  email: 'john@farm.com',
  phone: '+1234567890',
  address: {
    city: 'Rural Town',
    state: 'State',
    pincode: '123456'
  }
});

// Add farm location
await customerService.addFarm(customer.customerId, {
  farmName: 'Main Farm',
  location: {
    latitude: 28.7041,
    longitude: 77.1025,
    address: 'Farm Address'
  },
  farmSize: 25,
  cropTypes: ['wheat', 'rice']
});

// Get customer profile with farms
const profile = await customerService.getProfile(customer.customerId);

// Update preferences
await customerService.updatePreferences(customer.customerId, {
  language: 'en',
  notifications: {
    email: true,
    sms: true,
    push: true
  }
});
```

## Related Modules
- [Booking Module](../booking/README.md)
- [Auth Module](../auth/README.md)
- [Payment Module](../payment/README.md)
- [Reward Module](../reward/README.md)

## Testing
```bash
npm test -- customer.service.spec.ts
```
