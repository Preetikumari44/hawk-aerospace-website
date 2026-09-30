# Users Module

## Overview
Generic user management module providing common user operations across all user types.

## Features
- User profile management
- Account settings
- Privacy controls
- Notification preferences
- Security settings
- Activity logs
- Account deletion

## API Endpoints
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile
- `PUT /users/settings` - Update settings
- `GET /users/activity` - Activity history
- `DELETE /users/account` - Delete account

## User Types Supported
- Customer
- Pilot
- Admin
- Fleet Manager
- Technician
- Aggregator
- Vendor

## Data Model
```typescript
interface IUser {
  userId: string;
  userType: UserType;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  settings: UserSettings;
  createdAt: Date;
  lastLoginAt: Date;
}
```

## Related Modules
- [Auth Module](../auth/README.md)
- All role-specific modules

## Testing
```bash
npm test -- users.service.spec.ts
```
