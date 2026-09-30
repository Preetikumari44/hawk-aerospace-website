import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { CacheService } from '../../common/cache/cache.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
  FirestoreServiceTicketDocument,
  FirestoreUserDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ScheduleSlotDto } from './dto/schedule-slot.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { UpdateTicketDetailsDto } from './dto/update-ticket-details.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { canTransitionTicketStatus } from './ticket/ticket-state-machine';

@Injectable()
export class ServiceCentreService {
  private readonly logger = new Logger(ServiceCentreService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async createTicket(
    dto: CreateTicketDto,
    user: CurrentUser,
  ): Promise<FirestoreServiceTicketDocument> {
    const ref = this.collection().doc();
    const now = new Date().toISOString();
    const ticket: FirestoreServiceTicketDocument = {
      ticketId: ref.id,
      droneId: dto.droneId,
      pilotUid: user.uid,
      fleetManagerUid: null,
      technicianUid: null,
      category: dto.category,
      description: dto.description,
      priority: dto.priority ?? 'medium',
      mediaUrls: dto.mediaUrls ?? [],
      status: 'open',
      serviceDetails: {},
      slaDeadline: this.slaDeadline(dto.priority ?? 'medium'),
      scheduledDate: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(ticket);

    this.eventEmitter.emit(WS_EVENTS.TICKET_CREATED, {
      ticketId: ticket.ticketId,
      droneId: ticket.droneId,
      pilotUid: ticket.pilotUid,
      priority: ticket.priority,
      category: ticket.category,
      timestamp: ticket.createdAt,
    });

    return ticket;
  }

  async listTickets(filter: TicketFilterDto, user: CurrentUser) {
    const cacheKey = `service-tickets:${user.uid}:${user.role}:${JSON.stringify(filter)}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for service tickets list: ${user.uid}`);
      return cached;
    }
    
    let query: Query<FirestoreServiceTicketDocument> = this.collection();
    if (user.role === 'technician') {
      query = query.where('technicianUid', '==', user.uid);
    }
    if (user.role === 'fleet_manager') {
      query = query.where('fleetManagerUid', '==', user.uid);
    }
    if (filter.status) {
      query = query.where('status', '==', filter.status);
    }
    if (filter.droneId) {
      query = query.where('droneId', '==', filter.droneId);
    }
    if (filter.technicianUid) {
      query = query.where('technicianUid', '==', filter.technicianUid);
    }
    const snapshot = await query.get();
    let items = snapshot.docs.map((doc) => doc.data());
    if (filter.dateFrom) {
      items = items.filter((ticket) => String(ticket.createdAt) >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      items = items.filter((ticket) => String(ticket.createdAt) <= filter.dateTo!);
    }
    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const result = {
      items: items.slice(start, start + filter.limit),
      meta: { page: filter.page, limit: filter.limit, total },
    };
    
    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, result, 3 * 60 * 1000);
    
    return result;
  }

  async getTicket(id: string, user: CurrentUser): Promise<FirestoreServiceTicketDocument> {
    const ticket = await this.findTicket(id);
    if (user.role === 'technician' && ticket.technicianUid !== user.uid) {
      throw new ForbiddenException('Technician not assigned to ticket.');
    }
    if (user.role === 'pilot' && ticket.pilotUid !== user.uid) {
      throw new ForbiddenException('Pilot cannot access ticket.');
    }
    return ticket;
  }

  async assignTechnician(id: string, dto: AssignTechnicianDto, user: CurrentUser) {
    const ticket = await this.findTicket(id);
    const updated: FirestoreServiceTicketDocument = {
      ...ticket,
      technicianUid: dto.technicianUid,
      fleetManagerUid: user.role === 'fleet_manager' ? user.uid : (ticket.fleetManagerUid ?? null),
      priority: dto.priority,
      status: ticket.status === 'open' ? 'assigned' : ticket.status,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });

    // Invalidate caches
    await this.cacheService.delete(`service-centre-dashboard`);
    await this.cacheService.deletePattern('service-tickets:.*');

