# HAWK WebSocket Gateway Documentation

## Overview

The HAWK WebSocket Gateway provides real-time bidirectional communication between the backend and clients (mobile apps, web dashboards). Built on Socket.IO with NestJS integration.

## GPS Tracking Architecture (Firestore-Only)

### Data Storage Strategy

**Current Location (Real-time)**
- **`pilots/{pilotId}/location/current`** - Single document with latest GPS position
- Updates every 5 seconds during active missions
- Used for live tracking on customer apps

**Historical Trail (Batch Writes)**
- **`bookings/{bookingId}/gpsTrail/{timestamp}`** - Subcollection of GPS points
- Batch writes every 30 seconds (reduces Firestore costs)
- Distance-based debouncing (skips movements < 5m)
- Maximum 500 points per batch (Firestore limit)

**Metadata**
- **`bookings/{bookingId}/tracking`** - Summary stats
  - `lastGPSUpdate`: Latest GPS timestamp
  - `totalGPSPoints`: Count of trail points

### Optimizations

1. **Distance Debouncing**: Skips GPS updates if pilot hasn't moved >= 5 meters
2. **Batch Writes**: Accumulates GPS points in memory, writes every 30s
3. **Auto-flush**: Forces write if buffer reaches 500 points (Firestore batch limit)
4. **Force Flush**: Immediately persists buffer on mission completion

### REST API Endpoints

```typescript
// Get GPS trail
GET /gps/trail/:bookingId
Query params: ?limit=100&startTime=2024-01-01T00:00:00Z&endTime=2024-01-01T23:59:59Z

// Get trail statistics
GET /gps/stats/:bookingId
Returns: { totalPoints, totalDistance, startTime, endTime, avgSpeed }

// Force flush buffer (admin only)
GET /gps/flush/:bookingId
```

---

### Connection Flow
```
Client → Authentication → Join Rooms → Receive Events → Disconnect
```

### Room Hierarchy

#### Personal Rooms (Auto-joined on connection)
- **`user:{uid}`** - Personal notifications for individual users
- **`role:{role}`** - Role-based broadcasts (pilot, vendor, technician, customer, admin, subadmin)

#### Feature-Specific Rooms (Client-initiated joins)
- **`booking:{bookingId}`** - Booking tracking (customer, pilot, fleet manager, aggregator)
- **`pilot:{pilotId}`** - Individual pilot mission requests
- **`vendor:{vendorId}`** - Fleet-wide alerts and drone status for vendors
- **`aggregator:{aggregatorId}`** - Sales aggregator booking updates
- **`technician:{technicianId}`** - Individual technician ticket assignments

#### System Rooms
- **`admin:dashboard`** - Admin dashboard alerts and pending approvals
- **`vendor:dashboard`** - Vendor dashboard notifications

---

## Client Connection

### Connection URL
```typescript
const socket = io('https://api.hawkdrones.com/ws', {
  transports: ['websocket', 'polling'],
  auth: {
    token: 'Bearer <JWT_TOKEN>', // Firebase ID token
  },
});
```

### Authentication
All connections require a valid Firebase JWT token. Unauthenticated connections are immediately rejected.

### Connection Limits
- Maximum **5 concurrent connections per user**
- Exceeding the limit disconnects the newest connection

---

## Room Management

### Joining Rooms

#### Join Booking Room
**Event:** `join:booking`

**Payload:**
```typescript
{
  bookingId: string;
}
```

**Authorization:**
- Customer who created the booking
- Assigned pilot
- Vendor managing the booking
- Aggregator who delegated the booking
- Admin/SubAdmin

**Example:**
```typescript
socket.emit('join:booking', { bookingId: 'BK123456' });
```

---

#### Join Pilot Room
**Event:** `join:pilot`

**Payload:**
```typescript
{
  pilotId: string;
}
```

**Authorization:**
- The pilot themselves
- Admin/SubAdmin

**Use Case:** Receive incoming mission requests

---

#### Join Aggregator Room
**Event:** `join:aggregator`

**Payload:**
```typescript
{
  aggregatorId: string;
}
```

**Authorization:**
- The aggregator themselves
- Admin/SubAdmin

**Use Case:** Track delegated booking statuses

---

#### Join Technician Room
**Event:** `join:technician`

**Payload:**
```typescript
{
  technicianId: string;
}
```

**Authorization:**
- The technician themselves
- Admin/SubAdmin

**Use Case:** Receive assigned maintenance tickets

---

#### Join Vendor Room
**Event:** `join:vendor`

