import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, Query } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

import { ROOT_COLLECTIONS, USER_SUBCOLLECTIONS } from '../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import {
  type AdditionalChargeResponseDto,
  type ChargeItemDto,
  type SubmitAdditionalChargesDto,
} from './dto/additional-charges.dto';
import {
  ComplaintPriority,
  ComplaintStatus,
  type ComplaintFilterDto,
  type ComplaintResponseDto,
  type CreateComplaintDto,
} from './dto/complaint.dto';
import {
  type EarningsBreakdownDto,
  type EarningsFilterDto,
  EarningsPeriod,
  type EarningsSummaryDto,
  type PayoutMethodDto,
} from './dto/earnings.dto';
import { TechnicianFilterDto } from './dto/technician-filter.dto';
import { TechnicianOnboardDto } from './dto/technician-onboard.dto';
import { TechnicianProfileDto } from './dto/technician-profile.dto';
import {
  TicketPriority,
  type TicketResponseDto,
  TicketStatus,
  type TicketFilterDto,
} from './dto/technician-ticket.dto';
import {
  type AcceptTicketDto,
  type CompleteTicketDto,
  type RejectTicketDto,
  TicketStage,
  type UpdateTicketStageDto,
} from './dto/ticket-stage.dto';

/**
 * SLA deadlines in hours per priority (§5.4)
 */
const SLA_HOURS: Record<string, number> = {
  CRITICAL: 50,
  URGENT: 50,
  HIGH: 100,
  MEDIUM: 168,
  NORMAL: 168,
  LOW: 288,
};

/**
 * Technician earnings share (§5.4)
 */
const TECH_SHARE = 0.7; // 70%
const SLA_MET_BONUS = 0.05; // +5%
const SLA_BREACH_PENALTY = 0.1; // -10%

/**
 * Comprehensive Technician Service implementing all P0 and P1 features from implementation_plan.md §5
 *
 * P0 Features:
 * - Incoming tickets + accept/reject
 * - Stage transitions with photo validation
 * - Additional charges submit → FM approve
 *
 * P1 Features:
 * - Before/after photo capture on complete
 * - Diagnosis report / parts tracking
 * - Earnings dashboard + payout method
 * - Complaint management
 *
 * P2 Features (placeholders):
 * - UPI QR generation
 * - SLA tracking & breach alerts
 */