    this.eventEmitter.emit(WS_EVENTS.TICKET_ASSIGNED, {
      ticketId: id,
      technicianUid: dto.technicianUid,
      droneId: ticket.droneId,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, user: CurrentUser) {
    const ticket = await this.getTicket(id, user);
    if (ticket.status !== dto.status && !canTransitionTicketStatus(ticket.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition ticket from ${ticket.status} to ${dto.status}.`,
      );
    }
    const updated = {
      ...ticket,
      status: dto.status,
      resolvedAt:
        dto.status === 'resolved' || dto.status === 'closed'
          ? new Date().toISOString()
          : ticket.resolvedAt,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });

    // Invalidate caches
    await this.cacheService.delete(`service-centre-dashboard`);
    await this.cacheService.deletePattern('service-tickets:.*');

    this.eventEmitter.emit(WS_EVENTS.TICKET_STATUS_CHANGED, {
      ticketId: id,
      pilotUid: ticket.pilotUid,
      status: dto.status,
      previousStatus: ticket.status,
      timestamp: updated.updatedAt,
    });

    return updated;
  }

  async updateDetails(id: string, dto: UpdateTicketDetailsDto, user: CurrentUser) {
    const ticket = await this.getTicket(id, user);
    const updated = {
      ...ticket,
      serviceDetails: {
        ...ticket.serviceDetails,
        diagnosis: dto.diagnosis,
        parts: dto.parts,
        time: dto.time,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    return updated;
  }

  async calendar(user: CurrentUser, mode: 'day' | 'week' | 'month' = 'week') {
    const { items } = await this.listTickets({ page: 1, limit: 500 }, user);
    return { mode, items: items.filter((ticket: FirestoreServiceTicketDocument) => ticket.scheduledDate) };
  }

  async calendarDate(date: string, user: CurrentUser) {
    const { items } = await this.listTickets({ page: 1, limit: 500 }, user);
    return items.filter((ticket: FirestoreServiceTicketDocument) => ticket.scheduledDate?.startsWith(date));
  }

  async schedule(dto: ScheduleSlotDto) {
    const ticket = await this.findTicket(dto.ticketId);
    const updated = {
      ...ticket,
      technicianUid: dto.technicianUid,
      scheduledDate: dto.date,
      status: ticket.status === 'open' ? 'assigned' : ticket.status,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(dto.ticketId).set(updated, { merge: true });
    return updated;
  }

  async reschedule(id: string, dto: ScheduleSlotDto) {
    const ticket = await this.findTicket(id);
    const updated = {
      ...ticket,
      technicianUid: dto.technicianUid,
      scheduledDate: dto.date,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    return updated;
  }

  async serviceHistory(droneId: string) {
    const snapshot = await this.collection().where('droneId', '==', droneId).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async dashboard() {
    const cacheKey = `service-centre-dashboard`;
    const cached = await this.cacheService.get<any>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for service centre dashboard`);
      return cached;
    }
    
    const snapshot = await this.collection().get();
    const tickets = snapshot.docs.map((doc) => doc.data());
    const now = Date.now();

    // Get technicians count
    const techniciansSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'technician')
      .get();

    // Calculate status counts
    const ticketsByStatus = {
      open: tickets.filter((t) => t.status === 'open').length,
      assigned: tickets.filter((t) => t.status === 'assigned').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      closed: tickets.filter((t) => t.status === 'closed').length,
      cancelled: 0, // Not in type definition, but may exist in data
    };

    // Calculate priority counts
    const ticketsByPriority = {
      critical: tickets.filter((t) => t.priority === 'critical').length,
      high: tickets.filter((t) => t.priority === 'high').length,
      medium: tickets.filter((t) => t.priority === 'medium').length,
      low: tickets.filter((t) => t.priority === 'low').length,
    };

    // Calculate SLA breaches
    const slaBreaches = tickets.filter(
      (ticket) =>
        ticket.slaDeadline &&
        new Date(ticket.slaDeadline).getTime() < now &&
        ticket.status !== 'closed',
    );

    // Calculate average resolution time
    const resolvedTickets = tickets.filter((t) => t.resolvedAt && t.createdAt);
    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        if (!ticket.createdAt || !ticket.resolvedAt) return sum;
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt).getTime();
        const hours = (resolved - created) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedTickets.length);
    }

    // Generate tickets over time (last 7 days)
    const ticketsOverTime = this.generateTicketsOverTime(tickets);

    const result = {
      totalAgents: techniciansSnapshot.size,
      totalOpenTickets: ticketsByStatus.open,
      totalPendingTickets: ticketsByStatus.open + ticketsByStatus.assigned,
      totalCompletedTickets: ticketsByStatus.closed,
      slaBreachCount: slaBreaches.length,
      ticketEscalations: 0, // TODO: Implement escalation tracking
      ticketsByStatus,
      ticketsByPriority,
      avgResolutionTime,
      ticketsOverTime,
    };
    
    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    
    return result;
  }

  private generateTicketsOverTime(tickets: FirestoreServiceTicketDocument[]) {
    const days = 7;
    const labels: string[] = [];
    const open: number[] = [];
    const inProgress: number[] = [];
    const closed: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(dateStr);

      const dayTickets = tickets.filter((t) => {
        if (!t.createdAt) return false;
        const createdAtStr = typeof t.createdAt === 'string' 
          ? t.createdAt 
          : new Date(t.createdAt).toISOString();
        return createdAtStr.startsWith(dateStr);
      });
      
      open.push(dayTickets.filter((t) => t.status === 'open').length);
      inProgress.push(dayTickets.filter((t) => t.status === 'in_progress').length);
      closed.push(dayTickets.filter((t) => t.status === 'closed').length);
    }

    return { labels, open, inProgress, closed };
  }

  async slaBreaches() {
    const snapshot = await this.collection().get();
    const now = Date.now();
    return snapshot.docs
      .map((doc) => doc.data())
      .filter(
        (ticket) =>
          ticket.slaDeadline &&
          new Date(ticket.slaDeadline).getTime() < now &&
          ticket.status !== 'closed',
      );
  }

  async listTechnicians() {
    const cacheKey = `service-centre-technicians`;
    const cached = await this.cacheService.get<FirestoreUserDocument[]>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for technicians list`);
      return cached;
    }
    
    const snapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .where('role', '==', 'technician')
      .get();
    const result = snapshot.docs.map((doc) => doc.data() as FirestoreUserDocument);
    
    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    
    return result;
  }

  async getTechnician(id: string) {
    const userSnapshot = await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(id)
      .get();
    if (!userSnapshot.exists) {
      throw new NotFoundException(`Technician ${id} not found.`);
    }
    const assigned = await this.collection().where('technicianUid', '==', id).get();
    return { profile: userSnapshot.data(), tickets: assigned.docs.map((doc) => doc.data()) };
  }

  async verifyTechnician(id: string, approved: boolean) {
    const status = approved ? 'active' : 'rejected';
    await this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.users)
      .doc(id)
      .set(
        {
          status,
          adminApproval: approved,
          verification: { isVerified: approved },
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    return this.getTechnician(id);
  }

  private async findTicket(id: string): Promise<FirestoreServiceTicketDocument> {
    const snapshot = await this.collection().doc(id).get();
    const ticket = snapshot.data();
    if (!snapshot.exists || !ticket) {
      throw new NotFoundException(`Ticket ${id} not found.`);
    }
    return ticket;
  }

  private collection(): CollectionReference<FirestoreServiceTicketDocument> {
    const collection: CollectionReference<FirestoreServiceTicketDocument> =
      this.firebaseAdminService.firestore().collection(ROOT_COLLECTIONS.serviceTickets);
    return collection;
  }

  private slaDeadline(priority: FirestoreServiceTicketDocument['priority']): string {
    const hours =
      priority === 'critical' ? 4 : priority === 'high' ? 12 : priority === 'medium' ? 24 : 48;
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }
}