**Payload:**
```typescript
{
  vendorId: string;
}
```

**Authorization:**
- The vendor themselves
- Admin

**Use Case:** Fleet alerts, drone status changes

---

### Leaving Rooms

#### Leave Booking Room
**Event:** `leave:booking`

**Payload:**
```typescript
{
  bookingId: string;
}
```

---

## Events Catalog

### Booking Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `booking:created` | `role:vendor`, `admin:dashboard` | `BookingCreatedPayload` |
| `booking:assigned` | `user:{customerUid}`, `user:{pilotId}`, `booking:{bookingId}` | `BookingAssignedPayload` |
| `booking:status` | `booking:{bookingId}`, `user:{customerUid}`, `admin:dashboard` | `BookingStatusPayload` |
| `booking:cancelled` | `booking:{bookingId}`, `user:{customerUid}`, `user:{vendorId}`, `admin:dashboard` | `BookingCancelledPayload` |

---

### Mission Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `mission:accepted` | `user:{customerUid}`, `booking:{bookingId}` | `MissionAcceptedPayload` |
| `mission:rejected` | `booking:{bookingId}` | `MissionRejectedPayload` |
| `mission:started` | `booking:{bookingId}`, `user:{customerUid}` | `MissionStartedPayload` |
| `mission:location` | `booking:{bookingId}` | `MissionLocationPayload` |
| `mission:completed` | `booking:{bookingId}`, `user:{customerUid}`, `admin:dashboard` | `MissionCompletedPayload` |

---

### Pilot Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `pilot:location` | `admin:dashboard`, `vendor:dashboard` | `PilotLocationUpdatedPayload` |
| `pilot:availability` | `admin:dashboard`, `vendor:dashboard` | `PilotAvailabilityChangedPayload` |

---

### Payment & Pricing Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `price:locked` | `user:{customerUid}`, `booking:{bookingId}` | `PriceLockedPayload` |
| `payment:confirmed` | `booking:{bookingId}`, `user:{customerUid}`, `user:{pilotId}` | `PaymentConfirmedPayload` |
| `payment:failed` | `user:{customerUid}` | `PaymentFailedPayload` |

---

### Fleet & Drone Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `drone:status` | `vendor:{vendorId}`, `admin:dashboard` | `DroneStatusPayload` |
| `drone:assigned` | `user:{pilotId}` | `DroneAssignedPayload` |
| `maintenance:overdue` | `vendor:{vendorId}`, `admin:dashboard` | `MaintenanceOverduePayload` |
| `maintenance:logged` | `vendor:{vendorId}` | `MaintenanceLoggedPayload` |

---

### Maintenance Ticket Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `ticket:created` | `role:technician`, `admin:dashboard` | `TicketCreatedPayload` |
| `ticket:assigned` | `user:{technicianId}`, `technician:{technicianId}` | `TicketAssignedPayload` |
| `ticket:status` | `user:{pilotId}`, `admin:dashboard` | `TicketStatusPayload` |
| `sla:breach` | `admin:dashboard` | `SlaBreachPayload` |

---

### Incident Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `incident:reported` | `admin:dashboard` | `IncidentReportedPayload` |
| `incident:escalated` | `user:{escalatedTo}`, `admin:dashboard` | `IncidentEscalatedPayload` |
| `incident:resolved` | `admin:dashboard` | `IncidentResolvedPayload` |

---

### Complaint & Settlement Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `complaint:status` | `user:{complainantUid}`, `admin:dashboard` | `ComplaintStatusChangedPayload` |
| `settlement:processed` | `user:{recipientUid}`, `admin:dashboard` | `SettlementProcessedPayload` |

---

### Notification Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `notification:new` | `user:{uid}` | `NotificationPayload` |
| `notification:broadcast` | `role:{role}` or `admin:dashboard` | `NotificationBroadcastPayload` |

---

### Aggregator Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `delegated:status` | `user:{aggregatorId}` | `DelegatedBookingStatusPayload` |

---

### Admin Events

| Event Name | Rooms Notified | Payload |
|------------|----------------|---------|
| `admin:action` | `admin:dashboard` | `AdminActionPayload` |
| `revenue:snapshot` | `admin:dashboard` | `RevenueSnapshotPayload` |

---

## Client-to-Server Events

### Send Pilot GPS Location
**Event:** `mission:gps`

**Payload:**
```typescript
{
  bookingId: string;
  lat: number;
  lng: number;
}
```

**Authorization:** Only assigned pilots can send GPS for their active bookings

