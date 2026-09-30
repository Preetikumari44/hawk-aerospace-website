import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';
import { SubmitPilotApplicationDto } from '../dto/submit-pilot-application.dto';
import { ReviewPilotApplicationDto, ApplicationAction } from '../dto/review-pilot-application.dto';
import type {
  PilotApplication,
  PilotApplicationSummary,
  PilotDocument,
} from '../interfaces/pilot-application.interface';

const PILOT_APPLICATIONS_COLLECTION = 'pilotApplications';

@Injectable()
export class PilotApplicationService {
  private readonly logger = new Logger(PilotApplicationService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  /**
   * Submit a pilot application (Customer → Pilot role request)
   */
  async submitApplication(
    dto: SubmitPilotApplicationDto,
    user: CurrentUser,
  ): Promise<PilotApplication> {
    const db = this.firebaseAdmin.firestore();

    // Check if user already has a pending or approved application
    const existingAppsSnapshot = await db
      .collection(PILOT_APPLICATIONS_COLLECTION)
      .where('uid', '==', user.uid)
      .where('status', 'in', ['pending', 'approved'])
      .limit(1)
      .get();

    if (!existingAppsSnapshot.empty) {
      const existingApp = existingAppsSnapshot.docs[0].data() as PilotApplication;
      throw new ConflictException(
        `You already have a ${existingApp.status} pilot application (${existingApp.applicationId})`,
      );
    }

    // Check if user is already a pilot
    const userDoc = await db.collection(ROOT_COLLECTIONS.users).doc(user.uid).get();
    const userData = userDoc.data();
    
    if (userData && userData.roles && Array.isArray(userData.roles) && userData.roles.includes('pilot')) {
      throw new ConflictException('You are already registered as a pilot');
    }

    // Generate application ID
    const applicationId = await this.generateApplicationId();

    // Transform documents array to object map
    const documentsMap: Record<string, PilotDocument> = {};
    dto.documents.forEach((doc) => {
      documentsMap[doc.type] = {
        type: doc.type as any,
        storagePath: doc.storagePath,
        downloadUrl: doc.downloadUrl,
        verified: doc.verified || 'pending',
      };
    });

    // Create application
    const application: PilotApplication = {
      applicationId,
      uid: user.uid,
      status: 'pending',
      submittedAt: new Date(),
      personalInfo: {
        name: dto.name,
        age: dto.age,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
      pilotLicenseNumber: dto.pilotLicenseNumber,
      pilotExpiryDate: new Date(dto.pilotExpiryDate),
      aadhaarCardNumber: dto.aadhaarCardNumber,
      panNumber: dto.panNumber,
      gstNumber: dto.gstNumber,
      documents: documentsMap as any,
      serviceTypes: dto.serviceTypes,
      flightHours: dto.flightHours,
      experience: dto.experience,
      additionalNotes: dto.additionalNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(PILOT_APPLICATIONS_COLLECTION).doc(applicationId).set(application);

    this.logger.log(`Pilot application submitted: ${applicationId} by user ${user.uid}`);

    return application;
  }

  /**
   * Get all pilot applications (Admin only)
   */
  async getAllApplications(
    status?: 'pending' | 'approved' | 'rejected',
    limit = 50,
    offset = 0,
  ): Promise<{ applications: PilotApplicationSummary[]; total: number }> {
    const db = this.firebaseAdmin.firestore();
    let query: any = db.collection(PILOT_APPLICATIONS_COLLECTION);

    if (status) {
      query = query.where('status', '==', status);
    }

    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Get paginated results
    const snapshot = await query
      .orderBy('submittedAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const applications: PilotApplicationSummary[] = snapshot.docs.map((doc: any) => {
      const data = doc.data() as PilotApplication;
      
      // Count verified documents
      const docsArray = Object.values(data.documents || {});
      const verifiedDocs = docsArray.filter((d) => d.verified === 'verified').length;

      return {
        applicationId: data.applicationId,
        uid: data.uid,
        name: data.personalInfo.name,
        email: data.personalInfo.email,
        phone: data.personalInfo.phone,
        status: data.status,
        submittedAt: data.submittedAt,
        reviewedAt: data.reviewedAt,
        serviceTypes: data.serviceTypes,
        documentsVerified: verifiedDocs,
        totalDocuments: docsArray.length,
      };
    });

    return { applications, total };
  }

  /**
   * Get single application by ID
   */
  async getApplicationById(applicationId: string): Promise<PilotApplication> {
    const db = this.firebaseAdmin.firestore();
    const doc = await db.collection(PILOT_APPLICATIONS_COLLECTION).doc(applicationId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    return doc.data() as PilotApplication;
  }

  /**
   * Get application by user UID
   */
  async getApplicationByUid(uid: string): Promise<PilotApplication | null> {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db
      .collection(PILOT_APPLICATIONS_COLLECTION)
      .where('uid', '==', uid)
      .orderBy('submittedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as PilotApplication;
  }

  /**
   * Review and approve/reject pilot application (Admin only)
   * This handles the complete approval flow:
   * 1. Update application status
   * 2. If approved: Create pilot document with same UID
   * 3. Update user roles to include 'pilot'
   */
  async reviewApplication(
    applicationId: string,
    dto: ReviewPilotApplicationDto,
    admin: CurrentUser,
  ): Promise<{ application: PilotApplication; pilot?: any }> {
    const db = this.firebaseAdmin.firestore();

    // Get application
    const appDoc = await db.collection(PILOT_APPLICATIONS_COLLECTION).doc(applicationId).get();

    if (!appDoc.exists) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const application = appDoc.data() as PilotApplication;

    if (application.status !== 'pending') {
      throw new BadRequestException(
        `Application has already been ${application.status}`,
      );
    }

    if (dto.action === ApplicationAction.REJECT && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting an application');
    }

    const now = new Date();
    let pilot: any = null;

    // Use Firestore transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // 1. Update application
      const updateData: Partial<PilotApplication> = {
        status: dto.action,
        reviewedBy: admin.uid,
        reviewedAt: now,
        reviewNotes: dto.reviewNotes,
        updatedAt: now,
      };

      if (dto.action === ApplicationAction.REJECT) {
        updateData.rejectionReason = dto.rejectionReason;
      }

      if (dto.action === ApplicationAction.APPROVE && dto.assignedFleetManagerUid) {
        updateData.assignedFleetManagerUid = dto.assignedFleetManagerUid;
      }

      transaction.update(appDoc.ref, updateData);

      // 2. If approved, create pilot document and update user roles
      if (dto.action === ApplicationAction.APPROVE) {
        const pilotData = {
          uid: application.uid, // Same UID as user
          applicationId: application.applicationId,
          name: application.personalInfo.name,
          email: application.personalInfo.email,
          phone: application.personalInfo.phone,
          photoUrl: null,
          status: 'active',
          adminApproval: true,
          assignedFleetManagerUid: dto.assignedFleetManagerUid || null,
          isOnline: false,
          isAvailable: false,
          currentBookingId: null,
          currentDroneUid: null,
          currentLocation: null,
          address: application.personalInfo.address,
          age: application.personalInfo.age,
          aadhaarNumber: application.aadhaarCardNumber,
          panNumber: application.panNumber,
          gstNumber: application.gstNumber || null,
          license: {
            number: application.pilotLicenseNumber,
            type: 'medium',
            issueDate: new Date(),
            expiryDate: application.pilotExpiryDate,
          },
          medicalCertificate: {
            number: 'MED-' + Date.now().toString().slice(-6),
            expiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
          },
          availability: {
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: false,
            sun: true,
            startTime: '06:00',
            endTime: '18:00',
          },
          serviceTypes: application.serviceTypes,
          certifications: [],
          rating: 0,
          safetyScore: 100,
          onTimePercentage: 0,
          statistics: {
            totalMissions: 0,
            completedMissions: 0,
            cancelledMissions: 0,
            totalFlightHours: application.flightHours || 0,
          },
          earnings: {
            total: 0,
            settled: 0,
            pending: 0,
          },
          payoutMethod: {
            type: 'upi',
            upiId: '',
            accountNumber: '',
            ifsc: '',
          },
          createdAt: now,
          updatedAt: now,
        };

        // Create pilot document using same UID
        const pilotRef = db.collection(ROOT_COLLECTIONS.pilots).doc(application.uid);
        transaction.set(pilotRef, pilotData);

        // Update user roles to include 'pilot'
        const userRef = db.collection(ROOT_COLLECTIONS.users).doc(application.uid);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentRoles = userData?.roles || ['customer'];
          
          if (!currentRoles.includes('pilot')) {
            currentRoles.push('pilot');
            transaction.update(userRef, {
              roles: currentRoles,
              updatedAt: now,
            });
          }
        }

        pilot = pilotData;
      }
    });

    this.logger.log(
      `Application ${applicationId} ${dto.action} by admin ${admin.uid}`,
    );

    // Fetch updated application
    const updatedApp = await this.getApplicationById(applicationId);

    return { application: updatedApp, pilot };
  }

  /**
   * Update document verification status
   */
  async updateDocumentVerification(
    applicationId: string,
    documentType: string,
    status: 'pending' | 'verified' | 'rejected',
    notes: string | undefined,
    admin: CurrentUser,
  ): Promise<PilotApplication> {
    const db = this.firebaseAdmin.firestore();
    const appDoc = await db.collection(PILOT_APPLICATIONS_COLLECTION).doc(applicationId).get();

    if (!appDoc.exists) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const application = appDoc.data() as PilotApplication;
    
    if (!application.documents[documentType as keyof typeof application.documents]) {
      throw new NotFoundException(`Document type ${documentType} not found in application`);
    }

    // Update specific document verification status
    const updatePath = `documents.${documentType}`;
    await appDoc.ref.update({
      [`${updatePath}.verified`]: status,
      [`${updatePath}.verifiedBy`]: admin.uid,
      [`${updatePath}.verifiedAt`]: new Date(),
      [`${updatePath}.verificationNotes`]: notes || null,
      updatedAt: new Date(),
    });

    this.logger.log(
      `Document ${documentType} for application ${applicationId} marked as ${status} by ${admin.uid}`,
    );

    return this.getApplicationById(applicationId);
  }

  /**
   * Get pending applications count
   */
  async getPendingCount(): Promise<number> {
    const db = this.firebaseAdmin.firestore();
    const snapshot = await db
      .collection(PILOT_APPLICATIONS_COLLECTION)
      .where('status', '==', 'pending')
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Delete/withdraw application (user can only delete their own pending applications)
   */
  async deleteApplication(applicationId: string, user: CurrentUser): Promise<void> {
    const db = this.firebaseAdmin.firestore();
    const appDoc = await db.collection(PILOT_APPLICATIONS_COLLECTION).doc(applicationId).get();

    if (!appDoc.exists) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const application = appDoc.data() as PilotApplication;

    // Only allow deletion if it's the user's own application and it's pending
    if (application.uid !== user.uid) {
      throw new BadRequestException('You can only delete your own applications');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException('You can only delete pending applications');
    }

    await appDoc.ref.delete();

    this.logger.log(`Application ${applicationId} deleted by user ${user.uid}`);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  private async generateApplicationId(): Promise<string> {
    const db = this.firebaseAdmin.firestore();
    
    // Get the latest application to determine next sequence number
    const snapshot = await db
      .collection(PILOT_APPLICATIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let nextNumber = 1;

    if (!snapshot.empty) {
      const lastApp = snapshot.docs[0].data() as PilotApplication;
      const lastId = lastApp.applicationId;
      
      // Extract number from PAPP000001 format
      const match = lastId.match(/PAPP(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format as PAPP000001
    return `PAPP${nextNumber.toString().padStart(6, '0')}`;
  }
}
