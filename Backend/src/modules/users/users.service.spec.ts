import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { FirestoreUserDocument } from '../../database/firestore/contracts';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { UsersService } from './users.service';
import { CacheService } from '../../common/cache/cache.service';

describe('UsersService - Unit Tests', () => {
  let service: UsersService;
  let activeMockCount = 2;

  const mockFirestoreDoc = {
    id: 'user123',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
  };

  const mockFirestoreCollection = {
    doc: jest.fn().mockReturnValue(mockFirestoreDoc),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn(),
    count: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue({
        data: () => ({ count: activeMockCount }),
      }),
    })),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockFirestoreCollection),
  };

  const mockFirebaseService = {
    firestore: jest.fn().mockReturnValue(mockFirestore),
  };

  beforeEach(async () => {
    activeMockCount = 2;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: FirebaseAdminService,
          useValue: mockFirebaseService,
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with phone', async () => {
      const dto = {
        name: 'Test User',
        role: 'customer' as const,
        phone: '+919876543210',
        language: 'en',
      };

      const result = await service.createUser(dto);

      expect(result).toMatchObject({
        uid: 'phone:+919876543210',
        name: 'Test User',
        role: 'customer',
        phone: '+919876543210',
        authProvider: 'phone',
        status: 'active',
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });

    it('should create user with email', async () => {
      const dto = {
        name: 'Test User',
        role: 'pilot' as const,
        email: 'pilot@test.com',
      };

      const result = await service.createUser(dto);

      expect(result).toMatchObject({
        uid: 'email:pilot@test.com',
        name: 'Test User',
        role: 'pilot',
        email: 'pilot@test.com',
        authProvider: 'email',
        status: 'pending',
        adminApproval: false,
      });
    });

    it('should throw BadRequestException when no phone or email', async () => {
      const dto = {
        name: 'Test User',
        role: 'customer' as const,
      };

      await expect(service.createUser(dto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password when provided', async () => {
      const dto = {
        name: 'Admin User',
        role: 'admin' as const,
        email: 'admin@test.com',
        password: 'SecurePassword123!',
      };

      const result = await service.createUser(dto);

      expect(result.authCredentials).toBeDefined();
      expect(result.authCredentials?.passwordHash).toBeDefined();
      expect(result.authCredentials?.passwordHash).not.toBe('SecurePassword123!');
    });
  });

  describe('upsertAuthenticatedUser', () => {
    it('should update existing user', async () => {
      const existingUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Existing User',
        email: 'existing@test.com',
        phone: '+919876543210',
        authProvider: 'phone',
        profileData: { name: 'Existing User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => existingUser,
      });

      const result = await service.upsertAuthenticatedUser({
        uid: 'user123',
        role: 'customer',
        name: 'Updated Name',
      });

      expect(result).toMatchObject({
        uid: 'user123',
        name: 'Updated Name',
        lastLogin: expect.any(String),
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          lastLogin: expect.any(String),
        }),
        { merge: true },
      );
    });

    it('should create new user when not exists', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await service.upsertAuthenticatedUser({
        uid: 'newuser123',
        role: 'customer',
        name: 'New User',
        phone: '+919876543210',
      });

      expect(result).toMatchObject({
        uid: 'newuser123',
        role: 'customer',
        name: 'New User',
        phone: '+919876543210',
        status: 'active',
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });
  });

  describe('findByUid', () => {
    it('should return user when found', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: 'test@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const result = await service.findByUid('user123');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const result = await service.findByUid('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: 'test@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreCollection.get.mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('email', '==', 'test@test.com');
    });

    it('should return null when email not found', async () => {
      mockFirestoreCollection.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await service.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should find user by phone', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: null,
        phone: '+919876543210',
        authProvider: 'phone',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreCollection.get.mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await service.findByPhone('+919876543210');

      expect(result).toEqual(mockUser);
      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('phone', '==', '+919876543210');
    });
  });

  describe('getByUid', () => {
    it('should return user when found', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: 'test@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const result = await service.getByUid('user123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockFirestoreDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      await expect(service.getByUid('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOwnProfile', () => {
    it('should update user profile', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Old Name',
        email: 'old@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Old Name' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const result = await service.updateOwnProfile('user123', {
        name: 'New Name',
        email: 'new@test.com',
        language: 'hi',
      });

      expect(result).toMatchObject({
        name: 'New Name',
        email: 'new@test.com',
        profileData: expect.objectContaining({
          name: 'New Name',
          language: 'hi',
        }),
      });

      expect(mockFirestoreDoc.set).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'pilot',
        status: 'pending',
        name: 'Test Pilot',
        email: 'pilot@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Test Pilot' },
        verification: { isVerified: false, documents: [] },
        adminApproval: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const result = await service.updateStatus('user123', {
        status: 'active',
        adminApproval: true,
        isVerified: true,
      });

      expect(result).toMatchObject({
        status: 'active',
        adminApproval: true,
        verification: expect.objectContaining({
          isVerified: true,
        }),
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      const mockUser: FirestoreUserDocument = {
        uid: 'user123',
        role: 'customer',
        status: 'active',
        name: 'Test User',
        email: 'test@test.com',
        phone: null,
        authProvider: 'email',
        profileData: { name: 'Test User' },
        verification: { isVerified: true, documents: [] },
        adminApproval: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
      };

      mockFirestoreDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const result = await service.softDelete('user123');

      expect(result).toEqual({ deleted: true });
      expect(mockFirestoreDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'suspended',
          deletedAt: expect.any(String),
        }),
        { merge: true },
      );
    });
  });

  describe('findMany', () => {
    it('should find users with filters', async () => {
      const mockUsers: FirestoreUserDocument[] = [
        {
          uid: 'customer1',
          role: 'customer',
          status: 'active',
          name: 'Customer One',
          email: 'customer1@test.com',
          phone: null,
          authProvider: 'email',
          profileData: { name: 'Customer One' },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockUsers.map((user) => ({ data: () => user })),
      });

      activeMockCount = 1;

      const result = await service.findMany({
        role: 'customer',
        status: 'active',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 1,
      });

      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('role', '==', 'customer');
      expect(mockFirestoreCollection.where).toHaveBeenCalledWith('status', '==', 'active');
    });

    it('should filter by search text', async () => {
      const mockUsers: FirestoreUserDocument[] = [
        {
          uid: 'user1',
          role: 'customer',
          status: 'active',
          name: 'John Smith',
          email: 'john@test.com',
          phone: null,
          authProvider: 'email',
          profileData: { name: 'John Smith' },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
        {
          uid: 'user2',
          role: 'customer',
          status: 'active',
          name: 'Jane Doe',
          email: 'jane@test.com',
          phone: null,
          authProvider: 'email',
          profileData: { name: 'Jane Doe' },
          verification: { isVerified: true, documents: [] },
          adminApproval: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          lastLogin: null,
        },
      ];

      mockFirestoreCollection.get.mockResolvedValue({
        docs: mockUsers.map((user) => ({ data: () => user })),
      });

      const result = await service.findMany({
        search: 'john',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('John Smith');
    });
  });
});