**Broadcast:** Relayed to `booking:{bookingId}` room as `mission:location`

**Rate Limit:** Throttled to ~5s intervals (handled client-side recommended)

---

## Error Handling

### Connection Errors
- **Invalid Token:** Immediate disconnect
- **Max Connections Exceeded:** Emit `error` event with limit details, then disconnect
- **Unauthorized Room Join:** ForbiddenException thrown

### Error Event Format
```typescript
socket.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});
```

---

## Usage Examples

### Customer Tracking Booking
```typescript
// Connect and authenticate
const socket = io('https://api.hawkdrones.com/ws', {
  auth: { token: `Bearer ${firebaseToken}` },
});

// Join booking room
socket.emit('join:booking', { bookingId: 'BK123456' });

// Listen for status updates
socket.on('booking:status', (data) => {
  console.log('Booking status:', data.status);
});

// Listen for pilot location (during active mission)
socket.on('mission:location', (data) => {
  updateMapMarker(data.lat, data.lng);
});

// Listen for completion
socket.on('mission:completed', (data) => {
  showCompletionScreen(data.summary);
});
```

---

### Pilot Accepting Mission
```typescript
// Join pilot room for incoming requests
socket.emit('join:pilot', { pilotId: currentUser.uid });

// Listen for new mission assignments
socket.on('booking:assigned', (data) => {
  if (data.pilotId === currentUser.uid) {
    showMissionAcceptDialog(data.bookingId);
  }
});

// Send live GPS during mission
const sendGPS = () => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('mission:gps', {
      bookingId: activeBookingId,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
  });
};

// Send GPS every 5 seconds during active mission
setInterval(sendGPS, 5000);
```

---

### Admin Dashboard
```typescript
// Admins auto-join admin:dashboard on connection

// Listen for all critical events
socket.on('booking:created', handleNewBooking);
socket.on('incident:reported', handleIncident);
socket.on('sla:breach', handleSlaBreach);
socket.on('maintenance:overdue', handleOverdueAlert);
socket.on('complaint:status', handleComplaintUpdate);
socket.on('revenue:snapshot', updateDashboard);
```

---

### Technician Maintenance Flow
```typescript
// Join technician room
socket.emit('join:technician', { technicianId: currentUser.uid });

// Listen for new tickets
socket.on('ticket:created', (data) => {
  addTicketToQueue(data);
});

// Listen for assigned tickets
socket.on('ticket:assigned', (data) => {
  if (data.technicianId === currentUser.uid) {
    showTicketDetails(data.ticketId);
  }
});
```

---

## Configuration

### Environment Variables
```env
# CORS Origins (comma-separated)
CORS_ORIGIN=https://app.hawkdrones.com,https://admin.hawkdrones.com

# WebSocket Configuration
WS_MAX_BUFFER_SIZE=1000000          # 1MB
WS_PING_TIMEOUT=60000               # 60s
WS_PING_INTERVAL=25000              # 25s
WS_MAX_CONNECTIONS_PER_USER=5       # Per-user limit
```

---

## Security Considerations

1. **Authentication Required:** All connections validated via Firebase JWT
2. **Room Authorization:** Users can only join rooms they have access to
3. **Rate Limiting:** Connection limits prevent abuse
4. **Pilot GPS Verification:** Only assigned pilots can send location for bookings
5. **Admin-Only Rooms:** Sensitive dashboard rooms restricted to admin/subadmin roles

---

## Testing

### Test WebSocket Connection
```bash
# Install wscat
npm install -g wscat

# Connect with token
wscat -c "wss://api.hawkdrones.com/ws" \
  --auth "Bearer YOUR_FIREBASE_TOKEN"
```

### Integration Tests
Located in: `test/websocket/`

Run tests:
```bash
npm run test:e2e -- --testPathPattern=websocket
```

---

## Troubleshooting

### Connection Drops
- Check Firebase token expiry (tokens expire after 1 hour)
- Verify network stability
- Check connection limit (max 5 per user)

### Missing Events
- Confirm room join was successful
- Check user authorization for the room
- Verify event emitter is firing in backend service

### GPS Not Updating
- Ensure pilot is assigned to the booking
- Verify booking is in active status
- Check client-side throttling (recommended 5s interval)

---

## Future Enhancements
- [ ] Event replay for missed messages
- [ ] Binary protocol support for GPS streams
- [ ] Presence detection (online/offline status)
- [ ] Typing indicators for support chat
- [ ] WebSocket cluster support with Redis adapter