@Injectable()
export class TechnicianService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onboard(dto: TechnicianOnboardDto, user: CurrentUser): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      role: 'technician',
      status: 'pending',
      adminApproval: false,
      profileData: {
        ...existing.profileData,
        specializations: dto.specializations,
        serviceRegion: dto.serviceRegion,
      },
      verification: {
        isVerified: false,
        documents: dto.documents,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.usersCollection().doc(user.uid).set(updated, { merge: true });

    this.eventEmitter.emit('technician.onboarded', { technicianUid: user.uid });

    return updated;
  }

  async updateProfile(
    dto: TechnicianProfileDto,
    user: CurrentUser,
  ): Promise<FirestoreUserDocument> {
    const existing = await this.usersService.getByUid(user.uid);
    const updated: FirestoreUserDocument = {
      ...existing,
      profileData: {
        ...existing.profileData,
        ...dto,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.usersCollection().doc(user.uid).set(updated, { merge: true });
    return updated;
  }

  async list(filter: TechnicianFilterDto) {
    let query: Query<FirestoreUserDocument> = this.usersCollection().where(
      'role',
      '==',
      'technician',
    );
    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }
    const snapshot = await query.get();
    let items = snapshot.docs.map((doc) => doc.data()).filter((item) => !item.deletedAt);
    if (filter.specialization) {
      items = items.filter((item) => this.hasSpecialization(item, filter.specialization!));
    }
    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    return {
      items: items.slice(start, start + filter.limit),
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  async get(id: string) {
    const snapshot = await this.usersCollection().doc(id).get();
    const user = snapshot.data();
    if (!snapshot.exists || !user || user.role !== 'technician' || user.deletedAt) {
      throw new NotFoundException(`Technician ${id} not found.`);
    }
    return user;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.get(id);
    await this.usersService.softDelete(id);
    return { deleted: true };
  }

  async getMaintenanceTickets(technicianUid: string) {
    const firestore = this.firebaseAdminService.firestore();
    const ticketsSnapshot = await firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('technicianUid', '==', technicianUid)
      .get();
    
    return ticketsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getRepairedDrones(technicianUid: string) {
    // Get all maintenance tickets completed by this technician
    const firestore = this.firebaseAdminService.firestore();
    const ticketsSnapshot = await firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('technicianUid', '==', technicianUid)
      .where('status', '==', 'COMPLETED')
      .get();

    const droneIds = new Set<string>();
    ticketsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.droneId) {
        droneIds.add(data.droneId);
      }
    });

    // Fetch drone details for all unique drone IDs
    const drones = [];
    for (const droneId of droneIds) {
      const droneSnapshot = await firestore.collection(USER_SUBCOLLECTIONS.drones).doc(droneId).get();
      if (droneSnapshot.exists) {
        drones.push({ id: droneSnapshot.id, ...droneSnapshot.data() });
      }
    }

    return drones;
  }

  async getSupportDocuments(technicianUid: string) {
    const user = await this.get(technicianUid);
    return user.verification?.documents || [];
  }

  // ==================== P0: INCOMING TICKETS + ACCEPT/REJECT ====================

  /**
   * Get incoming tickets (status=OPEN, not yet assigned or assigned to this tech)
   */
  async getIncomingTickets(
    user: CurrentUser,
    filter: TicketFilterDto,
  ): Promise<{ items: TicketResponseDto[]; meta: any }> {
    const firestore = this.firebaseAdminService.firestore();
    let query = firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('status', 'in', ['OPEN', 'ASSIGNED']) as any;

    const snapshot = await query.get();
    let items = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as TicketResponseDto;
      })
      .filter(
        (ticket: any) =>
          !ticket.technicianUid || ticket.technicianUid === user.uid,
      );

    if (filter.priority) {
      items = items.filter((t: any) => t.priority === filter.priority);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(
        (t: any) =>
          t.description?.toLowerCase().includes(searchLower) ||
          t.droneId?.toLowerCase().includes(searchLower) ||
          t.category?.toLowerCase().includes(searchLower),
      );
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const paged = items.slice(start, start + filter.limit);

    return {
      items: paged,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  /**
   * Get technician's active tickets
   */
  async getMyTickets(
    user: CurrentUser,
    filter: TicketFilterDto,
  ): Promise<{ items: TicketResponseDto[]; meta: any }> {
    const firestore = this.firebaseAdminService.firestore();
    let query = firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('technicianUid', '==', user.uid) as any;

    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }

    if (filter.priority) {
      query = query.where('priority', '==', filter.priority);
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as TicketResponseDto;
    });

    if (filter.droneId) {
      items = items.filter((t: any) => t.droneId === filter.droneId);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(
        (t: any) =>
          t.description?.toLowerCase().includes(searchLower) ||
          t.droneId?.toLowerCase().includes(searchLower) ||
          t.category?.toLowerCase().includes(searchLower),
      );
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const paged = items.slice(start, start + filter.limit);

    return {
      items: paged,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  /**
   * Get ticket details
   */
  async getTicketById(ticketId: string, user: CurrentUser): Promise<TicketResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketDoc = await firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .doc(ticketId)
      .get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    // Authorization
    if (data.technicianUid && data.technicianUid !== user.uid) {
      if (!['admin', 'super_admin', 'vendor'].includes(user.role)) {
        throw new ForbiddenException('Access denied');
      }
    }

    // Fetch drone details
    let drone = null;
    if (data.droneId) {
      try {
        const droneSnapshot = await firestore
          .collectionGroup(USER_SUBCOLLECTIONS.drones)
          .where('id', '==', data.droneId)
          .limit(1)
          .get();

        if (!droneSnapshot.empty) {
          drone = { id: droneSnapshot.docs[0].id, ...droneSnapshot.docs[0].data() };
        }
      } catch (error) {
        // Continue without drone
      }
    }

    return {
      id: ticketDoc.id,
      ...data,
      drone,
    } as TicketResponseDto;
  }

  /**
   * Accept a ticket
   */
  async acceptTicket(
    ticketId: string,
    dto: AcceptTicketDto,
    user: CurrentUser,
  ): Promise<TicketResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (!['OPEN', 'ASSIGNED'].includes(data.status)) {
      throw new BadRequestException(`Cannot accept ticket in status ${data.status}`);
    }

    if (data.technicianUid && data.technicianUid !== user.uid) {
      throw new BadRequestException('Ticket already assigned to another technician');
    }

    const now = new Date().toISOString();
    const updatedData: any = {
      technicianUid: user.uid,
      status: TicketStatus.IN_PROGRESS,
      stage: TicketStage.ACCEPTED,
      estimatedCompletionDate: dto.estimatedCompletionDate || null,
      acceptedAt: now,
      updatedAt: now,
    };

    if (dto.notes) {
      updatedData.acceptanceNotes = dto.notes;
    }

    await ticketRef.update(updatedData);

    this.eventEmitter.emit('maintenance.ticket_accepted', {
      ticketId,
      technicianUid: user.uid,
    });

    return this.getTicketById(ticketId, user);
  }

  /**
   * Reject a ticket
   */
  async rejectTicket(
    ticketId: string,
    dto: RejectTicketDto,
    user: CurrentUser,
  ): Promise<TicketResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (!['OPEN', 'ASSIGNED'].includes(data.status)) {
      throw new BadRequestException(`Cannot reject ticket in status ${data.status}`);
    }

    if (data.technicianUid && data.technicianUid !== user.uid) {
      throw new BadRequestException('Ticket not assigned to you');
    }

    const now = new Date().toISOString();
    await ticketRef.update({
      status: TicketStatus.REJECTED,
      stage: TicketStage.REJECTED,
      rejectionReason: dto.reason,
      rejectionNotes: dto.notes || null,
      rejectedAt: now,
      rejectedBy: user.uid,
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.ticket_rejected', {
      ticketId,
      technicianUid: user.uid,
      reason: dto.reason,
    });

    return this.getTicketById(ticketId, user);
  }

  // ==================== P0: STAGE TRANSITIONS WITH PHOTO VALIDATION ====================

  /**
   * Stage transition table (§5.2)
   */
  private readonly STAGE_TRANSITIONS: Record<TicketStage, TicketStage[]> = {
    [TicketStage.INCOMING]: [TicketStage.ACCEPTED, TicketStage.REJECTED],
    [TicketStage.ACCEPTED]: [TicketStage.DIAGNOSIS, TicketStage.REJECTED],
    [TicketStage.REJECTED]: [],
    [TicketStage.DIAGNOSIS]: [TicketStage.PARTS_PROCUREMENT, TicketStage.REPAIR_ACTIVE],
    [TicketStage.PARTS_PROCUREMENT]: [TicketStage.REPAIR_ACTIVE],
    [TicketStage.REPAIR_ACTIVE]: [TicketStage.QUALITY_CHECK],
    [TicketStage.QUALITY_CHECK]: [TicketStage.COMPLETED, TicketStage.REPAIR_ACTIVE],
    [TicketStage.COMPLETED]: [],
  };

  private canTransitionStage(from: TicketStage, to: TicketStage): boolean {
    const allowed = this.STAGE_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  async updateTicketStage(
    ticketId: string,
    dto: UpdateTicketStageDto,
    user: CurrentUser,
  ): Promise<TicketResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can update stage');
    }

    const currentStage = data.stage || TicketStage.INCOMING;

    if (!this.canTransitionStage(currentStage, dto.stage)) {
      throw new BadRequestException(
        `Invalid stage transition from ${currentStage} to ${dto.stage}`,
      );
    }

    if (
      [TicketStage.DIAGNOSIS, TicketStage.REPAIR_ACTIVE, TicketStage.QUALITY_CHECK].includes(
        dto.stage,
      ) &&
      (!dto.photos || dto.photos.length === 0)
    ) {
      throw new BadRequestException(`Photos required for stage ${dto.stage}`);
    }

    const now = new Date().toISOString();
    const updates: any = { stage: dto.stage, updatedAt: now };

    if (dto.stage === TicketStage.DIAGNOSIS) {
      updates.status = TicketStatus.IN_PROGRESS;
      updates.diagnosisStartedAt = now;
      if (dto.notes) updates.diagnosisNotes = dto.notes;
    } else if (dto.stage === TicketStage.PARTS_PROCUREMENT) {
      updates.status = TicketStatus.AWAITING_PARTS;
      updates.partsRequestedAt = now;
    } else if (dto.stage === TicketStage.REPAIR_ACTIVE) {
      updates.status = TicketStatus.IN_PROGRESS;
      updates.repairStartedAt = now;
    } else if (dto.stage === TicketStage.QUALITY_CHECK) {
      updates.status = TicketStatus.IN_PROGRESS;
      updates.qualityCheckAt = now;
    }

    if (dto.notes) {
      updates[`${dto.stage.toLowerCase()}Notes`] = dto.notes;
    }

    if (dto.photos && dto.photos.length > 0) {
      const existingPhotos = data[`${dto.stage.toLowerCase()}Photos`] || [];
      updates[`${dto.stage.toLowerCase()}Photos`] = [...existingPhotos, ...dto.photos];
    }

    await ticketRef.update(updates);

    this.eventEmitter.emit('maintenance.stage_updated', {
      ticketId,
      stage: dto.stage,
      technicianUid: user.uid,
    });

    return this.getTicketById(ticketId, user);
  }

  async completeTicket(
    ticketId: string,
    dto: CompleteTicketDto,
    user: CurrentUser,
  ): Promise<TicketResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can complete ticket');
    }

    if (data.stage !== TicketStage.QUALITY_CHECK) {
      throw new BadRequestException('Ticket must be in QUALITY_CHECK stage to complete');
    }

    if (!dto.beforePhotos || dto.beforePhotos.length === 0) {
      throw new BadRequestException('Before photos are required');
    }
    if (!dto.afterPhotos || dto.afterPhotos.length === 0) {
      throw new BadRequestException('After photos are required');
    }

    const now = new Date().toISOString();

    const estimatedCost = data.estimatedCost || 0;
    const additionalCharges = data.additionalCharges || [];
    const approvedAdditionalCost = additionalCharges
      .filter((c: any) => c.status === 'approved')
      .reduce((sum: number, c: any) => sum + (c.approvedAmount || c.totalCost || 0), 0);

    const finalCost = estimatedCost + approvedAdditionalCost;

    const slaDeadline = data.slaDeadline ? new Date(data.slaDeadline) : null;
    const slaMet = slaDeadline ? new Date(now) <= slaDeadline : true;

    await ticketRef.update({
      stage: TicketStage.COMPLETED,
      status: TicketStatus.COMPLETED,
      beforePhotos: dto.beforePhotos,
      afterPhotos: dto.afterPhotos,
      completionNotes: dto.completionNotes,
      recommendationsForFutureUse: dto.recommendationsForFutureUse || null,
      finalCost,
      completedAt: now,
      resolvedAt: now,
      slaMet,
      updatedAt: now,
    });

    if (data.droneId) {
      try {
        const droneSnapshot = await firestore
          .collectionGroup(USER_SUBCOLLECTIONS.drones)
          .where('id', '==', data.droneId)
          .limit(1)
          .get();

        if (!droneSnapshot.empty) {
          await droneSnapshot.docs[0].ref.update({
            status: 'deployable',
            lastMaintenance: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error('Failed to update drone status:', error);
      }
    }

    this.eventEmitter.emit('maintenance.ticket_completed', {
      ticketId,
      technicianUid: user.uid,
      finalCost,
      slaMet,
    });

    return this.getTicketById(ticketId, user);
  }

  async submitAdditionalCharges(
    ticketId: string,
    dto: SubmitAdditionalChargesDto,
    user: CurrentUser,
  ): Promise<{ charges: AdditionalChargeResponseDto[] }> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can submit charges');
    }

    if (
      ![TicketStage.DIAGNOSIS, TicketStage.PARTS_PROCUREMENT, TicketStage.REPAIR_ACTIVE].includes(
        data.stage,
      )
    ) {
      throw new BadRequestException('Can only submit charges during active repair stages');
    }

    const now = new Date().toISOString();
    const existingCharges = data.additionalCharges || [];

    const newCharges = dto.charges.map((charge: ChargeItemDto) => {
      const totalCost = charge.partsCost + charge.laborCost;
      return {
        id: uuidv4(),
        itemName: charge.itemName,
        partNumber: charge.partNumber || null,
        partsCost: charge.partsCost,
        laborCost: charge.laborCost,
        totalCost,
        description: charge.description,
        photos: charge.photos || [],
        status: 'pending',
        submittedAt: now,
        submittedBy: user.uid,
      };
    });

    await ticketRef.update({
      additionalCharges: [...existingCharges, ...newCharges],
      additionalChargesJustification: dto.justification,
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.additional_charges_submitted', {
      ticketId,
      technicianUid: user.uid,
      charges: newCharges,
      fleetManagerUid: data.fleetManagerUid,
    });

    return { charges: newCharges as AdditionalChargeResponseDto[] };
  }

  async getAdditionalCharges(
    ticketId: string,
    user: CurrentUser,
  ): Promise<{ charges: AdditionalChargeResponseDto[] }> {
    const ticket = await this.getTicketById(ticketId, user);
    return {
      charges: (ticket.additionalCharges || []) as AdditionalChargeResponseDto[],
    };
  }

  // ==================== P1: EARNINGS MANAGEMENT ====================

  /**
   * Get earnings summary with SLA bonus/penalty calculations
   */
  async getEarnings(
    user: CurrentUser,
    filter: EarningsFilterDto,
  ): Promise<EarningsSummaryDto> {
    const firestore = this.firebaseAdminService.firestore();
    let query = firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('technicianUid', '==', user.uid)
      .where('status', '==', TicketStatus.COMPLETED) as any;

    const snapshot = await query.get();
    const tickets = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Filter by date range
    let filteredTickets = tickets;
    if (filter.period) {
      const now = new Date();
      let startDate: Date;

      switch (filter.period) {
        case EarningsPeriod.TODAY:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case EarningsPeriod.WEEK:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case EarningsPeriod.MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case EarningsPeriod.YEAR:
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case EarningsPeriod.CUSTOM:
          if (filter.startDate) startDate = new Date(filter.startDate);
          else startDate = new Date(0);
          break;
        default:
          startDate = new Date(0);
      }

      filteredTickets = tickets.filter((t: any) => {
        const completedAt = new Date(t.completedAt);
        const afterStart = completedAt >= startDate;
        const beforeEnd = filter.endDate ? completedAt <= new Date(filter.endDate) : true;
        return afterStart && beforeEnd;
      });
    }

    // Calculate earnings
    const breakdown: EarningsBreakdownDto[] = filteredTickets.map((ticket: any) => {
      const baseCost = ticket.estimatedCost || 0;
      const additionalCharges = ticket.additionalCharges || [];
      const approvedAdditionalCost = additionalCharges
        .filter((c: any) => c.status === 'approved')
        .reduce((sum: number, c: any) => sum + (c.approvedAmount || c.totalCost || 0), 0);

      const totalCost = baseCost + approvedAdditionalCost;
      const technicianShare = totalCost * TECH_SHARE;

      // SLA bonus/penalty
      let slaBonus = 0;
      if (ticket.slaMet === true) {
        slaBonus = technicianShare * SLA_MET_BONUS;
      } else if (ticket.slaMet === false) {
        slaBonus = -technicianShare * SLA_BREACH_PENALTY;
      }

      const finalEarning = technicianShare + slaBonus;

      return {
        ticketId: ticket.id,
        droneId: ticket.droneId || 'N/A',
        completedAt: ticket.completedAt,
        baseCost,
        additionalChargesCost: approvedAdditionalCost,
        technicianShare,
        slaBonus,
        finalEarning,
        status: ticket.earningStatus || 'pending',
      };
    });

    const totalEarnings = breakdown.reduce((sum, b) => sum + b.finalEarning, 0);
    const pendingEarnings = breakdown
      .filter((b) => b.status === 'pending')
      .reduce((sum, b) => sum + b.finalEarning, 0);
    const settledEarnings = breakdown
      .filter((b) => b.status === 'settled')
      .reduce((sum, b) => sum + b.finalEarning, 0);
    const slaBonusTotal = breakdown.reduce((sum, b) => sum + b.slaBonus, 0);

    return {
      totalEarnings,
      pendingEarnings,
      settledEarnings,
      completedTickets: filteredTickets.length,
      averagePerTicket: filteredTickets.length > 0 ? totalEarnings / filteredTickets.length : 0,
      slaBonusTotal,
      breakdown,
      period: filter.period || 'all',
    };
  }

  /**
   * Get pending earnings (not yet settled)
   */
  async getPendingEarnings(user: CurrentUser): Promise<{ pendingAmount: number; tickets: any[] }> {
    const firestore = this.firebaseAdminService.firestore();
    const snapshot = await firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('technicianUid', '==', user.uid)
      .where('status', '==', TicketStatus.COMPLETED)
      .get();

    const pendingTickets = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((ticket: any) => (ticket.earningStatus || 'pending') === 'pending');

    const pendingAmount = pendingTickets.reduce((sum: number, ticket: any) => {
      const baseCost = ticket.estimatedCost || 0;
      const additionalCharges = ticket.additionalCharges || [];
      const approvedAdditionalCost = additionalCharges
        .filter((c: any) => c.status === 'approved')
        .reduce((s: number, c: any) => s + (c.approvedAmount || c.totalCost || 0), 0);

      const totalCost = baseCost + approvedAdditionalCost;
      const technicianShare = totalCost * TECH_SHARE;

      let slaBonus = 0;
      if (ticket.slaMet === true) slaBonus = technicianShare * SLA_MET_BONUS;
      else if (ticket.slaMet === false) slaBonus = -technicianShare * SLA_BREACH_PENALTY;

      return sum + technicianShare + slaBonus;
    }, 0);

    return { pendingAmount, tickets: pendingTickets };
  }

  /**
   * Get earnings history with pagination
   */
  async getEarningsHistory(
    user: CurrentUser,
    filter: EarningsFilterDto,
  ): Promise<{ items: any[]; meta: any }> {
    const summary = await this.getEarnings(user, filter);
    const total = summary.breakdown.length;
    const start = (filter.page - 1) * filter.limit;
    const items = summary.breakdown.slice(start, start + filter.limit);

    return {
      items,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  /**
   * Update payout method (bank/UPI/wallet)
   */
  async updatePayoutMethod(
    dto: PayoutMethodDto,
    user: CurrentUser,
  ): Promise<{ success: boolean; payoutMethod: PayoutMethodDto }> {
    const userRef = this.usersCollection().doc(user.uid);
    await userRef.update({
      'profileData.payoutMethod': dto,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, payoutMethod: dto };
  }

  // ==================== P1: COMPLAINT MANAGEMENT ====================

  /**
   * Create a complaint
   */
  async createComplaint(
    dto: CreateComplaintDto,
    user: CurrentUser,
  ): Promise<ComplaintResponseDto> {
    const firestore = this.firebaseAdminService.firestore();
    const complaintRef = firestore.collection('complaints').doc();

    const now = new Date().toISOString();
    const complaint: ComplaintResponseDto = {
      id: complaintRef.id,
      userId: user.uid,
      userRole: user.role,
      type: dto.type,
      description: dto.description,
      relatedEntityType: dto.relatedEntityType,
      relatedEntityId: dto.relatedEntityId,
      status: ComplaintStatus.OPEN,
      priority: dto.priority || ComplaintPriority.MEDIUM,
      attachments: dto.attachments || [],
      createdAt: now,
      updatedAt: now,
    };

    await complaintRef.set(complaint);

    this.eventEmitter.emit('complaint.created', {
      complaintId: complaint.id,
      userId: user.uid,
      type: dto.type,
      priority: complaint.priority,
    });

    return complaint;
  }

  /**
   * Get technician's complaints
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

    const snapshot = await query.get();
    const items = snapshot.docs.map(
      (doc: any) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as ComplaintResponseDto,
    );

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const paged = items.slice(start, start + filter.limit);

    return {
      items: paged,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  // ==================== P2: NOTIFICATION SETTINGS ====================

  /**
   * Update notification preferences
   */
  async updateNotificationSettings(
    settings: any,
    user: CurrentUser,
  ): Promise<{ success: boolean }> {
    const userRef = this.usersCollection().doc(user.uid);
    await userRef.update({
      'profileData.notificationSettings': settings,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // ==================== DIAGNOSIS & PARTS MANAGEMENT ====================

  /**
   * Get rejected tickets for this technician
   */
  async getRejectedTickets(
    user: CurrentUser,
    filter: TicketFilterDto,
  ): Promise<{ items: TicketResponseDto[]; meta: any }> {
    const firestore = this.firebaseAdminService.firestore();
    const snapshot = await firestore
      .collection(ROOT_COLLECTIONS.maintenanceTickets)
      .where('rejectedBy', '==', user.uid)
      .get();

    let items = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as TicketResponseDto[];

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(
        (t: any) =>
          t.description?.toLowerCase().includes(searchLower) ||
          t.droneId?.toLowerCase().includes(searchLower),
      );
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const paged = items.slice(start, start + filter.limit);

    return {
      items: paged,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  /**
   * Create diagnosis report for a ticket
   */
  async createDiagnosis(
    ticketId: string,
    dto: any,
    user: CurrentUser,
  ): Promise<any> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can create diagnosis');
    }

    const now = new Date().toISOString();
    const diagnosis = {
      id: uuidv4(),
      ticketId,
      technicianUid: user.uid,
      findings: dto.findings,
      recommendedAction: dto.recommendedAction,
      estimatedRepairTime: dto.estimatedRepairTime,
      requiredParts: dto.requiredParts || [],
      photos: dto.photos || [],
      severity: dto.severity || 'MEDIUM',
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.update({
      diagnosis,
      diagnosisCompletedAt: now,
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.diagnosis_created', {
      ticketId,
      technicianUid: user.uid,
      severity: diagnosis.severity,
    });

    return diagnosis;
  }

  /**
   * Create parts request for a ticket
   */
  async createPartsRequest(
    ticketId: string,
    dto: any,
    user: CurrentUser,
  ): Promise<any> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can request parts');
    }

    const now = new Date().toISOString();
    const partsRequest = {
      id: uuidv4(),
      ticketId,
      technicianUid: user.uid,
      parts: dto.parts,
      justification: dto.justification,
      urgency: dto.urgency || 'MEDIUM',
      status: 'pending',
      requestedAt: now,
    };

    const existingRequests = data.partsRequests || [];
    await ticketRef.update({
      partsRequests: [...existingRequests, partsRequest],
      stage: TicketStage.PARTS_PROCUREMENT,
      status: TicketStatus.AWAITING_PARTS,
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.parts_requested', {
      ticketId,
      technicianUid: user.uid,
      partsRequest,
    });

    return partsRequest;
  }

  /**
   * Confirm parts received for a ticket
   */
  async confirmPartsReceived(
    ticketId: string,
    dto: any,
    user: CurrentUser,
  ): Promise<any> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;

    if (data.technicianUid !== user.uid) {
      throw new ForbiddenException('Only assigned technician can confirm parts');
    }

    const now = new Date().toISOString();
    const partsRequests = data.partsRequests || [];

    // Update received parts status
    const updatedRequests = partsRequests.map((req: any) => {
      if (dto.receivedPartIds.includes(req.id)) {
        return {
          ...req,
          status: 'received',
          receivedAt: now,
          receivedNotes: dto.notes,
          receivedPhotos: dto.photos || [],
        };
      }
      return req;
    });

    await ticketRef.update({
      partsRequests: updatedRequests,
      partsReceivedAt: now,
      stage: TicketStage.REPAIR_ACTIVE,
      status: TicketStatus.IN_PROGRESS,
      updatedAt: now,
    });

    this.eventEmitter.emit('maintenance.parts_received', {
      ticketId,
      technicianUid: user.uid,
      receivedPartIds: dto.receivedPartIds,
    });

    return { success: true, updatedRequests };
  }

  /**
   * Update additional charge item status (for FM approval)
   */
  async updateAdditionalCharge(
    ticketId: string,
    chargeId: string,
    updates: any,
    user: CurrentUser,
  ): Promise<any> {
    const firestore = this.firebaseAdminService.firestore();
    const ticketRef = firestore.collection(ROOT_COLLECTIONS.maintenanceTickets).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const data = ticketDoc.data() as any;
    const additionalCharges = data.additionalCharges || [];

    const chargeIndex = additionalCharges.findIndex((c: any) => c.id === chargeId);
    if (chargeIndex === -1) {
      throw new NotFoundException(`Charge ${chargeId} not found`);
    }

    // Update charge
    additionalCharges[chargeIndex] = {
      ...additionalCharges[chargeIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await ticketRef.update({
      additionalCharges,
      updatedAt: new Date().toISOString(),
    });

    return additionalCharges[chargeIndex];
  }

  /**
   * Get refunds for technician
   */
  async getRefunds(
    user: CurrentUser,
    filter: any,
  ): Promise<{ items: any[]; meta: any }> {
    const firestore = this.firebaseAdminService.firestore();
    const snapshot = await firestore
      .collection('refunds')
      .where('technicianUid', '==', user.uid)
      .get();

    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (filter.status) {
      items = items.filter((item: any) => item.status === filter.status);
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const paged = items.slice(start, start + filter.limit);

    return {
      items: paged,
      meta: { page: filter.page, limit: filter.limit, total },
    };
  }

  // ==================== P2: UPI QR (PLACEHOLDER) ====================

  /**
   * Generate UPI QR code (placeholder)
   */
  async generateUpiQr(user: CurrentUser): Promise<{ qrCode: string; upiId: string }> {
    const userData = await this.get(user.uid);
    const payoutMethod = userData.profileData.payoutMethod as any;

    if (!payoutMethod || !payoutMethod.upiId) {
      throw new BadRequestException('Please configure UPI ID in payout method first');
    }

    // Placeholder - In production, integrate with UPI QR generation service
    return {
      qrCode: `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPipQTEFDRUhPTERFUio8L3RleHQ+PC9zdmc+`,
      upiId: payoutMethod.upiId,
    };
  }

  // ==================== HELPER METHODS ====================

  private usersCollection(): CollectionReference<FirestoreUserDocument> {
    const collection: CollectionReference<FirestoreUserDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users);
    return collection;
  }

  private hasSpecialization(user: FirestoreUserDocument, specialization: string): boolean {
    const specializations = user.profileData.specializations;
    return Array.isArray(specializations) && specializations.includes(specialization);
  }

}

