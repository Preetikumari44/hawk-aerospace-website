import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { AdminListResponseDto, AdminResponseDto, AdminStatsDto } from './dto/admin-response.dto';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { CacheService } from '../../common/cache/cache.service';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import { WS_EVENTS } from '../../gateway/events/event.constants';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly db: Firestore;

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.db = this.firebaseAdminService.firestore();
  }

  /**
   * Sanitize admin data by removing sensitive fields
   */
  private sanitizeAdminData(data: any): AdminResponseDto {
    const { passwordHash, ...sanitized } = data;
    return sanitized as AdminResponseDto;
  }

  /**
   * Generate next admin ID
   */
  private async generateAdminId(): Promise<string> {
    const adminsRef = this.db.collection('admins');
    const snapshot = await adminsRef.orderBy('adminId', 'desc').limit(1).get();
    
    if (snapshot.empty) {
      return 'ADM0001';
    }

    const lastAdmin = snapshot.docs[0].data();
    const lastId = parseInt(lastAdmin.adminId.replace('ADM', ''));
    const nextId = lastId + 1;
    
    return `ADM${String(nextId).padStart(4, '0')}`;
  }

  /**
   * Get all admins with filters
   */
  async findAll(query: AdminQueryDto): Promise<AdminListResponseDto> {
    try {
      let adminsRef: any = this.db.collection('admins');

      // Apply filters
      if (query.role) {
        adminsRef = adminsRef.where('role', '==', query.role);
      }

      if (query.department) {
        adminsRef = adminsRef.where('department', '==', query.department);
      }

      if (query.status) {
        adminsRef = adminsRef.where('status', '==', query.status);
      }

      if (query.reportingTo) {
        adminsRef = adminsRef.where('reportingTo', '==', query.reportingTo);
      }

      if (query.state) {
        adminsRef = adminsRef.where('scope.states', 'array-contains', query.state);
      }

      // Get all matching documents
      const snapshot = await adminsRef.get();
      let admins = snapshot.docs.map((doc: any) => this.sanitizeAdminData({ ...doc.data(), id: doc.id }));

      // Apply search filter (client-side since Firestore doesn't support full-text search)
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        admins = admins.filter((admin: any) => 
          admin.fullName?.toLowerCase().includes(searchLower) ||
          admin.email?.toLowerCase().includes(searchLower) ||
          admin.employeeCode?.toLowerCase().includes(searchLower)
        );
      }

      // Sorting
      admins.sort((a: any, b: any) => {
        const sortBy = query.sortBy || 'createdAt';
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';
        
        if (query.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      });

      // Pagination
      const total = admins.length;
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAdmins = admins.slice(startIndex, endIndex);

      return {
        data: paginatedAdmins as AdminResponseDto[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching admins', error);
      throw error;
    }
  }

  /**
   * Get admin by ID
   */
  async findOne(adminId: string): Promise<AdminResponseDto> {
    try {
      const adminDoc = await this.db.collection('admins').doc(adminId).get();

      if (!adminDoc.exists) {
        throw new NotFoundException(`Admin with ID ${adminId} not found`);
      }

      return this.sanitizeAdminData(adminDoc.data());
    } catch (error) {
      this.logger.error(`Error fetching admin ${adminId}`, error);
      throw error;
    }
  }

  /**
   * Get subordinates (admins reporting to this admin)
   */
  async findSubordinates(adminId: string, query: AdminQueryDto): Promise<AdminListResponseDto> {
    try {
      // Verify admin exists
      await this.findOne(adminId);

      // Get subordinates
      return this.findAll({ ...query, reportingTo: adminId });
    } catch (error) {
      this.logger.error(`Error fetching subordinates for admin ${adminId}`, error);
      throw error;
    }
  }

  /**
   * Get department admins for a specific admin
   */
  async findDepartmentAdmins(adminId: string, department: string): Promise<AdminResponseDto[]> {
    try {
      const snapshot = await this.db.collection('admins')
        .where('department', '==', department)
        .where('reportingTo', '==', adminId)
        .get();

      return snapshot.docs.map(doc => this.sanitizeAdminData(doc.data()));
    } catch (error) {
      this.logger.error(`Error fetching department admins`, error);
      throw error;
    }
  }

  /**
   * Create new admin
   */
  async create(createAdminDto: CreateAdminDto, createdBy: string): Promise<AdminResponseDto> {
    try {
      // Check if email already exists
      const existingAdmin = await this.db.collection('admins')
        .where('email', '==', createAdminDto.email)
        .limit(1)
        .get();

      if (!existingAdmin.empty) {
        throw new BadRequestException('Admin with this email already exists');
      }

      // Generate admin ID
      const adminId = await this.generateAdminId();
      
      // Generate employee code if not provided
      const employeeCode = createAdminDto.employeeCode || `HAWK-${adminId}`;

      // Create Firebase Auth user
      let userId: string;
      try {
        const userRecord = await this.firebaseAdminService.auth().createUser({
          email: createAdminDto.email,
          emailVerified: false,
          displayName: createAdminDto.fullName,
          photoURL: createAdminDto.photoUrl,
          disabled: false,
        });
        userId = userRecord.uid;

        // Set custom claims
        await this.firebaseAdminService.auth().setCustomUserClaims(userId, {
          adminId,
          role: createAdminDto.role,
          department: createAdminDto.department,
          permissionsProfile: createAdminDto.permissionsProfile,
        });
      } catch (authError) {
        this.logger.error('Error creating Firebase Auth user', authError);
        throw new BadRequestException('Failed to create authentication user');
      }

      const now = new Date().toISOString();

      const adminData: AdminResponseDto = {
        adminId,
        userId,
        employeeCode,
        fullName: createAdminDto.fullName,
        photoUrl: createAdminDto.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(createAdminDto.fullName)}&background=random`,
        email: createAdminDto.email,
        phone: createAdminDto.phone,
        designation: createAdminDto.designation,
        role: createAdminDto.role,
        department: createAdminDto.department,
        reportingTo: createAdminDto.reportingTo || null,
        scope: {
          country: createAdminDto.scope.country,
          states: createAdminDto.scope.states || [],
          districts: createAdminDto.scope.districts || [],
          regions: createAdminDto.scope.regions || [],
          cities: createAdminDto.scope.cities || [],
        },
        status: 'ACTIVE',
        onlineStatus: 'OFFLINE',
        lastLogin: '' as any,
        joinedAt: now,
        permissionsProfile: createAdminDto.permissionsProfile,
        managedUsers: {
          admins: 0,
          fleetManagers: 0,
          pilots: 0,
          salesAggregators: 0,
          customers: 0,
        },
        createdBy,
        createdAt: now,
        updatedAt: now,
      };

      // Save to Firestore
      await this.db.collection('admins').doc(adminId).set(adminData);

      // Log action in audit logs
      await this.logAuditAction(createdBy, 'ADMIN_CREATED', 'Admins', adminId, null, adminData);

      this.logger.log(`Admin created successfully: ${adminId}`);
      return adminData;
    } catch (error) {
      this.logger.error('Error creating admin', error);
      throw error;
    }
  }

  /**
   * Update admin
   */
  async update(adminId: string, updateAdminDto: UpdateAdminDto, updatedBy: string): Promise<AdminResponseDto> {
    try {
      const adminDoc = await this.db.collection('admins').doc(adminId).get();

      if (!adminDoc.exists) {
        throw new NotFoundException(`Admin with ID ${adminId} not found`);
      }

      const oldData = adminDoc.data();

      if (!oldData) {
        throw new NotFoundException(`Admin data not found for ID ${adminId}`);
      }

      const now = new Date().toISOString();

      // Build update data with only defined fields
      const updateData: Record<string, any> = {
        updatedAt: now,
      };

      // Only include defined fields from updateAdminDto
      (Object.keys(updateAdminDto) as Array<keyof UpdateAdminDto>).forEach(key => {
        const value = updateAdminDto[key];
        if (value !== undefined) {
          // Convert nested objects/DTOs to plain objects for Firestore
          if (typeof value === 'object' && value !== null) {
            updateData[key] = JSON.parse(JSON.stringify(value));
          } else {
            updateData[key] = value;
          }
        }
      });

      // Update Firestore
      await this.db.collection('admins').doc(adminId).update(updateData);

      // Update Firebase Auth custom claims if role or permissions changed
      if (updateAdminDto.role || updateAdminDto.department || updateAdminDto.permissionsProfile) {
        try {
          const userId = oldData.userId;
          const currentClaims = (await this.firebaseAdminService.auth().getUser(userId)).customClaims || {};
          
          await this.firebaseAdminService.auth().setCustomUserClaims(userId, {
            ...currentClaims,
            role: updateAdminDto.role || oldData.role,
            department: updateAdminDto.department || oldData.department,
            permissionsProfile: updateAdminDto.permissionsProfile || oldData.permissionsProfile,
          });
        } catch (authError) {
          this.logger.error('Error updating Firebase Auth claims', authError);
        }
      }

      // Get updated admin
      const updatedAdmin = await this.findOne(adminId);

      // Invalidate caches
      await this.cacheService.delete(`admin-stats`);
      await this.cacheService.deletePattern('admin-list:.*');

      // Log action
      await this.logAuditAction(updatedBy, 'ADMIN_UPDATED', 'Admins', adminId, oldData, updatedAdmin);

      this.logger.log(`Admin updated successfully: ${adminId}`);
      return updatedAdmin;
    } catch (error) {
      this.logger.error(`Error updating admin ${adminId}`, error);
      throw error;
    }
  }

  /**
   * Delete admin (soft delete)
   */
  async remove(adminId: string, deletedBy: string): Promise<void> {
    try {
      const adminDoc = await this.db.collection('admins').doc(adminId).get();

      if (!adminDoc.exists) {
        throw new NotFoundException(`Admin with ID ${adminId} not found`);
      }

      const oldData = adminDoc.data();

      if (!oldData) {
        throw new NotFoundException(`Admin data not found for ID ${adminId}`);
      }

      // Soft delete - update status to INACTIVE
      await this.db.collection('admins').doc(adminId).update({
        status: 'INACTIVE',
        updatedAt: new Date().toISOString(),
      });

      // Disable Firebase Auth user
      try {
        await this.firebaseAdminService.auth().updateUser(oldData.userId, {
          disabled: true,
        });
      } catch (authError) {
        this.logger.error('Error disabling Firebase Auth user', authError);
      }

      // Log action
      await this.logAuditAction(deletedBy, 'ADMIN_REMOVED', 'Admins', adminId, oldData, { status: 'INACTIVE' });

      this.logger.log(`Admin removed successfully: ${adminId}`);
    } catch (error) {
      this.logger.error(`Error removing admin ${adminId}`, error);
      throw error;
    }
  }

  /**
   * Get admin statistics
   */
  async getStats(): Promise<AdminStatsDto> {
    const cacheKey = `admin-stats`;
    const cached = await this.cacheService.get<AdminStatsDto>(cacheKey);
    
    if (cached) {
      this.logger.log(`Cache hit for admin stats`);
      return cached;
    }
    
    try {
      const snapshot = await this.db.collection('admins').get();
      const admins = snapshot.docs.map(doc => this.sanitizeAdminData(doc.data()));

      const stats: AdminStatsDto = {
        totalAdmins: admins.length,
        superAdmins: admins.filter(a => a.role === 'SUPER_ADMIN').length,
        stateAdmins: admins.filter(a => a.role === 'STATE_ADMIN').length,
        departmentAdmins: admins.filter(a => a.role === 'DEPARTMENT_ADMIN').length,
        districtAdmins: admins.filter(a => a.role === 'DISTRICT_ADMIN').length,
        activeAdmins: admins.filter(a => a.status === 'ACTIVE').length,
        inactiveAdmins: admins.filter(a => a.status !== 'ACTIVE').length,
      };

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, stats, 10 * 60 * 1000);

      return stats;
    } catch (error) {
      this.logger.error('Error fetching admin stats', error);
      throw error;
    }
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<any[]> {
    try {
      const snapshot = await this.db.collection('departments').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      this.logger.error('Error fetching departments', error);
      throw error;
    }
  }

  /**
   * Get all states
   */
  async getStates(): Promise<any[]> {
    try {
      const snapshot = await this.db.collection('states').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      this.logger.error('Error fetching states', error);
      throw error;
    }
  }

  /**
   * Get all permission profiles
   */
  async getPermissionProfiles(): Promise<any[]> {
    try {
      const snapshot = await this.db.collection('permissionProfiles').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      this.logger.error('Error fetching permission profiles', error);
      throw error;
    }
  }

  /**
   * Log audit action
   */
  private async logAuditAction(
    adminId: string,
    action: string,
    module: string,
    entityId: string,
    oldData: any,
    newData: any,
  ): Promise<void> {
    try {
      const logId = `LOG${Date.now()}`;
      const auditLog = {
        logId,
        adminId,
        action,
        module,
        entityId,
        entityType: module.toUpperCase(),
        oldData: oldData || null,
        newData: newData || null,
        timestamp: new Date().toISOString(),
        ipAddress: '0.0.0.0', // TODO: Get from request
        userAgent: 'Backend API',
        device: 'Backend',
        result: 'SUCCESS',
        severity: this.getSeverity(action),
      };

      await this.db.collection('adminAuditLogs').doc(logId).set(auditLog);
    } catch (error) {
      this.logger.error('Error logging audit action', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }

  /**
   * Verify a user (pilot, vendor, aggregator)
   */
  async verifyUser(
    targetUid: string,
    dto: { approved: boolean; remarks?: string },
    adminUser: CurrentUser,
  ): Promise<any> {
    if (targetUid === adminUser.uid) {
      throw new ForbiddenException('Cannot verify self');
    }

    const targetUser = await this.usersService.getByUid(targetUid);
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUid} not found`);
    }

    if (targetUser.role === 'customer') {
      throw new BadRequestException('Cannot verify customer');
    }

    const updateDto = dto.approved
      ? {
          status: 'active' as const,
          adminApproval: true,
          isVerified: true,
          remarks: dto.remarks || 'Verified',
        }
      : {
          status: 'rejected' as const,
          adminApproval: false,
          isVerified: false,
          remarks: dto.remarks || 'Rejected',
        };

    const updatedUser = await this.usersService.updateStatus(targetUid, updateDto);

    this.eventEmitter.emit(WS_EVENTS.ADMIN_ACTION, {
      actionType: 'verify_user',
      adminId: adminUser.uid,
      targetId: targetUid,
      status: dto.approved ? 'approved' : 'rejected',
      remarks: dto.remarks,
      timestamp: new Date().toISOString(),
    });

    // Log to audit log
    await this.logAuditAction(
      adminUser.uid,
      dto.approved ? 'USER_VERIFIED' : 'USER_VERIFICATION_REJECTED',
      'Users',
      targetUid,
      targetUser,
      updatedUser,
    );

    return updatedUser;
  }

  /**
   * Ban or unban a user
   */
  async banUser(
    targetUid: string,
    dto: { isBanned: boolean; remarks?: string },
    adminUser: CurrentUser,
  ): Promise<any> {
    if (targetUid === adminUser.uid) {
      throw new ForbiddenException('Cannot ban self');
    }

    const targetUser = await this.usersService.getByUid(targetUid);
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUid} not found`);
    }

    const updateDto = dto.isBanned
      ? {
          status: 'blocked' as const,
          adminApproval: false,
          remarks: dto.remarks || 'Banned',
        }
      : {
          status: 'active' as const,
          adminApproval: true,
          remarks: dto.remarks || 'Unbanned',
        };

    const updatedUser = await this.usersService.updateStatus(targetUid, updateDto);

    this.eventEmitter.emit(WS_EVENTS.ADMIN_ACTION, {
      actionType: 'ban_user',
      adminId: adminUser.uid,
      targetId: targetUid,
      status: dto.isBanned ? 'blocked' : 'active',
      remarks: dto.remarks,
      timestamp: new Date().toISOString(),
    });

    // Log to audit log
    await this.logAuditAction(
      adminUser.uid,
      dto.isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
      'Users',
      targetUid,
      targetUser,
      updatedUser,
    );

    return updatedUser;
  }

  /**
   * Get admin dashboard metrics
   */
  async getDashboard(adminUser: CurrentUser): Promise<any> {
    const isSubadmin = adminUser.role === 'subadmin';
    const perms = adminUser.permissions || {};

    // 1. Fetch Users
    const usersSnapshot = await this.db.collection('users').get();
    let users = usersSnapshot.docs.map(doc => doc.data());

    if (isSubadmin) {
      users = users.filter(user => {
        if (user.role === 'pilot' && perms.manage_pilots) return true;
        if (user.role === 'vendor' && perms.manage_vendors) return true;
        if (user.role === 'customer' && perms.manage_customers) return true;
        if (user.role === 'aggregator' && perms.manage_aggregators) return true;
        return false;
      });
    }

    const totalUsers = users.length;
    const usersByRole: Record<string, number> = {};
    const usersByStatus: Record<string, number> = {};
    let pendingApprovals = 0;

    for (const user of users) {
      const role = user.role || 'unknown';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
      const status = user.status || 'unknown';
      usersByStatus[status] = (usersByStatus[status] || 0) + 1;
      if (user.status === 'pending' || user.adminApproval === false) {
        pendingApprovals++;
      }
    }

    // 2. Fetch Bookings
    let bookings: any[] = [];
    if (!isSubadmin || perms.manage_bookings) {
      const bookingsSnapshot = await this.db.collectionGroup('bookings').get();
      bookings = bookingsSnapshot.docs.map(doc => doc.data());
    }

    const totalBookings = bookings.length;
    const bookingsByStatus: Record<string, number> = {};
    let completedBookings = 0;
    let cancelledBookings = 0;

    for (const booking of bookings) {
      const status = booking.status || 'unknown';
      bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1;
      if (booking.status === 'completed') {
        completedBookings++;
      } else if (booking.status === 'cancelled') {
        cancelledBookings++;
      }
    }

    // 3. Fetch Revenue
    let payments: any[] = [];
    if (!isSubadmin || perms.view_revenue) {
      const paymentsSnapshot = await this.db.collection('payments').get();
      payments = paymentsSnapshot.docs.map(doc => doc.data());
    }

    const totalRevenue = payments.reduce((sum, payment) => {
      if (payment.status === 'paid' || payment.status === 'completed') {
        return sum + (payment.amount || 0);
      }
      return sum;
    }, 0);

    // 4. Fetch Incidents
    let incidents: any[] = [];
    if (!isSubadmin || perms.manage_incidents) {
      const incidentsSnapshot = await this.db.collection('incidents').get();
      incidents = incidentsSnapshot.docs.map(doc => doc.data());
    }

    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
    const incidentsBySeverity: Record<string, number> = {};

    for (const incident of incidents) {
      const severity = incident.severity || 'unknown';
      incidentsBySeverity[severity] = (incidentsBySeverity[severity] || 0) + 1;
    }

    return {
      users: {
        total: totalUsers,
        byRole: usersByRole,
        byStatus: usersByStatus,
        pendingApprovals,
      },
      bookings: {
        total: totalBookings,
        byStatus: bookingsByStatus,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      revenue: {
        total: totalRevenue,
        paidPayments: payments.filter(p => p.status === 'paid' || p.status === 'completed').length,
      },
      incidents: {
        total: totalIncidents,
        open: openIncidents,
        bySeverity: incidentsBySeverity,
      },
    };
  }

  /**
   * Get bookings map with state distribution and vendor zones
   */
  async getBookingsMap(): Promise<any> {
    const usersSnapshot = await this.db.collection('users').get();
    const vendorZones = usersSnapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as any))
      .filter(user => user.role === 'vendor')
      .map(vendor => {
        return {
          vendorId: vendor.uid || vendor.id,
          name: vendor.name || '',
          state: vendor.profileData?.state || '',
          verified: vendor.verification?.isVerified || false,
          location: vendor.profileData?.location || null,
        };
      });

    const bookingsSnapshot = await this.db.collectionGroup('bookings').get();
    const bookings = bookingsSnapshot.docs.map(doc => doc.data());

    const bookingsByState: Record<string, number> = {};
    for (const booking of bookings) {
      let state = 'Unknown';
      if (booking.address) {
        for (const s of ['Punjab', 'Delhi', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra']) {
          if (booking.address.toLowerCase().includes(s.toLowerCase())) {
            state = s;
            break;
          }
        }
      }
      bookingsByState[state] = (bookingsByState[state] || 0) + 1;
    }

    return {
      bookingsByState,
      vendorZones,
    };
  }

  /**
   * Update platform settings
   */
  async updateSettings(dto: any, adminUser: CurrentUser): Promise<any> {
    const settingsRef = this.db.collection('settings').doc('platform');
    const updateData = {
      ...dto,
      updatedBy: adminUser.uid,
      updatedAt: new Date().toISOString(),
    };
    await settingsRef.set(updateData, { merge: true });
    const snap = await settingsRef.get();
    return snap.data();
  }

  /**
   * List users
   */
  async listUsers(query: any): Promise<any> {
    return this.usersService.findMany(query);
  }

  /**
   * List admin audit actions
   */
  async listActions(query: any): Promise<any> {
    let groupRef: any = this.db.collectionGroup('adminAuditLogs');
    if (query.adminId) {
      groupRef = groupRef.where('adminId', '==', query.adminId);
    }
    if (query.actionType) {
      groupRef = groupRef.where('actionType', '==', query.actionType);
    }

    const limitVal = query.limit || 10;
    const pageVal = query.page || 1;

    const countSnap = await groupRef.count().get();
    const total = countSnap.data().count;

    const queryRef = groupRef.orderBy('timestamp', 'desc').limit(limitVal);
    const snap = await queryRef.get();
    const items = snap.docs.map((doc: any) => doc.data());

    return {
      items,
      total,
      page: pageVal,
      limit: limitVal,
    };
  }

  /**
   * Get severity level for action
   */
  private getSeverity(action: string): string {
    const criticalActions = ['ADMIN_REMOVED', 'PERMISSION_CHANGED', 'ADMIN_PERMISSION_CHANGE'];
    const highActions = ['ADMIN_CREATED', 'ADMIN_UPDATED'];
    
    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    return 'MEDIUM';
  }
}
