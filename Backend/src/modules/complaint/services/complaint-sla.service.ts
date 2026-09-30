import { Injectable, Logger } from '@nestjs/common';
import { ComplaintPriority, ComplaintStatus } from '../dto/complaint.dto';

/**
 * Service for managing SLA (Service Level Agreement) for complaints
 * SLA Response Times:
 * - CRITICAL: 4 hours
 * - HIGH: 24 hours
 * - MEDIUM: 48 hours
 * - LOW: 72 hours
 */
@Injectable()
export class ComplaintSlaService {
  private readonly logger = new Logger(ComplaintSlaService.name);

  // SLA in milliseconds
  private readonly SLA_DEADLINES = {
    [ComplaintPriority.CRITICAL]: 4 * 60 * 60 * 1000, // 4 hours
    [ComplaintPriority.HIGH]: 24 * 60 * 60 * 1000, // 24 hours
    [ComplaintPriority.MEDIUM]: 48 * 60 * 60 * 1000, // 48 hours
    [ComplaintPriority.LOW]: 72 * 60 * 60 * 1000, // 72 hours
  };

  /**
   * Calculate SLA deadline based on priority and creation time
   */
  calculateSlaDeadline(priority: ComplaintPriority, createdAt: string): string {
    const createdDate = new Date(createdAt);
    const slaMs = this.SLA_DEADLINES[priority];
    const deadline = new Date(createdDate.getTime() + slaMs);
    return deadline.toISOString();
  }

  /**
   * Check if complaint has breached SLA
   */
  isSlaBreached(slaDeadline: string, status: ComplaintStatus): boolean {
    // If already resolved or closed, check if it was resolved before deadline
    if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) {
      return false; // Consider resolved complaints as compliant
    }

    const now = new Date();
    const deadline = new Date(slaDeadline);
    return now > deadline;
  }

  /**
   * Get time remaining until SLA breach (in hours)
   */
  getTimeRemainingHours(slaDeadline: string): number {
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    return Math.max(0, diffMs / (60 * 60 * 1000));
  }

  /**
   * Get SLA status text
   */
  getSlaStatusText(slaDeadline: string, status: ComplaintStatus): string {
    if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) {
      return 'Resolved';
    }

    const hoursRemaining = this.getTimeRemainingHours(slaDeadline);
    if (hoursRemaining <= 0) {
      return 'SLA Breached';
    }

    if (hoursRemaining < 1) {
      return `${Math.round(hoursRemaining * 60)} minutes remaining`;
    }

    return `${Math.round(hoursRemaining)} hours remaining`;
  }

  /**
   * Calculate average resolution time from complaints
   */
  calculateAverageResolutionTime(complaints: any[]): number {
    const resolvedComplaints = complaints.filter(
      (c) => c.resolvedAt && (c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED),
    );

    if (resolvedComplaints.length === 0) return 0;

    const totalResolutionTime = resolvedComplaints.reduce((sum, complaint) => {
      const created = new Date(complaint.createdAt).getTime();
      const resolved = new Date(complaint.resolvedAt).getTime();
      return sum + (resolved - created);
    }, 0);

    // Return average in hours
    return totalResolutionTime / resolvedComplaints.length / (60 * 60 * 1000);
  }

  /**
   * Get complaints that are about to breach SLA (within 25% of deadline)
   */
  getComplaintsNearingBreach(complaints: any[]): any[] {
    return complaints.filter((complaint) => {
      if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
        return false;
      }

      const hoursRemaining = this.getTimeRemainingHours(complaint.slaDeadline);
      const totalSlaHours = this.SLA_DEADLINES[complaint.priority as ComplaintPriority] / (60 * 60 * 1000);
      const percentRemaining = (hoursRemaining / totalSlaHours) * 100;

      return percentRemaining <= 25 && percentRemaining > 0;
    });
  }

  /**
   * Auto-escalate priority if SLA is about to breach
   */
  shouldEscalatePriority(complaint: any): boolean {
    const hoursRemaining = this.getTimeRemainingHours(complaint.slaDeadline);
    return hoursRemaining <= 2 && complaint.priority !== ComplaintPriority.CRITICAL;
  }
}
