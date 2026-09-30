/**
 * Example: How to use NotificationService.dispatch() in Booking Flow
 * 
 * This file shows how to integrate multi-channel notifications
 * into your booking service.
 */

import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification.service';
import { NotificationChannel, NotificationPriority } from '../interfaces/notification-provider.interface';

@Injectable()
export class BookingNotificationExamples {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Example 1: Booking Confirmation (Multi-Channel)
   * Sends SMS + Email + IN_APP + Push notification
   */
  async sendBookingConfirmation(booking: any) {
    await this.notificationService.dispatch({
      channels: [
        NotificationChannel.SMS,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
      ],
      targets: {
        userIds: [booking.customerUid],
      },
      priority: NotificationPriority.HIGH,
      subject: 'Booking Confirmed',
      body: `Your ${booking.serviceType} booking #${booking.id} is confirmed for ${booking.scheduledDate}.`,
      data: {
        bookingId: booking.id,
        serviceType: booking.serviceType,
        scheduledDate: booking.scheduledDate,
        trackingUrl: `https://app.hawkaero.com/bookings/${booking.id}`,
      },
    });
  }

  /**
   * Example 2: OTP Verification (Critical Priority - SMS Only)
   * Immediate delivery with retry
   */
  async sendOTP(phone: string, otp: string) {
    await this.notificationService.dispatch({
      channels: [NotificationChannel.SMS],
      targets: {
        phones: [phone],
      },
      priority: NotificationPriority.CRITICAL, // Immediate, retry 3x
      subject: 'OTP Verification',
      body: `Your Hawk Aerosystem OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      data: {
        otp,
        expiresIn: '10 minutes',
      },
    });
  }

  /**
   * Example 3: Pilot Assignment (Push + IN_APP)
   * Real-time notification to pilot
   */
  async notifyPilotAssignment(missionId: string, pilotUid: string, details: any) {
    await this.notificationService.dispatch({
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
      ],
      targets: {
        userIds: [pilotUid],
      },
      priority: NotificationPriority.HIGH,
      subject: 'New Mission Assigned',
      body: `You have been assigned to ${details.serviceType} mission at ${details.location}. Scheduled: ${details.scheduledTime}`,
      data: {
        missionId,
        serviceType: details.serviceType,
        location: details.location,
        scheduledTime: details.scheduledTime,
      },
    });
  }

  /**
   * Example 4: Payment Receipt (Email Only)
   * Formal receipt via email
   */
  async sendPaymentReceipt(customerUid: string, payment: any) {
    await this.notificationService.dispatch({
      channels: [NotificationChannel.EMAIL],
      targets: {
        userIds: [customerUid],
      },
      priority: NotificationPriority.NORMAL,
      subject: `Payment Receipt - ${payment.invoiceNumber}`,
      body: `Thank you for your payment of ₹${payment.amount}. Invoice: ${payment.invoiceNumber}`,
      data: {
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        date: payment.date,
        html: this.generateReceiptHTML(payment), // Custom HTML template
      },
    });
  }

  /**
   * Example 5: Role-Based Broadcast (All Pilots)
   * Notify all pilots about new marketplace opportunity
   */
  async broadcastToAllPilots(message: string) {
    await this.notificationService.dispatch({
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
      ],
      targets: {
        role: 'pilot', // Automatically fetches all pilots
      },
      priority: NotificationPriority.NORMAL,
      subject: 'Marketplace Opportunity',
      body: message,
    });
  }

  /**
   * Example 6: Booking Cancellation with Refund (Multi-Channel)
   */
  async sendCancellationNotification(booking: any, refundAmount: number) {
    await this.notificationService.dispatch({
      channels: [
        NotificationChannel.SMS,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      targets: {
        userIds: [booking.customerUid],
      },
      priority: NotificationPriority.HIGH,
      subject: 'Booking Cancelled',
      body: `Your booking #${booking.id} has been cancelled. Refund of ₹${refundAmount} will be processed within 5-7 business days.`,
      data: {
        bookingId: booking.id,
        refundAmount,
        cancellationReason: booking.cancellationReason,
      },
    });
  }

  /**
   * Helper: Generate HTML receipt template
   */
  private generateReceiptHTML(payment: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Receipt</h2>
        <p>Invoice: <strong>${payment.invoiceNumber}</strong></p>
        <p>Amount: <strong>₹${payment.amount}</strong></p>
        <p>Date: ${payment.date}</p>
        <p>Thank you for your business!</p>
      </div>
    `;
  }
}
