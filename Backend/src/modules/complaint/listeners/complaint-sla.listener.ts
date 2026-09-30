import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { NotificationService } from '../../notification/notification.service';
import { ComplaintSlaService } from '../services/complaint-sla.service';
import { ComplaintStatus } from '../dto/complaint.dto';
import { COMPLAINT_EVENTS, ComplaintCreatedEvent } from '../events/complaint.events';
import { NotificationChannel, NotificationPriority } from '../../notification/interfaces/notification-provider.interface';

/**
 * Listener for complaint SLA monitoring and auto-escalation
 */
@Injectable()
export class ComplaintSlaListener {
  private readonly logger = new Logger(ComplaintSlaListener.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly notificationService: NotificationService,
    private readonly complaintSlaService: ComplaintSlaService,
  ) {}

  /**
   * Monitor newly created critical complaints
   */
  @OnEvent(COMPLAINT_EVENTS.CREATED)
  async handleComplaintCreated(event: ComplaintCreatedEvent) {
    if (event.priority === 'CRITICAL') {
      this.logger.warn(
        `CRITICAL complaint created: ${event.complaintId} - SLA deadline: ${event.slaDeadline}`,
      );

      // Send immediate alert to all admins
      await this.notificationService.dispatch({
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
        targets: {
          role: 'admin',
        },
        priority: NotificationPriority.HIGH,
        subject: '🚨 CRITICAL Complaint Alert',
        body: `A CRITICAL priority complaint has been created and requires immediate attention within 4 hours.`,
        data: {
          complaintId: event.complaintId,
          priority: event.priority,
          slaDeadline: event.slaDeadline,
        },
      });
    }
  }

  /**
   * Check for SLA breaches every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkSlaBreaches() {
    this.logger.log('Running SLA breach check...');

    try {
      const firestore = this.firebaseAdminService.firestore();
      const snapshot = await firestore
        .collection('complaints')
        .where('status', 'in', [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS])
        .get();

      const now = new Date();
      let breachedCount = 0;
      let nearingBreachCount = 0;

      for (const doc of snapshot.docs) {
        const complaint = doc.data();
        const slaDeadline = new Date(complaint.slaDeadline);

        // Check if SLA is breached
        if (now > slaDeadline) {
          breachedCount++;
          const hoursOverdue = (now.getTime() - slaDeadline.getTime()) / (60 * 60 * 1000);

          this.logger.error(
            `SLA BREACHED: Complaint ${doc.id} is ${Math.round(hoursOverdue)} hours overdue`,
          );

          // Send breach notification
          await this.notificationService.dispatch({
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            targets: {
              role: 'admin',
            },
            priority: NotificationPriority.HIGH,
            subject: '⚠️ SLA Breach Alert',
            body: `Complaint ${doc.id} has breached SLA by ${Math.round(hoursOverdue)} hours`,
            data: {
              complaintId: doc.id,
              hoursOverdue: Math.round(hoursOverdue),
            },
          });
        }
        // Check if nearing breach (within 25% of deadline)
        else if (this.complaintSlaService.getTimeRemainingHours(complaint.slaDeadline) <= 2) {
          nearingBreachCount++;
          this.logger.warn(`Complaint ${doc.id} is nearing SLA breach`);
        }
      }

      this.logger.log(
        `SLA check complete: ${breachedCount} breached, ${nearingBreachCount} nearing breach out of ${snapshot.size} open complaints`,
      );
    } catch (error: any) {
      this.logger.error(`Error checking SLA breaches: ${error.message}`, error.stack);
    }
  }

  /**
   * Send daily SLA compliance report to admins
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailySlaReport() {
    this.logger.log('Generating daily SLA compliance report...');

    try {
      const firestore = this.firebaseAdminService.firestore();
      const snapshot = await firestore.collection('complaints').get();

      const complaints = snapshot.docs.map((doc) => doc.data());

      const withinSla = complaints.filter(
        (c: any) => !this.complaintSlaService.isSlaBreached(c.slaDeadline, c.status),
      ).length;
      const breached = complaints.length - withinSla;
      const complianceRate =
        complaints.length > 0 ? ((withinSla / complaints.length) * 100).toFixed(2) : '100';

      const avgResolutionTime = this.complaintSlaService.calculateAverageResolutionTime(complaints);

      await this.notificationService.dispatch({
        channels: [NotificationChannel.EMAIL],
        targets: {
          role: 'admin',
        },
        priority: NotificationPriority.NORMAL,
        subject: 'Daily Complaint SLA Report',
        body: `
          Complaint SLA Report for ${new Date().toLocaleDateString()}
          
          Total Complaints: ${complaints.length}
          Within SLA: ${withinSla}
          Breached: ${breached}
          Compliance Rate: ${complianceRate}%
          Avg Resolution Time: ${avgResolutionTime.toFixed(2)} hours
        `,
      });

      this.logger.log('Daily SLA report sent successfully');
    } catch (error: any) {
      this.logger.error(`Error sending daily SLA report: ${error.message}`, error.stack);
    }
  }
}
