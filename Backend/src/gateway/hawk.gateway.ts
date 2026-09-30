import { ForbiddenException, Inject, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

import { BookingService } from '../modules/booking/booking.service';
import { GPSTrackingService } from './services/gps-tracking.service';
import { CLIENT_EVENTS, WS_EVENTS } from './events/event.constants';
import type {
    AdminActionPayload,
    AdminApprovalPayload,
    AdminAssignmentChangedPayload,
    BookingAssignedPayload,
    BookingCancelledPayload,
    BookingCreatedPayload,
    BookingStatusPayload,
    ComplaintStatusChangedPayload,
    DelegatedBookingStatusPayload,
    DroneAssignedPayload,
    DroneStatusPayload,
    IncidentEscalatedPayload,
    IncidentReportedPayload,
    IncidentResolvedPayload,
    MaintenanceLoggedPayload,
    MaintenanceOverduePayload,
    MissionAcceptedPayload,
    MissionCompletedPayload,
    MissionLocationPayload,
    MissionRejectedPayload,
    MissionStartedPayload,
    NotificationBroadcastPayload,
    NotificationPayload,
    PaymentConfirmedPayload,
    PaymentFailedPayload,
    PilotAvailabilityChangedPayload,
    PilotLocationUpdatedPayload,
    PriceLockedPayload,
    RevenueSnapshotPayload,
    RoleApplicationSubmittedPayload,
    RoleApplicationUpdatedPayload,
    TeamInviteCreatedPayload,
    TeamRequestCreatedPayload,
    TeamUpdatedPayload,
    SettlementProcessedPayload,
    SlaBreachPayload,
    TicketAssignedPayload,
    TicketCreatedPayload,
    TicketStatusPayload,
} from './events/event.interfaces';
import type { AuthenticatedSocket } from './ws-auth.guard';
import { WsAuthGuard } from './ws-auth.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.7:3000',
      'http://10.20.75.147:3000',
    ],
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: Number(process.env.WS_MAX_BUFFER_SIZE ?? 1000000),
  pingTimeout: Number(process.env.WS_PING_TIMEOUT ?? 60000),
  pingInterval: Number(process.env.WS_PING_INTERVAL ?? 25000),
})
@UseGuards(WsAuthGuard)
export class HawkGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(HawkGateway.name);
  
  // Track connections per user
  private readonly connectionsByUser = new Map<string, Set<string>>();
  private readonly maxConnectionsPerUser: number;

  @WebSocketServer()
  server!: Server;

  @Inject()
  private readonly wsAuthGuard!: WsAuthGuard;

  @Inject()
  private readonly bookingService!: BookingService;

  @Inject()
  private readonly gpsTrackingService!: GPSTrackingService;

  constructor(private readonly configService: ConfigService) {
    this.maxConnectionsPerUser = this.configService.get<number>('WS_MAX_CONNECTIONS_PER_USER', 5);
  }

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized on /ws');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const isValid = await this.wsAuthGuard.authenticate(client);
    if (!isValid) {
      this.logger.warn(`Unauthenticated socket ${client.id} — disconnecting`);
      client.disconnect(true);
      return;
    }

    const user = client.user;

    // Enforce connection limit per user
    const userConnections = this.connectionsByUser.get(user.uid) ?? new Set();
    
    if (userConnections.size >= this.maxConnectionsPerUser) {
      this.logger.warn(
        `User ${user.uid} exceeded max connections (${this.maxConnectionsPerUser}). Rejecting connection ${client.id}`,
      );
      client.emit('error', {
        message: 'Maximum concurrent connections exceeded',
        limit: this.maxConnectionsPerUser,
      });
      client.disconnect(true);
      return;
    }

    // Track this connection
    userConnections.add(client.id);
    this.connectionsByUser.set(user.uid, userConnections);

    // Join personal + role rooms
    await client.join(`user:${user.uid}`);
    await client.join(`role:${user.role}`);

    // Admin gets dashboard room
    if (user.role === 'admin' || user.role === 'subadmin') {
      await client.join('admin:dashboard');
    }

    this.logger.log(
      `Connected: ${client.id} uid=${user.uid} role=${user.role} (${userConnections.size}/${this.maxConnectionsPerUser})`,
    );
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const uid = client.user?.uid ?? 'unknown';
    
    // L-005 fix: Remove connection from tracking
    if (client.user?.uid) {
      const userConnections = this.connectionsByUser.get(client.user.uid);
      if (userConnections) {
        userConnections.delete(client.id);
        if (userConnections.size === 0) {
          this.connectionsByUser.delete(client.user.uid);
        }
      }
    }
    
    this.logger.log(`Disconnected: ${client.id} uid=${uid}`);
  }

  // ── Client-initiated events ──────────────────────────────

  /** Client joins a specific booking room for live tracking */
  @SubscribeMessage('join:booking')
  async handleJoinBooking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { bookingId: string },
  ): Promise<void> {
    const uid = client.user.uid;
    const role = client.user.role;

    // Admins can join any booking room
    if (role === 'admin' || role === 'subadmin') {
      await client.join(`booking:${data.bookingId}`);
      this.logger.debug(`Admin ${uid} joined booking:${data.bookingId}`);
      return;
    }

    // For non-admin users, verify they are a party to the booking
    try {
      const { booking } = await this.bookingService.findBookingLookup(data.bookingId);

      const isAuthorized =
        booking.customerUid === uid ||
        booking.createdBy === uid ||
        booking.aggregatorUid === uid ||
        booking.fleetManagerUid === uid ||
        booking.assignedPilot === uid;

      if (!isAuthorized) {
        throw new ForbiddenException('You are not authorized to view this booking.');
      }

      await client.join(`booking:${data.bookingId}`);
      this.logger.debug(`${uid} joined booking:${data.bookingId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`${uid} failed to join booking:${data.bookingId} - ${errorMessage}`);
      throw error;
    }
  }

  /** Client leaves a booking room */
  @SubscribeMessage('leave:booking')
  async handleLeaveBooking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { bookingId: string },
  ): Promise<void> {
    await client.leave(`booking:${data.bookingId}`);
  }

  /** Vendor joins their vendor-specific room */
  @SubscribeMessage('join:vendor')
  async handleJoinVendor(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { vendorId: string },
  ): Promise<void> {
    if (client.user.uid === data.vendorId || client.user.role === 'admin') {
      await client.join(`vendor:${data.vendorId}`);
    }
  }

  /** Pilot joins their pilot-specific room for mission requests */
  @SubscribeMessage('join:pilot')
  async handleJoinPilot(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pilotUid: string },
  ): Promise<void> {
    if (client.user.uid === data.pilotUid || client.user.role === 'admin' || client.user.role === 'subadmin') {
      await client.join(`pilot:${data.pilotUid}`);
      this.logger.debug(`${client.user.uid} joined pilot:${data.pilotUid}`);
    }
  }

  /** Aggregator joins their aggregator-specific room for booking updates */
  @SubscribeMessage('join:aggregator')
  async handleJoinAggregator(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { aggregatorId: string },
  ): Promise<void> {
    if (client.user.uid === data.aggregatorId || client.user.role === 'admin' || client.user.role === 'subadmin') {
      await client.join(`aggregator:${data.aggregatorId}`);
      this.logger.debug(`${client.user.uid} joined aggregator:${data.aggregatorId}`);
    }
  }

  /** Technician joins their technician-specific room for ticket assignments */
  @SubscribeMessage('join:technician')
  async handleJoinTechnician(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { technicianId: string },
  ): Promise<void> {
    if (client.user.uid === data.technicianId || client.user.role === 'admin' || client.user.role === 'subadmin') {
      await client.join(`technician:${data.technicianId}`);
      this.logger.debug(`${client.user.uid} joined technician:${data.technicianId}`);
    }
  }

  /** Pilot sends live GPS during mission — throttled relay */
  @SubscribeMessage('mission:gps')
  async handleMissionGps(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      bookingId: string; 
      lat: number; 
      lng: number;
      heading?: number;
      speed?: number;
      altitude?: number;
    },
  ): Promise<void> {
    if (client.user.role !== 'pilot') {
      this.logger.warn(`Non-pilot ${client.user.uid} attempted to send GPS`);
      return;
    }

    // Verify the pilot is assigned to this booking
    try {
      const { booking } = await this.bookingService.findBookingLookup(data.bookingId);
      
      if (booking.assignedPilot !== client.user.uid) {
        this.logger.warn(
          `Pilot ${client.user.uid} attempted to send GPS for unassigned booking ${data.bookingId}`,
        );
        return;
      }

      const timestamp = new Date().toISOString();
      const gpsData = {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        altitude: data.altitude,
        timestamp,
      };

      // 1. Update current location in Firestore (real-time)
      await this.gpsTrackingService.updateCurrentLocation(
        client.user.uid,
        gpsData,
      );

      // 2. Add to batch buffer for MongoDB (historical trail)
      this.gpsTrackingService.addGPSPointToBatch(
        data.bookingId,
        client.user.uid,
        gpsData,
      );

      // 3. Calculate ETA if destination is available
      let eta: number | null = null;
      if (booking.location?.lat && booking.location?.lng && data.speed) {
        eta = this.gpsTrackingService.calculateETA(
          data.lat,
          data.lng,
          booking.location.lat,
          booking.location.lng,
          data.speed,
        );
      }

      // 4. Broadcast to booking room with ETA
      const payload: MissionLocationPayload = {
        bookingId: data.bookingId,
        pilotUid: client.user.uid,
        lat: data.lat,
        lng: data.lng,
        timestamp,
      };

      // Enhanced payload with additional data
      const enhancedPayload = {
        ...payload,
        heading: data.heading,
        speed: data.speed,
        altitude: data.altitude,
        eta: eta ? `${eta} min` : undefined,
      };

      this.server.to(`booking:${data.bookingId}`).emit(
        CLIENT_EVENTS.MISSION_LOCATION, 
        enhancedPayload,
      );

      this.logger.debug(
        `GPS updated for booking ${data.bookingId} by pilot ${client.user.uid} (ETA: ${eta || 'N/A'})`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Pilot ${client.user.uid} failed to send GPS for booking ${data.bookingId} - ${errorMessage}`,
      );
    }
  }

  // ── Booking events ───────────────────────────────────────

  @OnEvent(WS_EVENTS.BOOKING_CREATED)
  onBookingCreated(payload: BookingCreatedPayload): void {
    this.server.to('role:vendor').emit(CLIENT_EVENTS.BOOKING_CREATED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.BOOKING_CREATED, payload);
  }

  @OnEvent(WS_EVENTS.BOOKING_ASSIGNED)
  onBookingAssigned(payload: BookingAssignedPayload): void {
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_ASSIGNED, payload);
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_ASSIGNED, payload);
    if (payload.pilotUid) {
      this.server
        .to(`user:${payload.pilotUid}`)
        .emit(CLIENT_EVENTS.BOOKING_ASSIGNED, payload);
    }
  }

  @OnEvent(WS_EVENTS.BOOKING_STATUS_CHANGED)
  onBookingStatus(payload: BookingStatusPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_STATUS, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_STATUS, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.BOOKING_STATUS, payload);
  }

  @OnEvent(WS_EVENTS.BOOKING_CANCELLED)
  onBookingCancelled(payload: BookingCancelledPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_CANCELLED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_CANCELLED, payload);
    if (payload.vendorUid) {
      this.server
        .to(`user:${payload.vendorUid}`)
        .emit(CLIENT_EVENTS.BOOKING_CANCELLED, payload);
    }
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.BOOKING_CANCELLED, payload);
  }

  // ⭐ NEW: Fleet Manager Request events ────────────────────

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_SENT)
  onFleetManagerRequestSent(payload: any): void {
    // Send to specific fleet manager
    this.server
      .to(`user:${payload.fleetManagerUid}`)
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_SENT, payload);
    
    // Also send to fleet manager role room for dashboard updates
    this.server
      .to('role:fleet_manager')
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_SENT, payload);
    
    this.logger.log(
      `Fleet manager request sent event emitted to ${payload.fleetManagerUid} for booking ${payload.bookingId}`
    );
  }

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_ACCEPTED)
  onFleetManagerRequestAccepted(payload: any): void {
    // Notify customer
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_ACCEPTED, payload);
    
    // Notify admin dashboard
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_ACCEPTED, payload);
    
    this.logger.log(
      `Fleet manager ${payload.fleetManagerUid} accepted booking ${payload.bookingId}`
    );
  }

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_REJECTED)
  onFleetManagerRequestRejected(payload: any): void {
    // Notify admin dashboard
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_REJECTED, payload);
    
    this.logger.log(
      `Fleet manager ${payload.fleetManagerUid} rejected booking ${payload.bookingId}`
    );
  }

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_TIMEOUT)
  onFleetManagerRequestTimeout(payload: any): void {
    // Notify admin dashboard for manual intervention
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_TIMEOUT, payload);
    
    this.logger.warn(
      `Fleet manager request timeout for booking ${payload.bookingId}`
    );
  }

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_CANCELLED)
  onFleetManagerRequestCancelled(payload: any): void {
    // Notify fleet manager their request was cancelled
    this.server
      .to(`user:${payload.fleetManagerUid}`)
      .emit(CLIENT_EVENTS.FLEET_MANAGER_REQUEST_CANCELLED, payload);
  }

  @OnEvent(WS_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED)
  onBookingFleetManagerAssigned(payload: any): void {
    // Notify customer
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED, payload);
    
    // Notify booking room
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED, payload);
    
    // Notify fleet manager
    this.server
      .to(`user:${payload.fleetManagerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED, payload);
    
    this.logger.log(
      `Fleet manager ${payload.fleetManagerUid} assigned to booking ${payload.bookingId}`
    );
  }

  @OnEvent(WS_EVENTS.BOOKING_ALL_FLEET_MANAGERS_REJECTED)
  onAllFleetManagersRejected(payload: any): void {
    // Notify admin dashboard for manual intervention
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.BOOKING_ALL_FLEET_MANAGERS_REJECTED, payload);
    
    this.logger.error(
      `All fleet managers rejected booking ${payload.bookingId} - admin intervention required`
    );
  }

  // ── Mission events ───────────────────────────────────────

  @OnEvent(WS_EVENTS.MISSION_ACCEPTED)
  onMissionAccepted(payload: MissionAcceptedPayload): void {
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.MISSION_ACCEPTED, payload);
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.MISSION_ACCEPTED, payload);
  }

  @OnEvent(WS_EVENTS.MISSION_REJECTED)
  onMissionRejected(payload: MissionRejectedPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.MISSION_REJECTED, payload);
  }

  // ⭐ When a mission is created/assigned to a pilot, notify that pilot in
  // real-time so their "incoming requests" section updates without a manual
  // refresh.
  @OnEvent(WS_EVENTS.MISSION_CREATED)
  onMissionCreated(payload: { bookingId: string; pilotUid: string; fleetManagerUid?: string; timestamp: string }): void {
    if (payload.pilotUid) {
      this.server
        .to(`user:${payload.pilotUid}`)
        .emit(CLIENT_EVENTS.MISSION_CREATED, payload);
    }
  }

  @OnEvent(WS_EVENTS.MISSION_STARTED)
  onMissionStarted(payload: MissionStartedPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.MISSION_STARTED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.MISSION_STARTED, payload);
  }

  @OnEvent(WS_EVENTS.MISSION_LOCATION)
  onMissionLocation(payload: MissionLocationPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.MISSION_LOCATION, payload);
  }

  @OnEvent(WS_EVENTS.PILOT_LOCATION_UPDATED)
  onPilotLocationUpdated(payload: PilotLocationUpdatedPayload): void {
    // Broadcast to admin dashboards and fleet managers
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.PILOT_LOCATION_UPDATED, payload);
    this.server.to('vendor:dashboard').emit(CLIENT_EVENTS.PILOT_LOCATION_UPDATED, payload);
  }

  @OnEvent(WS_EVENTS.PILOT_AVAILABILITY_CHANGED)
  onPilotAvailabilityChanged(payload: PilotAvailabilityChangedPayload): void {
    // Broadcast to admin and vendor dashboards + FM role rooms so fleet
    // managers see duty toggles reflected in their roster instantly.
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.PILOT_AVAILABILITY_CHANGED, payload);
    this.server.to('vendor:dashboard').emit(CLIENT_EVENTS.PILOT_AVAILABILITY_CHANGED, payload);
    this.server.to('role:fleet_manager').emit(CLIENT_EVENTS.PILOT_AVAILABILITY_CHANGED, payload);
    this.server.to('role:vendor').emit(CLIENT_EVENTS.PILOT_AVAILABILITY_CHANGED, payload);
    this.server
      .to(`user:${(payload as any).pilotUid}`)
      .emit(CLIENT_EVENTS.PILOT_AVAILABILITY_CHANGED, payload);
  }

  @OnEvent(WS_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED)
  onFleetManagerAvailabilityChanged(payload: any): void {
    // Broadcast to admin dashboards + the FM themself so duty toggles
    // reflect instantly across devices.
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, payload);
    this.server.to('vendor:dashboard').emit(CLIENT_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, payload);
    this.server.to('role:fleet_manager').emit(CLIENT_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, payload);
    this.server.to('role:vendor').emit(CLIENT_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, payload);
    this.server
      .to(`user:${(payload as any).fleetManagerUid}`)
      .emit(CLIENT_EVENTS.FLEET_MANAGER_AVAILABILITY_CHANGED, payload);
  }

  @OnEvent(WS_EVENTS.MISSION_COMPLETED)
  onMissionCompleted(payload: MissionCompletedPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.MISSION_COMPLETED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.MISSION_COMPLETED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.MISSION_COMPLETED, payload);

    // Force flush GPS trail to MongoDB
    this.gpsTrackingService.forceFlush(payload.bookingId).catch((error) => {
      this.logger.error(`Failed to force flush GPS for booking ${payload.bookingId}:`, error);
    });
  }

  // ── Enhanced Mission Lifecycle Events ────────────────────

  @OnEvent('mission.navigation.started')
  onMissionNavigationStarted(payload: {
    missionId: string;
    pilotUid: string;
    bookingId: string;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:navigation:started', payload);
    this.server.to('admin:dashboard').emit('mission:navigation:started', payload);
    this.logger.log(`Pilot ${payload.pilotUid} started navigation for booking ${payload.bookingId}`);
  }

  @OnEvent('mission.arrived')
  onMissionArrived(payload: {
    missionId: string;
    pilotUid: string;
    bookingId: string;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:arrived', payload);
    this.server.to('admin:dashboard').emit('mission:arrived', payload);
    this.logger.log(`Pilot ${payload.pilotUid} arrived at booking ${payload.bookingId} location`);
  }

  @OnEvent('mission.preflight.completed')
  onMissionPreflightCompleted(payload: {
    missionId: string;
    pilotUid: string;
    bookingId: string;
    allChecksPassed: boolean;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:preflight:completed', payload);
    this.server.to('admin:dashboard').emit('mission:preflight:completed', payload);
    this.logger.log(
      `Pre-flight check ${payload.allChecksPassed ? 'PASSED' : 'FAILED'} for booking ${payload.bookingId}`,
    );
  }

  @OnEvent('mission.completed.pending.media')
  onMissionCompletedPendingMedia(payload: {
    missionId: string;
    pilotUid: string;
    bookingId: string;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:completed:pending:media', payload);
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit('mission:completed:pending:media', payload);
    this.logger.log(`Mission ${payload.missionId} completed, awaiting media upload`);
  }

  @OnEvent('mission.cancelled')
  onMissionCancelled(payload: {
    missionId: string;
    pilotUid: string;
    bookingId: string;
    reason: string;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:cancelled', payload);
    this.server.to('admin:dashboard').emit('mission:cancelled', payload);
    this.logger.warn(`Mission ${payload.missionId} cancelled by pilot: ${payload.reason}`);
  }

  @OnEvent('mission.progress.update')
  onMissionProgressUpdate(payload: {
    bookingId: string;
    missionId: string;
    pilotUid: string;
    progressPercentage: number;
    currentPhase: string;
    estimatedCompletionTime?: string;
    timestamp: string;
  }): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit('mission:progress:update', payload);
    this.logger.debug(
      `Mission ${payload.missionId} progress: ${payload.progressPercentage}% (${payload.currentPhase})`,
    );
  }

  // ── Pricing events ───────────────────────────────────────

  @OnEvent(WS_EVENTS.PRICE_LOCKED)
  onPriceLocked(payload: PriceLockedPayload): void {
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.PRICE_LOCKED, payload);
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.PRICE_LOCKED, payload);
  }

  // ── Payment events ───────────────────────────────────────

  @OnEvent(WS_EVENTS.PAYMENT_CONFIRMED)
  onPaymentConfirmed(payload: PaymentConfirmedPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.PAYMENT_CONFIRMED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.PAYMENT_CONFIRMED, payload);
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit(CLIENT_EVENTS.PAYMENT_CONFIRMED, payload);
  }

  @OnEvent(WS_EVENTS.PAYMENT_FAILED)
  onPaymentFailed(payload: PaymentFailedPayload): void {
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.PAYMENT_FAILED, payload);
  }

  // ── Fleet / Drone events ─────────────────────────────────

  @OnEvent(WS_EVENTS.DRONE_STATUS_CHANGED)
  onDroneStatus(payload: DroneStatusPayload): void {
    this.server
      .to(`vendor:${payload.vendorUid}`)
      .emit(CLIENT_EVENTS.DRONE_STATUS, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.DRONE_STATUS, payload);
  }

  @OnEvent(WS_EVENTS.DRONE_ASSIGNED)
  onDroneAssigned(payload: DroneAssignedPayload): void {
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit(CLIENT_EVENTS.DRONE_ASSIGNED, payload);
  }

  @OnEvent(WS_EVENTS.MAINTENANCE_OVERDUE)
  onMaintenanceOverdue(payload: MaintenanceOverduePayload): void {
    this.server
      .to(`vendor:${payload.vendorUid}`)
      .emit(CLIENT_EVENTS.MAINTENANCE_OVERDUE, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.MAINTENANCE_OVERDUE, payload);
  }

  @OnEvent(WS_EVENTS.MAINTENANCE_LOGGED)
  onMaintenanceLogged(payload: MaintenanceLoggedPayload): void {
    this.server
      .to(`vendor:${payload.vendorUid}`)
      .emit(CLIENT_EVENTS.MAINTENANCE_LOGGED, payload);
  }

  // ── Service Centre events ────────────────────────────────

  @OnEvent(WS_EVENTS.TICKET_CREATED)
  onTicketCreated(payload: TicketCreatedPayload): void {
    this.server.to('role:technician').emit(CLIENT_EVENTS.TICKET_CREATED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.TICKET_CREATED, payload);
  }

  @OnEvent(WS_EVENTS.TICKET_ASSIGNED)
  onTicketAssigned(payload: TicketAssignedPayload): void {
    this.server
      .to(`user:${payload.technicianId}`)
      .emit(CLIENT_EVENTS.TICKET_ASSIGNED, payload);
    this.server
      .to(`technician:${payload.technicianId}`)
      .emit(CLIENT_EVENTS.TICKET_ASSIGNED, payload);
  }

  @OnEvent(WS_EVENTS.TICKET_STATUS_CHANGED)
  onTicketStatus(payload: TicketStatusPayload): void {
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit(CLIENT_EVENTS.TICKET_STATUS, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.TICKET_STATUS, payload);
  }

  @OnEvent(WS_EVENTS.SLA_BREACH)
  onSlaBreach(payload: SlaBreachPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.SLA_BREACH, payload);
  }

  // ── Incident events ──────────────────────────────────────

  @OnEvent(WS_EVENTS.INCIDENT_REPORTED)
  onIncidentReported(payload: IncidentReportedPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.INCIDENT_REPORTED, payload);
  }

  @OnEvent(WS_EVENTS.INCIDENT_ESCALATED)
  onIncidentEscalated(payload: IncidentEscalatedPayload): void {
    this.server
      .to(`user:${payload.escalatedTo}`)
      .emit(CLIENT_EVENTS.INCIDENT_ESCALATED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.INCIDENT_ESCALATED, payload);
  }

  @OnEvent(WS_EVENTS.INCIDENT_RESOLVED)
  onIncidentResolved(payload: IncidentResolvedPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.INCIDENT_RESOLVED, payload);
  }

  // ── Revenue events ───────────────────────────────────────

  @OnEvent(WS_EVENTS.REVENUE_SNAPSHOT)
  onRevenueSnapshot(payload: RevenueSnapshotPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.REVENUE_SNAPSHOT, payload);
  }

  // ── Admin action events ──────────────────────────────────

  @OnEvent(WS_EVENTS.ADMIN_ACTION)
  onAdminAction(payload: AdminActionPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.ADMIN_ACTION, payload);
  }

  // ── Role Application events ─────────────────────────────

  @OnEvent(WS_EVENTS.ROLE_APPLICATION_SUBMITTED)
  onRoleApplicationSubmitted(payload: RoleApplicationSubmittedPayload): void {
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.ROLE_APPLICATION_SUBMITTED, payload);
  }

  @OnEvent(WS_EVENTS.ROLE_APPLICATION_UPDATED)
  onRoleApplicationUpdated(payload: RoleApplicationUpdatedPayload): void {
    this.server
      .to(`user:${payload.uid}`)
      .emit(CLIENT_EVENTS.ROLE_APPLICATION_UPDATED, payload);
  }

  // ── Team (FM ↔ Pilot) events ──────────────────────────────

  @OnEvent(WS_EVENTS.TEAM_INVITE_CREATED)
  onTeamInviteCreated(payload: TeamInviteCreatedPayload): void {
    // FM invited pilot → pilot receives instantly.
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit(CLIENT_EVENTS.TEAM_INVITE_RECEIVED, payload);
  }

  @OnEvent(WS_EVENTS.TEAM_REQUEST_CREATED)
  onTeamRequestCreated(payload: TeamRequestCreatedPayload): void {
    // Pilot requested to join → FM receives instantly.
    this.server
      .to(`user:${payload.fmUid}`)
      .emit(CLIENT_EVENTS.TEAM_REQUEST_RECEIVED, payload);
  }

  @OnEvent(WS_EVENTS.TEAM_UPDATED)
  onTeamUpdated(payload: TeamUpdatedPayload): void {
    // Accept/reject → both sides refresh instantly (unassigned pilot
    // disappears from every FM carousel without reload).
    this.server
      .to(`user:${payload.pilotUid}`)
      .emit(CLIENT_EVENTS.TEAM_UPDATED, payload);
    this.server
      .to(`user:${payload.fmUid}`)
      .emit(CLIENT_EVENTS.TEAM_UPDATED, payload);
    this.server.to('role:fleet_manager').emit(CLIENT_EVENTS.TEAM_UPDATED, payload);
    this.server.to('role:vendor').emit(CLIENT_EVENTS.TEAM_UPDATED, payload);
  }

  // ── Notification events ──────────────────────────────────

  @OnEvent(WS_EVENTS.NOTIFICATION_NEW)
  onNotification(payload: NotificationPayload): void {
    this.server
      .to(`user:${payload.uid}`)
      .emit(CLIENT_EVENTS.NOTIFICATION, payload);
  }

  @OnEvent(WS_EVENTS.NOTIFICATION_BROADCAST)
  onNotificationBroadcast(payload: NotificationBroadcastPayload): void {
    const target = payload.role ? `role:${payload.role}` : 'admin:dashboard';
    this.server.to(target).emit(CLIENT_EVENTS.NOTIFICATION_BROADCAST, payload);
  }

  // ── Aggregator events ────────────────────────────────────

  @OnEvent(WS_EVENTS.DELEGATED_BOOKING_STATUS)
  onDelegatedBookingStatus(payload: DelegatedBookingStatusPayload): void {
    this.server
      .to(`user:${payload.aggregatorUid}`)
      .emit(CLIENT_EVENTS.DELEGATED_BOOKING_STATUS, payload);
  }

  // ── Admin Approval events ────────────────────────────────

  @OnEvent(WS_EVENTS.BOOKING_ADMIN_APPROVED)
  onAdminApproved(payload: AdminApprovalPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_APPROVED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_APPROVED, payload);
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_APPROVED, payload);
  }

  @OnEvent(WS_EVENTS.BOOKING_ADMIN_REJECTED)
  onAdminRejected(payload: AdminApprovalPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_REJECTED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_REJECTED, payload);
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_REJECTED, payload);
  }

  @OnEvent(WS_EVENTS.BOOKING_ADMIN_ASSIGNMENT_CHANGED)
  onAdminAssignmentChanged(payload: AdminAssignmentChangedPayload): void {
    this.server
      .to(`booking:${payload.bookingId}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_ASSIGNMENT_CHANGED, payload);
    this.server
      .to(`user:${payload.customerUid}`)
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_ASSIGNMENT_CHANGED, payload);
    this.server
      .to('admin:dashboard')
      .emit(CLIENT_EVENTS.BOOKING_ADMIN_ASSIGNMENT_CHANGED, payload);
  }

  // ── Complaint events ─────────────────────────────────────

  @OnEvent(WS_EVENTS.COMPLAINT_STATUS_CHANGED)
  onComplaintStatusChanged(payload: ComplaintStatusChangedPayload): void {
    this.server
      .to(`user:${payload.complainantUid}`)
      .emit(CLIENT_EVENTS.COMPLAINT_STATUS_CHANGED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.COMPLAINT_STATUS_CHANGED, payload);
  }

  // ── Settlement events ────────────────────────────────────

  @OnEvent(WS_EVENTS.SETTLEMENT_PROCESSED)
  onSettlementProcessed(payload: SettlementProcessedPayload): void {
    this.server
      .to(`user:${payload.recipientUid}`)
      .emit(CLIENT_EVENTS.SETTLEMENT_PROCESSED, payload);
    this.server.to('admin:dashboard').emit(CLIENT_EVENTS.SETTLEMENT_PROCESSED, payload);
  }
}
