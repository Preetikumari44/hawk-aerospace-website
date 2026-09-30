import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { NotificationService } from './notification.service';
import { NotificationChannel, NotificationPriority } from './interfaces/notification-provider.interface';

@Injectable()
export class NotificationEventsListener {
  private readonly logger = new Logger(NotificationEventsListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  // Notification preference categories (must match the keys users toggle
  // in Accounts → Notifications). Users who turn a category off are skipped
  // for every channel; master switches (push/email) are enforced in dispatch.
  static readonly CAT = {
    BOOKING: 'bookingUpdates',
    MARKETPLACE: 'marketplaceUpdates',
    PROMO: 'promotionalMessages',
    MISSION: 'missionUpdates',
    PAYMENT: 'priceAlerts',
    TEAM: 'missionUpdates',
  } as const;

  private async push(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
    category?: string,
  ) {
    if (!userIds || userIds.length === 0) return;
    const validIds = userIds.filter(Boolean);
    if (validIds.length === 0) return;
    try {
      // Every mobile (PUSH/IN_APP) notification is also mirrored to EMAIL
      // when the user has an email in their profile (resolved inside dispatch;
      // users without email are simply skipped for the EMAIL channel).
      // data.category lets dispatch honour per-category opt-outs.
      await this.notificationService.dispatch({
        channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        targets: { userIds: validIds },
        priority: NotificationPriority.NORMAL,
        subject: title,
        body,
        data: { ...data, ...(category ? { category } : {}) },
      });
    } catch (e: any) {
      this.logger.warn(`Push notification failed: ${e.message}`);
    }
  }

  // ── Booking Lifecycle ──────────────────────────────────────────────────────

  @OnEvent(WS_EVENTS.BOOKING_CREATED)
  async onBookingCreated(payload: any) {
    await this.push(
      [payload.customerUid],
      '📋 Booking Submitted',
      'Your booking has been submitted and is awaiting admin approval.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_ADMIN_APPROVED)
  async onBookingAdminApproved(payload: any) {
    await this.push(
      [payload.customerUid],
      '✅ Booking Approved',
      'Your booking has been approved! A fleet manager will be assigned shortly.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_CONFIRMED)
  async onBookingConfirmed(payload: any) {
    if (!payload.customerUid) return;
    await this.push(
      [payload.customerUid],
      '✅ Booking Confirmed',
      'Your booking has been confirmed and resources are being assigned.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_ADMIN_REJECTED)
  async onBookingAdminRejected(payload: any) {
    await this.push(
      [payload.customerUid],
      '❌ Booking Rejected',
      `Your booking was rejected. Reason: ${payload.reason || 'Please contact support.'}`,
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_ASSIGNED)
  async onBookingAssigned(payload: any) {
    await this.push(
      [payload.customerUid],
      '👨‍✈️ Pilot & Drone Assigned',
      'A pilot and drone have been assigned to your booking.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
    if (payload.pilotUid) {
      await this.push(
        [payload.pilotUid],
        '📌 New Mission Assigned',
        'You have been assigned a new mission. Please review and accept.',
        { bookingId: payload.bookingId, screen: 'ActiveMissionDetails' },
        NotificationEventsListener.CAT.MISSION);
    }
  }

  @OnEvent(WS_EVENTS.MISSION_PILOT_EN_ROUTE)
  async onPilotEnRoute(payload: any) {
    await this.push(
      [payload.customerUid],
      '🚁 Pilot En Route',
      'Your pilot is on the way to your farm location.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.MISSION);
  }

  @OnEvent(WS_EVENTS.MISSION_PILOT_ARRIVED)
  async onPilotArrived(payload: any) {
    await this.push(
      [payload.customerUid],
      '📍 Pilot Arrived',
      'Your pilot has arrived at the farm location.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.MISSION);
  }

  @OnEvent(WS_EVENTS.MISSION_STARTED)
  async onMissionStarted(payload: any) {
    await this.push(
      [payload.customerUid],
      '🛸 Service Started',
      'The drone service has started on your farm.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.MISSION);
  }

  @OnEvent(WS_EVENTS.MISSION_COMPLETED)
  async onMissionCompleted(payload: any) {
    await this.push(
      [payload.customerUid],
      '✅ Service Completed',
      'The drone service has been completed. Please proceed to payment.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.MISSION);
  }

  @OnEvent(WS_EVENTS.BOOKING_CANCELLED)
  async onBookingCancelled(payload: any) {
    const recipients = [payload.customerUid, payload.pilotUid, payload.fleetManagerUid].filter(Boolean);
    await this.push(
      recipients,
      '🚫 Booking Cancelled',
      `Booking has been cancelled. ${payload.reason ? `Reason: ${payload.reason}` : ''}`,
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_COMPLETED)
  async onBookingCompleted(payload: any) {
    await this.push(
      [payload.customerUid],
      '🎉 Booking Completed',
      'Your booking is complete. Thank you! Please rate your experience.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  // ── Payment Lifecycle ──────────────────────────────────────────────────────

  @OnEvent(WS_EVENTS.PAYMENT_CONFIRMED)
  async onPaymentConfirmed(payload: any) {
    const recipients = [payload.customerUid, payload.pilotUid, payload.fleetManagerUid].filter(Boolean);
    await this.push(
      recipients,
      '💰 Payment Confirmed',
      `Payment of ₹${payload.amount} has been confirmed.`,
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.PAYMENT);
  }

  @OnEvent(WS_EVENTS.PAYMENT_REFUNDED)
  async onPaymentRefunded(payload: any) {
    await this.push(
      [payload.customerUid],
      '💸 Refund Processed',
      'Your refund has been processed and will reflect shortly.',
      { bookingId: payload.bookingId, screen: 'CustomerRefundsScreen' },
      NotificationEventsListener.CAT.PAYMENT);
  }

  // ── Fleet Manager Assignment ───────────────────────────────────────────────

  @OnEvent(WS_EVENTS.FLEET_MANAGER_REQUEST_RECEIVED)
  async onFleetManagerRequestReceived(payload: any) {
    await this.push(
      [payload.fleetManagerUid],
      '📥 New Booking Request',
      'You have received a new booking assignment request.',
      { bookingId: payload.bookingId, screen: 'IncomingRequestDetails' },
      NotificationEventsListener.CAT.BOOKING);
  }

  @OnEvent(WS_EVENTS.BOOKING_FLEET_MANAGER_ASSIGNED)
  async onFleetManagerAssigned(payload: any) {
    await this.push(
      [payload.customerUid],
      '👥 Fleet Manager Assigned',
      'A fleet manager has been assigned to coordinate your booking.',
      { bookingId: payload.bookingId, screen: 'BookingDetailsScreen' },
      NotificationEventsListener.CAT.BOOKING);
  }

  // ── Team (FM ↔ Pilot) ──────────────────────────────────────────────────────

  @OnEvent(WS_EVENTS.TEAM_INVITE_CREATED)
  async onTeamInviteCreated(payload: any) {
    await this.push(
      [payload.pilotUid],
      '✈️ Team Invitation',
      `${payload.fmName || 'A fleet manager'} has invited you to join their team.`,
      { inviteId: payload.inviteId, screen: 'Home' },
      NotificationEventsListener.CAT.TEAM);
  }

  @OnEvent(WS_EVENTS.TEAM_REQUEST_CREATED)
  async onTeamRequestCreated(payload: any) {
    await this.push(
      [payload.fmUid],
      '🙋 Pilot Wants to Join',
      `${payload.pilotName || 'A pilot'} wants to join your team.`,
      { inviteId: payload.inviteId, screen: 'Home' },
      NotificationEventsListener.CAT.TEAM);
  }

  @OnEvent(WS_EVENTS.TEAM_UPDATED)
  async onTeamUpdated(payload: any) {
    if (payload.status === 'accepted') {
      await this.push(
        [payload.pilotUid, payload.fmUid],
        '✅ Team Updated',
        'You are now on the same team. Missions can now be assigned.',
        { inviteId: payload.inviteId, screen: 'Home' },
        NotificationEventsListener.CAT.TEAM);
    } else {
      await this.push(
        [payload.pilotUid, payload.fmUid],
        '❌ Team Request Declined',
        'A team invite/request was declined.',
        { inviteId: payload.inviteId, screen: 'Home' },
      );
    }
  }

  // ── Marketplace Order Lifecycle ────────────────────────────────────────────

  @OnEvent('marketplace.order.created')
  async onOrderCreated(payload: any) {
    await this.push(
      [payload.customerUid],
      '🛒 Order Placed',
      'Your order has been placed successfully and is being processed.',
      { orderId: payload.orderId, screen: 'OrderDetailsScreen' },
      NotificationEventsListener.CAT.MARKETPLACE);
  }

  @OnEvent('marketplace.order.status')
  async onOrderStatusChanged(payload: any) {
    if (!payload.customerUid) return;

    const messages: Record<string, { title: string; body: string }> = {
      confirmed:        { title: '✅ Order Confirmed',   body: 'Your order has been confirmed by the vendor.' },
      dispatched:       { title: '📦 Order Dispatched',  body: 'Your order has been dispatched and is on its way.' },
      out_for_delivery: { title: '🚚 Out for Delivery',  body: 'Your order is out for delivery. Expect it soon!' },
      delayed:          { title: '⏳ Order Delayed',     body: 'Your order has been delayed. We apologize for the inconvenience.' },
      delivered:        { title: '🎉 Order Delivered',   body: 'Your order has been delivered. Enjoy!' },
      cancelled:        { title: '❌ Order Cancelled',   body: 'Your order has been cancelled.' },
      refunded:         { title: '💸 Order Refunded',    body: 'Your order refund has been processed.' },
    };

    const msg = messages[payload.status];
    if (!msg) return;

    await this.push(
      [payload.customerUid],
      msg.title,
      msg.body,
      { orderId: payload.orderId, screen: 'OrderDetailsScreen' },
    );
  }
}
