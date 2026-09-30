import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import type {
    FirestoreAdminActionDocument,
    FirestoreBookingDocument,
    FirestoreIncidentDocument,
    FirestorePaymentDocument,
    FirestoreUserDocument,
} from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { CacheService } from '../../common/cache/cache.service';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';

describe('AdminService - Unit Tests', () => {
  let service: AdminService;

  const mockUsers: FirestoreUserDocument[] = [
    {
      uid: 'customer1',
      role: 'customer',
      status: 'active',
      name: 'Customer One',
      email: 'customer1@test.com',
      phone: '+911234567890',
      authProvider: 'phone',
      profileData: { name: 'Customer One' },
      verification: { isVerified: true, documents: [] },
      adminApproval: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastLogin: '2024-01-01T00:00:00.000Z',
    },
    {
      uid: 'pilot1',
      role: 'pilot',
      status: 'pending',
      name: 'Pilot One',
      email: 'pilot1@test.com',
      phone: '+911234567891',
      authProvider: 'phone',
      profileData: { name: 'Pilot One' },
      verification: { isVerified: false, documents: [] },
      adminApproval: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      lastLogin: null,
    },
  ];

  const mockBookings: FirestoreBookingDocument[] = [
    {
      id: 'booking1',
      customerUid: 'customer1',
      createdBy: 'customer1',
      aggregatorId: null,
      vendorId: null,
      assignedPilot: null,
      assignedDrone: null,
      address: '123 Farm Road, Punjab',
      area: { unit: 'hectare', value: 10 },
      cropType: 'wheat',
      serviceType: 'spraying',
      droneTier: 'standard',
      location: { lat: 30.7333, lng: 76.7794 },
      couponCode: null,
      priceEstimation: 5000,
      finalPrice: null,
      paymentMethod: null,
      paymentStatus: 'pending',
      status: 'pending',
      scheduledDate: '2024-02-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockPayments: FirestorePaymentDocument[] = [
    {
      id: 'payment1',
      bookingId: 'booking1',
      pilotId: 'pilot1',
      customerId: 'customer1',
      amount: 5000,
      method: 'upi',
      status: 'paid',
      invoiceId: 'inv_payment1',
      referenceId: 'UPI123',
      confirmedAt: '2024-01-05T00:00:00.000Z',
      createdAt: '2024-01-05T00:00:00.000Z',
      updatedAt: '2024-01-05T00:00:00.000Z',
    },
  ];

  const mockIncidents: FirestoreIncidentDocument[] = [
    {
      incidentId: 'incident1',
      type: 'drone_malfunction',
      severity: 'high',
      reportedBy: 'pilot1',
      bookingId: 'booking1',
      droneId: 'drone1',
      pilotId: 'pilot1',
      description: 'Motor failure during flight',
      location: { lat: 30.7333, lng: 76.7794 },
      mediaUrls: [],
      status: 'reported',
      resolutionNotes: null,
      escalatedTo: null,
      reportedAt: '2024-01-03T00:00:00.000Z',
      resolvedAt: null,
    },
  ];

  const mockFirestoreDoc = {
    id: 'doc123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
    collectionGroup: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  const mockUsersService = {
    findMany: jest.fn(),
    getByUid: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    // Setup mocks
    mockFirestoreCollection.get.mockResolvedValue({
      docs: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock Firestore responses
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockUsers.map((user) => ({ data: () => user })),
            }),
          };
        }
        if (collectionName === 'payments') {
          return {
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: mockPayments.map((payment) => ({ data: () => payment })),
            }),
          };
        }
        if (collectionName === 'incidents') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockIncidents.map((incident) => ({ data: () => incident })),
            }),
          };
        }
        return mockFirestoreCollection;
      });

      mockFirestore.collectionGroup.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockBookings.map((booking) => ({ data: () => booking })),
        }),
      });

      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'payments') {
          return {
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: mockPayments.map((payment) => ({ data: () => payment })),
            }),
          };
        }
        if (collectionName === 'users') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockUsers.map((user) => ({ data: () => user })),
            }),
          };
        }
        if (collectionName === 'incidents') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockIncidents.map((incident) => ({ data: () => incident })),
            }),
          };
        }
        return mockFirestoreCollection;
      });
    });

    // ASPIRATIONAL TEST - Method not yet implemented
    it('should return dashboard metrics for admin', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      const result = await (service as any).getDashboard(adminUser);

      expect(result).toMatchObject({
        users: {
          total: 2,
          byRole: { customer: 1, pilot: 1 },
          byStatus: { active: 1, pending: 1 },
          pendingApprovals: 1,
        },
        bookings: {
          total: 1,
          byStatus: { pending: 1 },
          completed: 0,
          cancelled: 0,
        },
        revenue: {
          total: 5000,
          paidPayments: 1,
        },
        incidents: {
          total: 1,
          open: 1,
          bySeverity: { high: 1 },
        },
      });
    });

    // ASPIRATIONAL TEST - Method not yet implemented
    it('should apply scope for subadmin with manage_pilots permission', async () => {
      const subadminUser: CurrentUser = {
        uid: 'subadmin1',
        role: 'subadmin',
        status: 'active',
        permissions: {
          manage_pilots: true,
          manage_vendors: false,
          manage_customers: false,
          manage_aggregators: false,
          manage_bookings: false,
          view_revenue: false,
          manage_incidents: false,
          manage_service_centre: false,
          manage_fleet: false,
          manage_coupons: false,
        },
      };

      const result = await (service as any).getDashboard(subadminUser);

      expect(result.users.total).toBe(1); // Only pilot visible
      expect(result.users.byRole).toEqual({ pilot: 1 });
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('verifyUser', () => {
    it('should verify user successfully', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      const pilotUser: FirestoreUserDocument = {
        uid: 'pilot1',
        role: 'pilot',
        status: 'pending',
        name: 'Pilot One',
        email: 'pilot1@test.com',
        phone: '+911234567891',
        authProvider: 'phone',
        profileData: { name: 'Pilot One' },
        verification: { isVerified: false, documents: [] },
        adminApproval: false,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        lastLogin: null,
      };

      mockUsersService.getByUid.mockResolvedValue(pilotUser);
      mockUsersService.updateStatus.mockResolvedValue({
        ...pilotUser,
        status: 'active',
        adminApproval: true,
      });

      const result = await (service as any).verifyUser(
        'pilot1',
        { approved: true, remarks: 'Verified' },
        adminUser,
      );

      expect(mockUsersService.updateStatus).toHaveBeenCalledWith('pilot1', {
        status: 'active',
        adminApproval: true,
        isVerified: true,
        remarks: 'Verified',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.ADMIN_ACTION,
        expect.objectContaining({
          actionType: 'verify_user',
          adminId: 'admin1',
          targetId: 'pilot1',
          status: 'approved',
        }),
      );
    });

    it('should throw ForbiddenException when admin tries to verify self (M-004)', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      await expect(
        (service as any).verifyUser('admin1', { approved: true }, adminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for customer verification', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      mockUsersService.getByUid.mockResolvedValue({
        uid: 'customer1',
        role: 'customer',
        status: 'active',
      });

      await expect(
        (service as any).verifyUser('customer1', { approved: true }, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject user when approved is false', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      const pilotUser: FirestoreUserDocument = {
        uid: 'pilot1',
        role: 'pilot',
        status: 'pending',
        name: 'Pilot One',
        email: 'pilot1@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Pilot One' },
        verification: { isVerified: false, documents: [] },
        adminApproval: false,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        lastLogin: null,
      };

      mockUsersService.getByUid.mockResolvedValue(pilotUser);
      mockUsersService.updateStatus.mockResolvedValue({
        ...pilotUser,
        status: 'rejected',
      });

      await (service as any).verifyUser('pilot1', { approved: false, remarks: 'Invalid documents' }, adminUser);

      expect(mockUsersService.updateStatus).toHaveBeenCalledWith('pilot1', {
        status: 'rejected',
        adminApproval: false,
        isVerified: false,
        remarks: 'Invalid documents',
      });
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      mockUsersService.getByUid.mockResolvedValue({
        uid: 'customer1',
        role: 'customer',
        status: 'active',
      });

      mockUsersService.updateStatus.mockResolvedValue({
        uid: 'customer1',
        role: 'customer',
        status: 'blocked',
      });

      const result = await (service as any).banUser(
        'customer1',
        { isBanned: true, remarks: 'Policy violation' },
        adminUser,
      );

      expect(mockUsersService.updateStatus).toHaveBeenCalledWith('customer1', {
        status: 'blocked',
        adminApproval: false,
        remarks: 'Policy violation',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WS_EVENTS.ADMIN_ACTION,
        expect.objectContaining({
          actionType: 'ban_user',
          adminId: 'admin1',
          targetId: 'customer1',
          status: 'blocked',
        }),
      );
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('getBookingsMap', () => {
    beforeEach(() => {
      mockFirestore.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  data: () => ({
                    uid: 'vendor1',
                    role: 'vendor',
                    name: 'Vendor One',
                    profileData: { location: { lat: 28.7041, lng: 77.1025 }, state: 'Delhi' },
                    verification: { isVerified: true, documents: [] },
                  }),
                },
              ],
            }),
          };
        }
        return mockFirestoreCollection;
      });

      mockFirestore.collectionGroup.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              data: () => ({
                id: 'booking1',
                address: '123 Farm Road, Punjab',
                status: 'completed',
              }),
            },
          ],
        }),
      });
    });

    it('should return bookings map with state distribution', async () => {
      const result = await (service as any).getBookingsMap();

      expect(result).toMatchObject({
        bookingsByState: expect.any(Object),
        vendorZones: expect.arrayContaining([
          expect.objectContaining({
            vendorId: 'vendor1',
            name: 'Vendor One',
            state: 'Delhi',
            verified: true,
          }),
        ]),
      });
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('updateSettings', () => {
    it('should update platform settings', async () => {
      const adminUser: CurrentUser = {
        uid: 'admin1',
        role: 'admin',
        status: 'active',
      };

      const dto = {
        theme: 'dark' as const,
        language: 'hi',
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          theme: 'dark',
          language: 'hi',
          updatedBy: 'admin1',
        }),
      });

      const result = await (service as any).updateSettings(dto, adminUser);

      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          language: 'hi',
          updatedBy: 'admin1',
        }),
        { merge: true },
      );
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('listUsers', () => {
    it('should delegate to UsersService', async () => {
      mockUsersService.findMany.mockResolvedValue({
        items: mockUsers,
        meta: { page: 1, limit: 10, total: 2 },
      });

      const result = await (service as any).listUsers({ page: 1, limit: 10 });

      expect(mockUsersService.findMany).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(2);
    });
  });

  // ASPIRATIONAL TESTS - Methods not yet implemented
  describe('listActions', () => {
    it('should list admin actions with filters', async () => {
      const mockActions: FirestoreAdminActionDocument[] = [
        {
          id: 'action1',
          actionType: 'verify_user',
          adminId: 'admin1',
          targetId: 'pilot1',
          status: 'approved',
          remarks: 'Verified',
          timestamp: '2024-01-05T00:00:00.000Z',
        },
      ];

      const mockCollectionGroup = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) }),
        }),
        get: jest.fn().mockResolvedValue({
          docs: mockActions.map((action) => ({ data: () => action })),
        }),
      };

      mockFirestore.collectionGroup.mockReturnValue(mockCollectionGroup);

      const result = await (service as any).listActions({
        page: 1,
        limit: 10,
        adminId: 'admin1',
        actionType: 'verify_user',
      });

      expect(mockCollectionGroup.where).toHaveBeenCalledWith('adminId', '==', 'admin1');
      expect(mockCollectionGroup.where).toHaveBeenCalledWith('actionType', '==', 'verify_user');
    });
  });
});
