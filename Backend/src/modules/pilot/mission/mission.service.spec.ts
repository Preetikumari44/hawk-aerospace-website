import type { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';
import type { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import type { BookingService } from '../../booking/booking.service';
import type { UsersService } from '../../users/users.service';
import type {
  MissionAcceptedPayload,
  MissionCompletedPayload,
  MissionRejectedPayload,
  MissionStartedPayload,
} from '../../../gateway/events/event.interfaces';
import { WS_EVENTS } from '../../../gateway/events/event.constants';
import { MissionService } from './mission.service';

describe('MissionService', () => {
  const mockMissionDoc = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockCollection = {
    doc: jest.fn().mockReturnValue(mockMissionDoc),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(mockCollection),
    }),
  };

  const mockBookingService = {
    getBooking: jest.fn(),
    updateStatus: jest.fn(),
    cancelBookingWithRefund: jest.fn().mockResolvedValue({ status: 'cancelled' }),
  };

  const mockUsersService = {
    getByUid: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  let service: MissionService;

  const pilotUser: CurrentUser = {
    uid: 'pilot123',
    role: 'pilot',
    status: 'active',
  };

  const mission = {
    requestId: 'booking123',
    pilotUid: 'pilot123',
    bookingId: 'booking123',
    status: 'pending' as const,
    startTime: null,
    endTime: null,
    geoTrack: [],
    reportSummary: {},
    createdAt: '2026-06-24T10:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
  };

  function expectMissionEvent<T extends { timestamp: string }>(
    expectedEvent: string,
    expectedPayload: Omit<T, 'timestamp'>,
  ): void {
    const [, payload] = mockEventEmitter.emit.mock.calls[0] as [string, T];
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(expectedEvent, payload);
    expect(payload).toMatchObject(expectedPayload);
    expect(typeof payload.timestamp).toBe('string');
  }

  beforeEach(() => {
    service = new MissionService(
      mockFirebaseService as unknown as FirebaseAdminService,
      mockBookingService as unknown as BookingService,
      mockUsersService as unknown as UsersService,
      mockEventEmitter as unknown as EventEmitter2,
    );

    mockMissionDoc.get.mockResolvedValue({
      exists: true,
      data: () => mission,
    });
    mockBookingService.getBooking.mockResolvedValue({
      id: 'booking123',
      customerUid: 'customer123',
      fleetManagerUid: 'vendor123',
    });
    mockUsersService.getByUid.mockResolvedValue({
      name: 'Pilot One',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits mission accepted when pilot accepts', async () => {
    const result = await service.acceptMission(
      'mission123',
      { accepted: true, remarks: 'ok' },
      pilotUser,
    );

    expect(result.status).toBe('accepted');
    expectMissionEvent<MissionAcceptedPayload>(WS_EVENTS.MISSION_ACCEPTED, {
      bookingId: 'booking123',
      pilotUid: 'pilot123',
      pilotName: 'Pilot One',
      customerUid: 'customer123',
    });
  });

  it('emits mission rejected when pilot declines', async () => {
    const result = await service.acceptMission(
      'mission123',
      { accepted: false, remarks: 'busy' },
      pilotUser,
    );

    expect(result.status).toBe('rejected');
    expectMissionEvent<MissionRejectedPayload>(WS_EVENTS.MISSION_REJECTED, {
      bookingId: 'booking123',
      pilotUid: 'pilot123',
      customerUid: 'customer123',
      reason: 'busy',
    });
  });

  it('emits mission started when mission status changes to started', async () => {
    await service.updateMissionStatus(
      'mission123',
      { status: 'started', remarks: 'takeoff' },
      pilotUser,
    );

    expect(mockBookingService.updateStatus).toHaveBeenCalledWith(
      'booking123',
      { status: 'in_progress', remarks: 'takeoff' },
      pilotUser,
    );
    expectMissionEvent<MissionStartedPayload>(WS_EVENTS.MISSION_STARTED, {
      bookingId: 'booking123',
      pilotUid: 'pilot123',
      customerUid: 'customer123',
      fleetManagerUid: 'vendor123',
    });
  });

  it('emits mission completed after post report on completed mission', async () => {
    mockMissionDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        ...mission,
        status: 'completed' as const,
      }),
    });

    const result = await service.postMissionReport(
      'mission123',
      { areaActual: 12, notes: 'done', photos: ['photo-1'] },
      pilotUser,
    );

    expect(result.reportSummary).toMatchObject({
      areaActual: 12,
      notes: 'done',
      photos: ['photo-1'],
    });
    expectMissionEvent<MissionCompletedPayload>(WS_EVENTS.MISSION_COMPLETED, {
      bookingId: 'booking123',
      pilotUid: 'pilot123',
      customerUid: 'customer123',
      fleetManagerUid: 'vendor123',
    });

    const [, payload] = mockEventEmitter.emit.mock.calls[0] as [string, MissionCompletedPayload];
    expect(payload.summary).toMatchObject({
      areaActual: 12,
      notes: 'done',
      photos: ['photo-1'],
    });
  });

  it('delegates cancellation to booking service when mission is cancellable', async () => {
    const result = await service.cancelMission('mission123', 'no longer needed', pilotUser);

    expect(mockBookingService.cancelBookingWithRefund).toHaveBeenCalledWith(
      'booking123',
      'no longer needed',
      pilotUser,
    );
    expect(result).toMatchObject({ status: 'cancelled' });
  });

  it('rejects cancellation once the service has started', async () => {
    mockMissionDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({ ...mission, status: 'started' as const }),
    });

    await expect(
      service.cancelMission('mission123', 'reason', pilotUser),
    ).rejects.toThrow(BadRequestException);
  });
});
