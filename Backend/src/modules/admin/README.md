# Admin Module

## Overview
The Admin module provides comprehensive administrative functionalities for managing the HAWK drone delivery platform. It includes user management, system monitoring, login history tracking, and administrative operations across all platform entities.

## Features

### Core Functionality
- **User Management**: Create, update, and manage admin users
- **Login History**: Track and monitor admin authentication activities
- **System Oversight**: Monitor and manage all platform operations
- **Role Management**: Handle admin roles and permissions
- **Analytics Access**: View system-wide analytics and reports

### Key Components
- `AdminService`: Core administrative operations
- `AdminController`: REST API endpoints for admin operations
- `AdminModule`: Module configuration and dependency injection
- `AdminLoginHistoryController`: Login tracking and audit trails

## API Endpoints

### Authentication & User Management
- `POST /admin/login` - Admin authentication
- `GET /admin/profile` - Get admin profile
- `PUT /admin/profile` - Update admin profile
- `GET /admin/users` - List all users (with filters)
- `GET /admin/login-history` - View login history

### Entity Management
- `GET /admin/bookings` - Manage all bookings
- `GET /admin/pilots` - Manage pilots
- `GET /admin/drones` - Manage fleet
- `GET /admin/customers` - Manage customers
- `GET /admin/aggregators` - Manage sales aggregators

### System Operations
- `GET /admin/dashboard` - System-wide dashboard
- `GET /admin/analytics` - Platform analytics
- `POST /admin/notifications` - Send system notifications

## Dependencies
- `@nestjs/common`
- `@nestjs/passport`
- Firebase Admin SDK
- Authentication guards
- Role-based access control

## Usage Example

```typescript
import { AdminService } from './admin.service';

// Get system statistics
const stats = await adminService.getSystemStats();

// Manage user
await adminService.updateUserStatus(userId, 'active');

// View login history
const history = await adminService.getLoginHistory({
  startDate: new Date('2024-01-01'),
  endDate: new Date()
});
```

## Security
- Protected by admin authentication guards
- Role-based access control (RBAC)
- All operations are logged for audit trails
- Sensitive operations require additional verification

## Related Modules
- [Auth Module](../auth/README.md)
- [Users Module](../users/README.md)
- [Dashboard Module](../dashboard/README.md)

## Testing
Run tests with:
```bash
npm test -- admin.service.spec.ts
```
