import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, Query } from 'firebase-admin/firestore';

import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type { FirestoreIncidentDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { EscalateIncidentDto } from './dto/escalate-incident.dto';
import { FollowUpDto } from './dto/follow-up.dto';
import { IncidentFilterDto } from './dto/incident-filter.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

@Injectable()
export class IncidentService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateIncidentDto, user: CurrentUser): Promise<FirestoreIncidentDocument> {
    const ref = this.collection().doc();
    const now = new Date().toISOString();
    const incident: FirestoreIncidentDocument = {
      incidentId: ref.id,
      type: dto.type,
      severity: dto.severity,
      reportedBy: user.uid,
      bookingId: dto.bookingId ?? null,
      droneId: dto.droneId ?? null,
      pilotUid: dto.pilotUid ?? (user.role === 'pilot' ? user.uid : null),
      description: dto.description,
      location: dto.location,
      mediaUrls: dto.mediaUrls ?? [],
      status: 'reported',
      resolutionNotes: null,
      escalatedTo: null,
      reportedAt: now,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(incident);
    this.eventEmitter.emit(WS_EVENTS.INCIDENT_REPORTED, {
      incidentId: incident.incidentId,
      type: incident.type,
      severity: incident.severity,
      reportedBy: incident.reportedBy,
      location: incident.location,
      timestamp: now,
    });
    return incident;
  }

  async list(filter: IncidentFilterDto) {
    let query: Query<FirestoreIncidentDocument> = this.collection();
    if (filter.type) query = query.where('type', '==', filter.type);
    if (filter.severity) query = query.where('severity', '==', filter.severity);
    if (filter.status) query = query.where('status', '==', filter.status);
    const start = (filter.page - 1) * filter.limit;
    const hasDateFilter = !!(filter.dateFrom || filter.dateTo);

    if (hasDateFilter) {
      // Date range is filtered in memory — scan the equality-filtered set.
      const snapshot = await query.get();
      let items = snapshot.docs.map((doc) => doc.data());
      if (filter.dateFrom) items = items.filter((item) => item.reportedAt >= filter.dateFrom!);
      if (filter.dateTo) items = items.filter((item) => item.reportedAt <= filter.dateTo!);
      const total = items.length;
      return {
        items: items.slice(start, start + filter.limit),
        meta: { page: filter.page, limit: filter.limit, total },
      };
    }

    // Bounded: page server-side via count() + offset/limit.
    const [countSnap, pageSnap] = await Promise.all([
      query.count().get(),
      query.offset(start).limit(filter.limit).get(),
    ]);
    return {
      items: pageSnap.docs.map((doc) => doc.data()),
      meta: { page: filter.page, limit: filter.limit, total: countSnap.data().count },
    };
  }

  async get(id: string, user: CurrentUser) {
    const incident = await this.findIncident(id);
    const canView =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'subadmin' ||
      user.role === 'vendor' ||
      incident.reportedBy === user.uid ||
      incident.pilotUid === user.uid;
    if (!canView) throw new ForbiddenException('Cannot view incident.');
    return incident;
  }

  async updateStatus(id: string, dto: UpdateIncidentDto, user: CurrentUser) {
    const incident = await this.findIncident(id);
    const updated: FirestoreIncidentDocument = {
      ...incident,
      status: dto.status,
      resolutionNotes: dto.resolutionNotes ?? incident.resolutionNotes,
      resolvedAt:
        dto.status === 'resolved' || dto.status === 'closed'
          ? new Date().toISOString()
          : incident.resolvedAt,
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    if (dto.status === 'resolved') {
      this.eventEmitter.emit(WS_EVENTS.INCIDENT_RESOLVED, {
        incidentId: updated.incidentId,
        status: updated.status,
        timestamp: updated.updatedAt,
      });
    }
    return { ...updated, updatedBy: user.uid };
  }

  async escalate(id: string, dto: EscalateIncidentDto, user: CurrentUser) {
    const incident = await this.findIncident(id);
    const updated = {
      ...incident,
      status: 'escalated' as const,
      escalatedTo: dto.escalateTo,
      resolutionNotes: [incident.resolutionNotes, `Escalated by ${user.uid}: ${dto.reason}`]
        .filter(Boolean)
        .join('\n'),
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    this.eventEmitter.emit(WS_EVENTS.INCIDENT_ESCALATED, {
      incidentId: updated.incidentId,
      escalatedTo: updated.escalatedTo,
      severity: updated.severity,
      timestamp: updated.updatedAt,
    });
    return updated;
  }

  async followUp(id: string, dto: FollowUpDto, user: CurrentUser) {
    const incident = await this.findIncident(id);
    const updated = {
      ...incident,
      resolutionNotes: [
        incident.resolutionNotes,
        `${new Date().toISOString()} ${user.uid}: ${dto.note}`,
      ]
        .filter(Boolean)
        .join('\n'),
      updatedAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(updated, { merge: true });
    return updated;
  }

  async summary() {
    const snapshot = await this.collection().get();
    const incidents = snapshot.docs.map((doc) => doc.data());
    return {
      total: incidents.length,
      byType: this.countBy(incidents.map((incident) => incident.type)),
      bySeverity: this.countBy(incidents.map((incident) => incident.severity)),
      byStatus: this.countBy(incidents.map((incident) => incident.status)),
    };
  }

  async byType(type: FirestoreIncidentDocument['type']) {
    const snapshot = await this.collection().where('type', '==', type).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async exportCsv(filter: IncidentFilterDto) {
    const { items } = await this.list(filter);
    return [
      'incident_id,type,severity,status,reported_by,reported_at',
      ...items.map((item) =>
        [
          item.incidentId,
          item.type,
          item.severity,
          item.status,
          item.reportedBy,
          item.reportedAt,
        ].join(','),
      ),
    ].join('\n');
  }

  private async findIncident(id: string): Promise<FirestoreIncidentDocument> {
    const snapshot = await this.collection().doc(id).get();
    const incident = snapshot.data();
    if (!snapshot.exists || !incident) throw new NotFoundException(`Incident ${id} not found.`);
    return incident;
  }

  private collection(): CollectionReference<FirestoreIncidentDocument> {
    const collection: CollectionReference<FirestoreIncidentDocument> = this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.incidents);
    return collection;
  }

  private countBy(values: string[]): Record<string, number> {
    return values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});
  }
}
