# Subadmin Module

## Overview
Manages sub-administrators with limited permissions for specific operations like customer support, fleet management, or regional operations.

## Features
- Subadmin creation and management
- Role-based permissions
- Access control
- Activity monitoring
- Permission scopes
- Regional restrictions
- Audit trails

## API Endpoints
- `POST /subadmin/create` - Create subadmin (admin only)
- `GET /subadmin/profile` - Get subadmin profile
- `PUT /subadmin/permissions` - Update permissions
- `GET /subadmin/activity` - View activity logs

## Permission Scopes
- **Customer Support**: Manage complaints, support tickets
- **Fleet Manager**: Manage drones, maintenance
- **Operations**: Manage bookings, assignments
- **Finance**: View reports, manage payments
- **Regional**: Limited to specific geographic regions

## Data Model
```typescript
interface ISubadmin {
  subadminId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  region?: string;
  status: 'active' | 'suspended';
  createdBy: string;
  createdAt: Date;
}
```

## Usage Example
```typescript
const subadmin = await subadminService.create({
  name: 'Support Manager',
  email: 'support@hawk.com',
  role: 'customer_support',
  permissions: ['view_complaints', 'manage_tickets']
});
```

## Related Modules
- [Admin Module](../admin/README.md)
- [Auth Module](../auth/README.md)

## Testing
```bash
npm test -- subadmin.service.spec.ts
```
