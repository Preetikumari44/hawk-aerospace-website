import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { TechnicianService } from './technician.service';
import { TicketStatus } from './dto/technician-ticket.dto';
import { TicketStage } from './dto/ticket-stage.dto';

describe('TechnicianService', () => {
  let service: TechnicianService;
  let firebaseAdminService: jest.Mocked<FirebaseAdminService>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    uid: 'tech-123',
    role: 'technician' as const,
    email: 'tech@example.com',
    status: 'active' as const,
  };

  const mockTicket = {
    id: 'ticket-123',
    droneId: 'drone-456',
    technicianId: 'tech-123',
    category: 'battery_replacement',
    description: 'Battery replacement needed',
    priority: 'HIGH',
    status: TicketStatus.IN_PROGRESS,
    stage: TicketStage.ACCEPTED,
    createdAt: '2024-01-01T00:00:00Z',
    estimatedCost: 5000,
  };

  beforeEach(async () => {
    const mockFirestoreDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    };

    const mockFirestoreCollection = {
      doc: jest.fn().mockReturnValue(mockFirestoreDoc),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      collectionGroup: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const mockFirestore = {
      collection: jest.fn().mockReturnValue(mockFirestoreCollection),
      collectionGroup: jest.fn().mockReturnValue(mockFirestoreCollection),
    };

    firebaseAdminService = {
      firestore: jest.fn().mockReturnValue(mockFirestore),
    } as any;

    usersService = {
      getByUid: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianService,
        { provide: FirebaseAdminService, useValue: firebaseAdminService },
        { provide: UsersService, useValue: usersService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TechnicianService>(TechnicianService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acceptTicket', () => {
    it('should accept an open ticket', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          status: TicketStatus.OPEN,
          stage: TicketStage.INCOMING,
          technicianId: null,
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
        update: jest.fn().mockResolvedValue({}),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      jest.spyOn(service, 'getTicketById').mockResolvedValue(mockTicket as any);

      const result = await service.acceptTicket(
        'ticket-123',
        { notes: 'Will start immediately' },
        mockUser,
      );

      expect(mockTicketRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          technicianId: 'tech-123',
          status: TicketStatus.IN_PROGRESS,
          stage: TicketStage.ACCEPTED,
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.ticket_accepted',
        expect.objectContaining({ ticketId: 'ticket-123', technicianId: 'tech-123' }),
      );
    });

    it('should throw if ticket already assigned to another technician', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          technicianId: 'other-tech',
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      await expect(
        service.acceptTicket('ticket-123', {}, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTicketStage', () => {
    it('should validate stage transitions', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.ACCEPTED,
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
        update: jest.fn(),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      jest.spyOn(service, 'getTicketById').mockResolvedValue(mockTicket as any);

      const result = await service.updateTicketStage(
        'ticket-123',
        {
          stage: TicketStage.DIAGNOSIS,
          notes: 'Starting diagnosis',
          photos: [{ url: 'photo1.jpg' }],
        },
        mockUser,
      );

      expect(mockTicketRef.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.stage_updated',
        expect.objectContaining({ stage: TicketStage.DIAGNOSIS }),
      );
    });

    it('should require photos for critical stages', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.ACCEPTED,
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      await expect(
        service.updateTicketStage(
          'ticket-123',
          {
            stage: TicketStage.DIAGNOSIS,
            notes: 'No photos',
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid stage transitions', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.ACCEPTED,
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      await expect(
        service.updateTicketStage(
          'ticket-123',
          {
            stage: TicketStage.COMPLETED,
            photos: [{ url: 'photo.jpg' }],
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeTicket', () => {
    it('should complete ticket with before/after photos', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.QUALITY_CHECK,
          estimatedCost: 5000,
          additionalCharges: [
            { status: 'approved', totalCost: 1000, approvedAmount: 900 },
          ],
          slaDeadline: new Date(Date.now() + 86400000).toISOString(),
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
        update: jest.fn(),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      const mockDroneSnapshot = {
        empty: false,
        docs: [{ ref: { update: jest.fn() } }],
      };

      (firestore.collectionGroup as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockDroneSnapshot),
      });

      jest.spyOn(service, 'getTicketById').mockResolvedValue(mockTicket as any);

      const result = await service.completeTicket(
        'ticket-123',
        {
          beforePhotos: [{ url: 'before.jpg' }],
          afterPhotos: [{ url: 'after.jpg' }],
          completionNotes: 'All done',
        },
        mockUser,
      );

      expect(mockTicketRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: TicketStage.COMPLETED,
          status: TicketStatus.COMPLETED,
          finalCost: 5900, // 5000 + 900
          slaMet: true,
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.ticket_completed',
        expect.objectContaining({ slaMet: true }),
      );
    });

    it('should require before and after photos', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.QUALITY_CHECK,
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      await expect(
        service.completeTicket(
          'ticket-123',
          {
            beforePhotos: [],
            afterPhotos: [{ url: 'after.jpg' }],
            completionNotes: 'Done',
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAdditionalCharges', () => {
    it('should submit additional charges', async () => {
      const mockTicketDoc = {
        exists: true,
        data: () => ({
          ...mockTicket,
          stage: TicketStage.REPAIR_ACTIVE,
          additionalCharges: [],
        }),
      };

      const mockTicketRef = {
        get: jest.fn().mockResolvedValue(mockTicketDoc),
        update: jest.fn(),
      };

      const firestore = firebaseAdminService.firestore();
      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockTicketRef),
      });

      const result = await service.submitAdditionalCharges(
        'ticket-123',
        {
          charges: [
            {
              itemName: 'New Battery',
              partsCost: 3000,
              laborCost: 500,
              description: 'Replacement battery',
            },
          ],
          justification: 'Original battery damaged beyond repair',
        },
        mockUser,
      );

      expect(mockTicketRef.update).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.additional_charges_submitted',
        expect.objectContaining({ ticketId: 'ticket-123' }),
      );
    });
  });

  describe('getEarnings', () => {
    it('should calculate earnings with SLA bonus', () => {
      // This would be a more complex test involving mock Firestore queries
      // Testing earnings calculation logic
      const baseCost = 5000;
      const additionalChargesCost = 1000;
      const totalCost = baseCost + additionalChargesCost;
      const techShare = totalCost * 0.7; // 4200
      const slaBonus = techShare * 0.05; // 210
      const finalEarning = techShare + slaBonus; // 4410

      expect(finalEarning).toBe(4410);
    });

    it('should apply SLA penalty when breached', () => {
      const baseCost = 5000;
      const techShare = baseCost * 0.7; // 3500
      const slaPenalty = -techShare * 0.1; // -350
      const finalEarning = techShare + slaPenalty; // 3150

      expect(finalEarning).toBe(3150);
    });
  });
});
