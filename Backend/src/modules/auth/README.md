# Auth Module

## Overview
The Authentication module handles all authentication and authorization operations for the HAWK platform. It supports multiple user types (customers, pilots, admins, aggregators) with JWT-based authentication, OTP verification, and login history tracking.

## Features

### Core Functionality
- **Multi-User Authentication**: Support for customers, pilots, admins, fleet managers, technicians, and aggregators
- **OTP Verification**: Phone and email-based OTP authentication
- **JWT Tokens**: Secure token generation and validation
- **Login History**: Track authentication activities for security auditing
- **Session Management**: Handle user sessions and token refresh
- **Password Management**: Secure password hashing and reset functionality

### Key Components
- `AuthService`: Core authentication logic
- `OTPService`: OTP generation and verification
- `AuthController`: Authentication endpoints
- `LoginHistoryController`: Login tracking endpoints
- `JwtStrategy`: JWT validation strategy
- `AuthGuards`: Route protection guards

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify-token` - Verify JWT token

### OTP Operations
- `POST /auth/otp/send` - Send OTP to phone/email
- `POST /auth/otp/verify` - Verify OTP code
- `POST /auth/otp/resend` - Resend OTP

### Password Management
- `POST /auth/password/forgot` - Initiate password reset
- `POST /auth/password/reset` - Reset password with token
- `PUT /auth/password/change` - Change password (authenticated)

### Login History
- `GET /auth/login-history` - Get user's login history
- `GET /auth/sessions` - List active sessions
- `DELETE /auth/sessions/:id` - Revoke specific session

## Security Features

### JWT Configuration
```typescript
{
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  refreshExpiresIn: '7d'
}
```

### OTP Settings
- **Expiration**: 10 minutes
- **Length**: 6 digits
- **Max Attempts**: 3
- **Resend Cooldown**: 60 seconds

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Usage Example

```typescript
import { AuthService } from './auth.service';
import { OTPService } from './services/otp.service';

// User login
const result = await authService.login({
  email: 'user@example.com',
  password: 'SecurePass123!',
  userType: 'customer'
});

// Send OTP
await otpService.sendOTP({
  phone: '+1234567890',
  purpose: 'login'
});

// Verify OTP
const verified = await otpService.verifyOTP({
  phone: '+1234567890',
  code: '123456'
});

// Get login history
const history = await authService.getLoginHistory(userId, {
  limit: 10,
  offset: 0
});
```

## Data Models

### AuthResponse
```typescript
interface AuthResponse {
  user: {
    userId: string;
    email: string;
    userType: UserType;
    profile: any;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}
```

### Login History
```typescript
interface LoginHistory {
  sessionId: string;
  userId: string;
  userType: UserType;
  ipAddress: string;
  userAgent: string;
  device: string;
  location?: {
    city: string;
    country: string;
  };
  loginAt: Date;
  logoutAt?: Date;
  isActive: boolean;
}
```

## Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS=3
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

## Dependencies
- `@nestjs/jwt`
- `@nestjs/passport`
- `passport-jwt`
- `bcryptjs`
- Firebase Admin SDK
- Twilio (for SMS OTP)
- SendGrid (for Email OTP)

## Guards & Decorators

### Available Guards
- `JwtAuthGuard`: Validates JWT token
- `RolesGuard`: Role-based access control
- `OTPVerifiedGuard`: Ensures OTP verification

### Custom Decorators
- `@CurrentUser()`: Extract current user from request
- `@Roles(...roles)`: Specify allowed roles
- `@Public()`: Mark route as public (skip auth)

## Related Modules
- [Admin Module](../admin/README.md)
- [Customer Module](../customer/README.md)
- [Pilot Module](../pilot/README.md)
- [Notification Module](../notification/README.md)

## Testing
Run tests with:
```bash
npm test -- auth.service.spec.ts
npm test -- otp.service.spec.ts
```

## Security Best Practices
1. Always use HTTPS in production
2. Rotate JWT secrets regularly
3. Implement rate limiting on auth endpoints
4. Monitor failed login attempts
5. Use strong password policies
6. Implement account lockout after multiple failed attempts
7. Store login history for security audits
