import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PilotApplicationService } from './services/pilot-application.service';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { SubmitPilotApplicationDto } from './dto/submit-pilot-application.dto';
import { ReviewPilotApplicationDto, ApplicationAction } from './dto/review-pilot-application.dto';

describe('PilotApplicationService', () => {
  let service: PilotApplicationService;
  let firebaseAdmin: FirebaseAdminService;

  // Mock Firestore
  const mockFirestore = {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };

  // Mock collection
  const mockCollection = {
    doc: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    count: jest.fn(),
    get: jest.fn(),
  };

  // Mock document reference
  const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // Mock user
  const mockUser: CurrentUser = {
    uid: 'test-user-uid',
    email: 'test@example.com',
    role: 'customer',
    roles: ['customer'],
  };

  // Mock admin
  const mockAdmin: CurrentUser = {
    uid: 'admin-uid',
    email: 'admin@example.com',
    role: 'admin',
    roles: ['admin'],
  };

  // Mock application DTO
  const mockApplicationDto: SubmitPilotApplicationDto = {
    name: 'Test Pilot',
    age: 30,
    phone: '+919876543210',
    email: 'test@example.com',
    address: 'Test Address',
    pilotLicenseNumber: 'DGCA-TEST-001',
    pilotExpiryDate: '2030-12-31',
    aadhaarCardNumber: '1234 5678 9012',
    panNumber: 'ABCDE1234F',
    gstNumber: '27ABCDE1234F1Z5',
    serviceTypes: ['spraying', 'mapping'],
    documents: [
      {
        type: 'aadhaar_front',
        storagePath: 'documents/test/aadhaar_front.jpg',
        downloadUrl: 'https://example.com/aadhaar_front.jpg',
        verified: 'pending',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PilotApplicationService,
        {
          provide: FirebaseAdminService,
          useValue: {
            firestore: jest.fn(() => mockFirestore),
          },
        },
      ],
    }).compile();

    service = module.get<PilotApplicationService>(PilotApplicationService);
    firebaseAdmin = module.get<FirebaseAdminService>(FirebaseAdminService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitApplication', () => {
    beforeEach(() => {
      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.where.mockReturnThis();
      mockCollection.limit.mockReturnThis();
      mockCollection.doc.mockReturnValue(mockDocRef);
    });

    it('should successfully submit a new application', async () => {
      // Mock no existing applications
      mockCollection.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      // Mock user document
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['customer'] }),
      });

      // Mock application creation
      mockDocRef.set.mockResolvedValue(undefined);

      const result = await service.submitApplication(mockApplicationDto, mockUser);

      expect(result).toBeDefined();
      expect(result.uid).toBe(mockUser.uid);
      expect(result.status).toBe('pending');
      expect(result.applicationId).toMatch(/^PAPP\d{6}$/);
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already has pending application', async () => {
      // Mock existing pending application
      mockCollection.get.mockResolvedValue({
        empty: false,
        docs: [
          {
            data: () => ({
              applicationId: 'PAPP000001',
              status: 'pending',
            }),
          },
        ],
      });

      await expect(
        service.submitApplication(mockApplicationDto, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if user is already a pilot', async () => {
      // Mock no pending applications
      mockCollection.get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      // Mock user is already a pilot
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['customer', 'pilot'] }),
      });

      await expect(
        service.submitApplication(mockApplicationDto, mockUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reviewApplication', () => {
    const applicationId = 'PAPP000001';
    const mockApplication = {
      applicationId,
      uid: mockUser.uid,
      status: 'pending',
      personalInfo: {
        name: 'Test Pilot',
        age: 30,
        phone: '+919876543210',
        email: 'test@example.com',
        address: 'Test Address',
      },
      pilotLicenseNumber: 'DGCA-TEST-001',
      pilotExpiryDate: new Date('2030-12-31'),
      aadhaarCardNumber: '1234 5678 9012',
      panNumber: 'ABCDE1234F',
      serviceTypes: ['spraying'],
      documents: {},
    };

    beforeEach(() => {
      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
    });

    it('should successfully approve application', async () => {
      // Mock application exists
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
        ref: mockDocRef,
      });

      // Mock successful transaction
      mockFirestore.runTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ roles: ['customer'] }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };
        await callback(transaction);
      });

      // Mock getting updated application
      jest.spyOn(service, 'getApplicationById').mockResolvedValue({
        ...mockApplication,
        status: 'approved',
        reviewedBy: mockAdmin.uid,
        reviewedAt: new Date(),
      } as any);

      const reviewDto: ReviewPilotApplicationDto = {
        action: ApplicationAction.APPROVE,
        reviewNotes: 'Approved',
      };

      const result = await service.reviewApplication(applicationId, reviewDto, mockAdmin);

      expect(result).toBeDefined();
      expect(result.application.status).toBe('approved');
      expect(result.pilot).toBeDefined();
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    it('should successfully reject application', async () => {
      // Mock application exists
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
        ref: mockDocRef,
      });

      // Mock successful transaction
      mockFirestore.runTransaction.mockImplementation(async (callback) => {
        const transaction = {
          update: jest.fn(),
        };
        await callback(transaction);
      });

      // Mock getting updated application
      jest.spyOn(service, 'getApplicationById').mockResolvedValue({
        ...mockApplication,
        status: 'rejected',
        reviewedBy: mockAdmin.uid,
        reviewedAt: new Date(),
        rejectionReason: 'License expired',
      } as any);

      const reviewDto: ReviewPilotApplicationDto = {
        action: ApplicationAction.REJECT,
        rejectionReason: 'License expired',
      };

      const result = await service.reviewApplication(applicationId, reviewDto, mockAdmin);

      expect(result).toBeDefined();
      expect(result.application.status).toBe('rejected');
      expect(result.pilot).toBeUndefined();
    });

    it('should throw NotFoundException if application does not exist', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: false,
      });

      const reviewDto: ReviewPilotApplicationDto = {
        action: ApplicationAction.APPROVE,
      };

      await expect(
        service.reviewApplication(applicationId, reviewDto, mockAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if application is already reviewed', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockApplication, status: 'approved' }),
        ref: mockDocRef,
      });

      const reviewDto: ReviewPilotApplicationDto = {
        action: ApplicationAction.APPROVE,
      };

      await expect(
        service.reviewApplication(applicationId, reviewDto, mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rejecting without reason', async () => {
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
        ref: mockDocRef,
      });

      const reviewDto: ReviewPilotApplicationDto = {
        action: ApplicationAction.REJECT,
        // Missing rejectionReason
      };

      await expect(
        service.reviewApplication(applicationId, reviewDto, mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getApplicationById', () => {
    it('should return application if exists', async () => {
      const applicationId = 'PAPP000001';
      const mockApplication = {
        applicationId,
        uid: mockUser.uid,
        status: 'pending',
      };

      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
      });

      const result = await service.getApplicationById(applicationId);

      expect(result).toEqual(mockApplication);
    });

    it('should throw NotFoundException if application does not exist', async () => {
      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockDocRef.get.mockResolvedValue({
        exists: false,
      });

      await expect(service.getApplicationById('PAPP999999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteApplication', () => {
    it('should successfully delete own pending application', async () => {
      const applicationId = 'PAPP000001';
      const mockApplication = {
        applicationId,
        uid: mockUser.uid,
        status: 'pending',
      };

      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
      });
      mockDocRef.delete.mockResolvedValue(undefined);

      await service.deleteApplication(applicationId, mockUser);

      expect(mockDocRef.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to delete another user\'s application', async () => {
      const applicationId = 'PAPP000001';
      const mockApplication = {
        applicationId,
        uid: 'other-user-uid',
        status: 'pending',
      };

      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
      });

      await expect(service.deleteApplication(applicationId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if application is not pending', async () => {
      const applicationId = 'PAPP000001';
      const mockApplication = {
        applicationId,
        uid: mockUser.uid,
        status: 'approved',
      };

      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockDocRef.get.mockResolvedValue({
        exists: true,
        data: () => mockApplication,
      });

      await expect(service.deleteApplication(applicationId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending applications', async () => {
      mockFirestore.collection.mockReturnValue(mockCollection);
      mockCollection.where.mockReturnThis();
      mockCollection.count.mockReturnThis();
      mockCollection.get.mockResolvedValue({
        data: () => ({ count: 5 }),
      });

      const result = await service.getPendingCount();

      expect(result).toBe(5);
    });
  });
});
