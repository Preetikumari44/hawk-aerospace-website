import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { NotificationService } from '../notification/notification.service';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import {
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  ComplaintFilterDto,
  ComplaintResponseDto,
  ComplaintStatsDto,
  ComplaintStatus,
  ComplaintPriority,
} from './dto/complaint.dto';
import { ComplaintSlaService } from './services/complaint-sla.service';
import { NotificationChannel, NotificationPriority } from '../notification/interfaces/notification-provider.interface';

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly notificationService: NotificationService,
    private readonly complaintSlaService: ComplaintSlaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new complaint (all roles)
   */
  async create(dto: CreateComplaintDto, user: CurrentUser): Promise<ComplaintResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const complaintRef = firestore.collection('complaints').doc();
    const now = new Date().toISOString();

    // Auto-assign priority if not provided
    const priority = dto.priority || ComplaintPriority.MEDIUM;

    // Calculate SLA deadline
    const slaDeadline = this.complaintSlaService.calculateSlaDeadline(priority, now);

    const complaint: ComplaintResponseDto = {
      complaintId: complaintRef.id,
      userId: user.uid,
      userRole: user.role,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId,
      type: dto.type,
      description: dto.description,
      attachments: dto.attachments || [],
      status: ComplaintStatus.OPEN,
      priority,
      slaDeadline,
      slaBreached: false,
      createdAt: now,
      updatedAt: now,
    };

    await complaintRef.set(complaint);

    this.logger.log(
      `Complaint created: ${complaint.complaintId} by ${user.role} ${user.uid} with priority ${priority}`,
    );

    // Emit event
    this.eventEmitter.emit('complaint.created', {
      complaintId: complaint.complaintId,
      userId: user.uid,
      userRole: user.role,
      type: dto.type,
      priority,
      slaDeadline,
    });

    // Send notification to admins
    await this.notifyAdmins('new', complaint);

    return complaint;
  }

  /**
   * Get user's own complaints
   */
  async getMyComplaints(
    user: CurrentUser,
    filter: ComplaintFilterDto,
  ): Promise<{ items: ComplaintResponseDto[]; meta: any }> {
    const firestore = this.firebaseAdminService.firestore();
    let query = firestore.collection('complaints').where('userId', '==', user.uid) as any;

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    if (filter.type) {
      query = query.where('type', '==', filter.type);
    }

    if (filter.priority) {
      query = query.where('priority', '==', filter.priority);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        slaBreached: this.complaintSlaService.isSlaBreached(data.slaDeadline, data.status),
      } as ComplaintResponseDto;
    });

    return {
      items,
      meta: {
        total: items.length,
        page: filter.page || 1,
        limit: filter.limit || 10,
      },
    };
  }

  /**
   * Get single complaint detail
   */
  async getComplaintById(complaintId: string, user: CurrentUser): Promise<ComplaintResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const doc = await firestore.collection('complaints').doc(complaintId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    const complaint = doc.data() as ComplaintResponseDto;

    // Check access rights (user can only see their own complaints unless admin)
    if (
      complaint.userId !== user.uid &&
      !['admin', 'super_admin', 'subadmin'].includes(user.role)
    ) {
      throw new ForbiddenException('You do not have access to this complaint');
    }

    return {
      ...complaint,
      slaBreached: this.complaintSlaService.isSlaBreached(complaint.slaDeadline, complaint.status),
    };
  }

  /**
   * Update complaint status (Admin/SubAdmin only)
   */
  async updateStatus(
    complaintId: string,
    dto: UpdateComplaintStatusDto,
    user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    // Only admins can update status
    if (!['admin', 'super_admin', 'subadmin'].includes(user.role)) {
      throw new ForbiddenException('Only admins can update complaint status');
    }

    const firestore = this.firebaseAdminService.firestore();
    const complaintRef = firestore.collection('complaints').doc(complaintId);
    const doc = await complaintRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    const complaint = doc.data() as ComplaintResponseDto;

    // Validate resolution is provided when resolving/closing
    if (
      (dto.status === ComplaintStatus.RESOLVED || dto.status === ComplaintStatus.CLOSED) &&
      !dto.resolution
    ) {
      throw new BadRequestException('Resolution is required when resolving or closing a complaint');
    }

    const now = new Date().toISOString();
    const updates: any = {
      status: dto.status,
      updatedAt: now,
    };

    if (dto.resolution) {
      updates.resolution = dto.resolution;
    }

    if (dto.assignedTo) {
      updates.assignedTo = dto.assignedTo;
    }

    if (dto.status === ComplaintStatus.RESOLVED || dto.status === ComplaintStatus.CLOSED) {
      updates.resolvedAt = now;
    }

    await complaintRef.update(updates);

    const updatedComplaint = { ...complaint, ...updates };

    this.logger.log(
      `Complaint ${complaintId} status updated to ${dto.status} by ${user.role} ${user.uid}`,
    );

    // Emit event
    this.eventEmitter.emit('complaint.status_updated', {
      complaintId,
      oldStatus: complaint.status,
      newStatus: dto.status,
      updatedBy: user.uid,
    });

    // Notify the user who created the complaint
    await this.notifyUser(complaint.userId, 'status_update', updatedComplaint);

    return updatedComplaint as ComplaintResponseDto;
  }

  /**
   * Assign complaint to admin/subadmin
   */
  async assignComplaint(
    complaintId: string,
    assignedTo: string,
    user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    if (!['admin', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only admins can assign complaints');
    }

    const firestore = this.firebaseAdminService.firestore();
    const complaintRef = firestore.collection('complaints').doc(complaintId);
    const doc = await complaintRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    const now = new Date().toISOString();
    await complaintRef.update({
      assignedTo,
      status: ComplaintStatus.IN_PROGRESS,
      updatedAt: now,
    });

    const complaint = doc.data() as ComplaintResponseDto;

    this.logger.log(`Complaint ${complaintId} assigned to ${assignedTo} by ${user.uid}`);

    // Notify assigned admin
    await this.notifyUser(assignedTo, 'assigned', complaint);

    return { ...complaint, assignedTo, status: ComplaintStatus.IN_PROGRESS, updatedAt: now };
  }

  /**
   * Get all complaints (Admin only) with advanced filtering
   */
  async getAllComplaints(
    filter: ComplaintFilterDto,
    user: CurrentUser,
  ): Promise<{ items: ComplaintResponseDto[]; meta: any }> {
    if (!['admin', 'super_admin', 'subadmin'].includes(user.role)) {
      throw new ForbiddenException('Only admins can view all complaints');
    }

    const firestore = this.firebaseAdminService.firestore();
    let query = firestore.collection('complaints') as any;

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    if (filter.type) {
      query = query.where('type', '==', filter.type);
    }

    if (filter.priority) {
      query = query.where('priority', '==', filter.priority);
    }

    if (filter.userId) {
      query = query.where('userId', '==', filter.userId);
    }

    if (filter.userRole) {
      query = query.where('userRole', '==', filter.userRole);
    }

    if (filter.assignedTo) {
      query = query.where('assignedTo', '==', filter.assignedTo);
    }

    if (filter.relatedEntityType) {
      query = query.where('relatedEntityType', '==', filter.relatedEntityType);
    }

    if (filter.relatedEntityId) {
      query = query.where('relatedEntityId', '==', filter.relatedEntityId);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        slaBreached: this.complaintSlaService.isSlaBreached(data.slaDeadline, data.status),
      } as ComplaintResponseDto;
    });

    return {
      items,
      meta: {
        total: items.length,
        page: filter.page || 1,
        limit: filter.limit || 10,
      },
    };
  }

  /**
   * Get complaint statistics
   */
  async getComplaintStats(user: CurrentUser): Promise<ComplaintStatsDto> {
    const firestore = this.firebaseAdminService.firestore();
    let query = firestore.collection('complaints') as any;

    // If not admin, show only user's stats
    if (!['admin', 'super_admin', 'subadmin'].includes(user.role)) {
      query = query.where('userId', '==', user.uid);
    }

    const snapshot = await query.get();
    const complaints = snapshot.docs.map((doc: any) => doc.data());

    const byStatus = {
      open: complaints.filter((c: any) => c.status === ComplaintStatus.OPEN).length,
      inProgress: complaints.filter((c: any) => c.status === ComplaintStatus.IN_PROGRESS).length,
      resolved: complaints.filter((c: any) => c.status === ComplaintStatus.RESOLVED).length,
      closed: complaints.filter((c: any) => c.status === ComplaintStatus.CLOSED).length,
    };

    const byPriority = {
      low: complaints.filter((c: any) => c.priority === ComplaintPriority.LOW).length,
      medium: complaints.filter((c: any) => c.priority === ComplaintPriority.MEDIUM).length,
      high: complaints.filter((c: any) => c.priority === ComplaintPriority.HIGH).length,
      critical: complaints.filter((c: any) => c.priority === ComplaintPriority.CRITICAL).length,
    };

    // Calculate SLA compliance
    const withinSla = complaints.filter(
      (c: any) => !this.complaintSlaService.isSlaBreached(c.slaDeadline, c.status),
    ).length;
    const breached = complaints.length - withinSla;
    const complianceRate = complaints.length > 0 ? (withinSla / complaints.length) * 100 : 100;

    const avgResolutionTime = this.complaintSlaService.calculateAverageResolutionTime(complaints);

    return {
      total: complaints.length,
      byStatus,
      byPriority,
      slaCompliance: {
        withinSla,
        breached,
        complianceRate: Math.round(complianceRate * 100) / 100,
      },
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
    };
  }

  /**
   * Get complaints nearing SLA breach (Admin only)
   */
  async getComplaintsNearingBreach(user: CurrentUser): Promise<ComplaintResponseDto[]> {
    if (!['admin', 'super_admin', 'subadmin'].includes(user.role)) {
      throw new ForbiddenException('Only admins can view this data');
    }

    const firestore = this.firebaseAdminService.firestore();
    const snapshot = await firestore
      .collection('complaints')
      .where('status', 'in', [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS])
      .get();

    const complaints = snapshot.docs.map((doc: any) => ({
      ...doc.data(),
      slaBreached: this.complaintSlaService.isSlaBreached(doc.data().slaDeadline, doc.data().status),
    }));

    return this.complaintSlaService.getComplaintsNearingBreach(complaints);
  }

  /**
   * Delete complaint (Admin only)
   */
  async deleteComplaint(complaintId: string, user: CurrentUser): Promise<void> {
    if (!['admin', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only admins can delete complaints');
    }

    const firestore = this.firebaseAdminService.firestore();
    await firestore.collection('complaints').doc(complaintId).delete();

    this.logger.log(`Complaint ${complaintId} deleted by ${user.uid}`);
  }

  /**
   * Notify admins about new/critical complaints
   */
  private async notifyAdmins(type: 'new' | 'critical', complaint: ComplaintResponseDto): Promise<void> {
    try {
      const priority =
        complaint.priority === ComplaintPriority.CRITICAL
          ? NotificationPriority.HIGH
          : NotificationPriority.NORMAL;

      await this.notificationService.dispatch({
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
        targets: {
          role: 'admin',
        },
        priority,
        subject: `New ${complaint.priority} Complaint`,
        body: `A new ${complaint.priority} priority complaint has been created by ${complaint.userRole}. Type: ${complaint.type}`,
        data: {
          complaintId: complaint.complaintId,
          type: complaint.type,
          priority: complaint.priority,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to notify admins: ${error.message}`);
    }
  }

  /**
   * Notify user about complaint status updates
   */
  private async notifyUser(
    userId: string,
    type: 'status_update' | 'assigned',
    complaint: ComplaintResponseDto,
  ): Promise<void> {
    try {
      let subject = '';
      let body = '';

      if (type === 'status_update') {
        subject = 'Complaint Status Updated';
        body = `Your complaint (${complaint.complaintId}) status has been updated to ${complaint.status}`;
      } else if (type === 'assigned') {
        subject = 'Complaint Assigned';
        body = `Your complaint (${complaint.complaintId}) has been assigned to an admin`;
      }

      await this.notificationService.dispatch({
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        targets: {
          userIds: [userId],
        },
        priority: NotificationPriority.NORMAL,
        subject,
        body,
        data: {
          complaintId: complaint.complaintId,
          status: complaint.status,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to notify user ${userId}: ${error.message}`);
    }
  }
}
