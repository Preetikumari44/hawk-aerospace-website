# Vendor Module

## Overview
Manages third-party vendors who provide drones, equipment, and services to the HAWK platform.

## Features
- Vendor registration and onboarding
- Drone and equipment leasing
- Contract management
- Performance tracking
- Payment settlements
- Quality assurance
- Vendor ratings

## API Endpoints
- `POST /vendors/register` - Register vendor
- `GET /vendors/profile` - Get vendor profile
- `GET /vendors/contracts` - View contracts
- `POST /vendors/drones` - List drone for lease
- `GET /vendors/earnings` - View earnings
- `POST /vendors/settlements` - Request settlement

## Data Model
```typescript
interface IVendor {
  vendorId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  businessType: string;
  gstNumber: string;
  status: 'active' | 'suspended' | 'inactive';
  dronesProvided: string[];
  totalEarnings: number;
  rating: number;
}
```

## Usage Example
```typescript
const vendor = await vendorService.register({
  companyName: 'Drone Solutions Ltd',
  contactPerson: 'John Doe',
  email: 'john@drones.com',
  businessType: 'drone_manufacturer'
});
```

## Related Modules
- [Fleet Module](../fleet/README.md)
- [Payment Module](../payment/README.md)

## Testing
```bash
npm test -- vendor.service.spec.ts
```
