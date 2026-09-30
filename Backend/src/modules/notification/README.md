# Notification Module

## Overview
Multi-channel notification system supporting Email, SMS, Push notifications, and In-app messaging for the HAWK platform.

## Features
- **Multi-Channel Support**: Email (SendGrid), SMS (Twilio), Push (FCM), In-app
- **Template Management**: Dynamic notification templates
- **User Preferences**: Respect user notification preferences
- **Batch Notifications**: Send bulk notifications efficiently
- **Delivery Tracking**: Track notification delivery status
- **Retry Logic**: Automatic retry for failed deliveries

## Key Components
- `NotificationService`: Core notification operations
- `SendGridProvider`: Email notifications
- `TwilioProvider`: SMS notifications
- `FCMProvider`: Push notifications
- `NotificationController`: API endpoints

## API Endpoints
- `POST /notifications/send` - Send notification
- `POST /notifications/bulk` - Send bulk notifications
- `GET /notifications/:userId` - Get user notifications
- `PUT /notifications/:id/read` - Mark as read
- `GET /notifications/templates` - List templates

## Supported Notification Types
- Booking confirmations
- Payment receipts
- Pilot assignments
- Mission updates
- Complaint updates
- System alerts
- Marketing messages

## Usage Example
```typescript
await notificationService.send({
  userId: 'user123',
  type: 'booking_confirmed',
  channels: ['email', 'sms', 'push'],
  data: {
    bookingId: 'book456',
    scheduledDate: '2024-07-15'
  }
});
```

## Environment Variables
```env
SENDGRID_API_KEY=your-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
FCM_SERVER_KEY=your-key
```

## Related Modules
- [Auth Module](../auth/README.md)
- [Booking Module](../booking/README.md)
- [Payment Module](../payment/README.md)

## Testing
```bash
npm test -- notification.service.spec.ts
```
