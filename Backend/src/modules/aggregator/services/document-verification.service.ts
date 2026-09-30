import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FirebaseAdminService } from '../../../firebase/firebase-admin.service';
import { ROOT_COLLECTIONS } from '../../../common/constants/collection-paths.constant';
import { 
  DocumentFilterDto, 
  DocumentStatus, 
  DocumentType, 
  UpdateDocumentDto, 
  VerifyDocumentDto 
} from '../dto/document-verification.dto';
import { CacheService } from '../../../common/cache/cache.service';
import type { CurrentUser } from '../../../common/interfaces/current-user.interface';

export interface DocumentRecord {
  id: string;
  aggregatorUid: string;
  aggregatorName: string;
  type: DocumentType;
  url: string;
  documentNumber?: string;
  status: DocumentStatus;
  expiryDate?: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  notes?: string;
  updatedAt: string;
}

@Injectable()
export class DocumentVerificationService {
  private readonly logger = new Logger(DocumentVerificationService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Upload/Update document for aggregator
   */
  async uploadDocument(
    aggregatorUid: string,
    dto: UpdateDocumentDto,
  ): Promise<DocumentRecord> {
    this.logger.log(`Uploading document for aggregator: ${aggregatorUid}`);
    
    const db = this.firebaseAdminService.firestore();

    // Get aggregator details
    const aggregatorDoc = await db
      .collection(ROOT_COLLECTIONS.users)
      .doc(aggregatorUid)
      .get();

    if (!aggregatorDoc.exists) {
      throw new NotFoundException(`Aggregator ${aggregatorUid} not found`);
    }

    const aggregatorData = aggregatorDoc.data();

    // Check if document of same type exists
    const existingDocsQuery = await db
      .collection('aggregator_documents')
      .where('aggregatorUid', '==', aggregatorUid)
      .where('type', '==', dto.type)
      .get();

    let documentId: string;
    let isUpdate = false;

    if (!existingDocsQuery.empty) {
      // Update existing document
      documentId = existingDocsQuery.docs[0].id;
      isUpdate = true;
    } else {
      // Create new document
      documentId = `doc-${aggregatorUid}-${dto.type}-${Date.now()}`;
    }

    const document: DocumentRecord = {
      id: documentId,
      aggregatorUid,
      aggregatorName: aggregatorData?.name || 'Unknown',
      type: dto.type,
      url: dto.url,
      documentNumber: dto.documentNumber,
      status: DocumentStatus.PENDING,
      expiryDate: dto.expiryDate,
      uploadedAt: isUpdate ? existingDocsQuery.docs[0].data().uploadedAt : new Date().toISOString(),
      notes: dto.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('aggregator_documents').doc(documentId).set(document);

    // Clear cache
    await this.cacheService.delete(`documents:aggregator:${aggregatorUid}`);

    // Emit event for admin notification
    this.eventEmitter.emit('document.uploaded', {
      aggregatorUid,
      documentType: dto.type,
      documentId,
    });

    this.logger.log(`Document ${isUpdate ? 'updated' : 'uploaded'}: ${documentId}`);
    return document;
  }

  /**
   * Verify/Reject document (Admin action)
   */
  async verifyDocument(
    documentId: string,
    dto: VerifyDocumentDto,
    admin: CurrentUser,
  ): Promise<DocumentRecord> {
    this.logger.log(`Verifying document: ${documentId} by ${admin.uid}`);
    
    const db = this.firebaseAdminService.firestore();
    const documentDoc = await db.collection('aggregator_documents').doc(documentId).get();

    if (!documentDoc.exists) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    const document = documentDoc.data() as DocumentRecord;

    const updated: DocumentRecord = {
      ...document,
      status: dto.status,
      verifiedAt: dto.status !== DocumentStatus.PENDING ? new Date().toISOString() : undefined,
      verifiedBy: dto.status !== DocumentStatus.PENDING ? admin.uid : undefined,
      rejectionReason: dto.rejectionReason,
      notes: dto.notes || document.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('aggregator_documents').doc(documentId).set(updated, { merge: true });

    // Clear cache
    await this.cacheService.delete(`documents:aggregator:${document.aggregatorUid}`);

    // Update aggregator verification status if all documents verified
    if (dto.status === DocumentStatus.VERIFIED) {
      await this.checkAndUpdateAggregatorVerificationStatus(document.aggregatorUid);
    }

    // Emit event for aggregator notification
    this.eventEmitter.emit('document.verified', {
      aggregatorUid: document.aggregatorUid,
      documentType: document.type,
      status: dto.status,
      documentId,
    });

    this.logger.log(`Document verified: ${documentId} - Status: ${dto.status}`);
    return updated;
  }

  /**
   * Get documents by filter (Admin dashboard)
   */
  async getDocuments(filter: DocumentFilterDto): Promise<DocumentRecord[]> {
    const db = this.firebaseAdminService.firestore();
    let query = db.collection('aggregator_documents');

    if (filter.aggregatorUid) {
      query = query.where('aggregatorUid', '==', filter.aggregatorUid) as any;
    }

    if (filter.status) {
      query = query.where('status', '==', filter.status) as any;
    }

    if (filter.type) {
      query = query.where('type', '==', filter.type) as any;
    }

    const snapshot = await query.get();
    let documents = snapshot.docs.map((doc) => doc.data() as DocumentRecord);

    // Filter expiring documents
    if (filter.expiringWithinDays) {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + filter.expiringWithinDays);
      
      documents = documents.filter((doc) => {
        if (!doc.expiryDate) return false;
        const expiryDate = new Date(doc.expiryDate);
        return expiryDate <= expiryThreshold && expiryDate >= new Date();
      });
    }

    return documents;
  }

  /**
   * Get pending documents for review (Admin dashboard)
   */
  async getPendingDocuments(): Promise<DocumentRecord[]> {
    return this.getDocuments({ status: DocumentStatus.PENDING });
  }

  /**
   * Get expiring documents (Admin alert)
   */
  async getExpiringDocuments(daysThreshold: number = 30): Promise<DocumentRecord[]> {
    const documents = await this.getDocuments({
      status: DocumentStatus.VERIFIED,
      expiringWithinDays: daysThreshold,
    });

    // Mark as expired if already past expiry
    for (const doc of documents) {
      if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
        await this.markDocumentExpired(doc.id);
      }
    }

    return documents;
  }

  /**
   * Mark document as expired
   */
  async markDocumentExpired(documentId: string): Promise<void> {
    const db = this.firebaseAdminService.firestore();
    
    await db.collection('aggregator_documents').doc(documentId).update({
      status: DocumentStatus.EXPIRED,
      updatedAt: new Date().toISOString(),
    });

    const documentDoc = await db.collection('aggregator_documents').doc(documentId).get();
    const document = documentDoc.data() as DocumentRecord;

    // Clear cache
    await this.cacheService.delete(`documents:aggregator:${document.aggregatorUid}`);

    // Emit event for aggregator notification
    this.eventEmitter.emit('document.expired', {
      aggregatorUid: document.aggregatorUid,
      documentType: document.type,
      documentId,
    });

    this.logger.log(`Document marked as expired: ${documentId}`);
  }

  /**
   * Get documents for specific aggregator
   */
  async getAggregatorDocuments(aggregatorUid: string): Promise<DocumentRecord[]> {
    const cacheKey = `documents:aggregator:${aggregatorUid}`;
    const cached = await this.cacheService.get<DocumentRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const documents = await this.getDocuments({ aggregatorUid });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, documents, 5 * 60 * 1000);

    return documents;
  }

  /**
   * Check if all required documents are verified
   */
  private async checkAndUpdateAggregatorVerificationStatus(aggregatorUid: string): Promise<void> {
    const documents = await this.getAggregatorDocuments(aggregatorUid);
    
    const requiredDocTypes = [
      DocumentType.AADHAAR,
      DocumentType.PAN,
      DocumentType.BANK_STATEMENT,
    ];

    const allRequiredVerified = requiredDocTypes.every((type) =>
      documents.some((doc) => doc.type === type && doc.status === DocumentStatus.VERIFIED),
    );

    if (allRequiredVerified) {
      const db = this.firebaseAdminService.firestore();
      await db.collection(ROOT_COLLECTIONS.users).doc(aggregatorUid).update({
        'verification.isVerified': true,
        'verification.verifiedAt': new Date().toISOString(),
        adminApproval: true,
        status: 'active',
        updatedAt: new Date().toISOString(),
      });

      this.logger.log(`Aggregator fully verified: ${aggregatorUid}`);
      
      // Emit event
      this.eventEmitter.emit('aggregator.verified', { aggregatorUid });
    }
  }

  /**
   * Get document verification summary for aggregator
   */
  async getVerificationSummary(aggregatorUid: string): Promise<{
    totalDocuments: number;
    verified: number;
    pending: number;
    rejected: number;
    expired: number;
    isFullyVerified: boolean;
    missingDocuments: DocumentType[];
  }> {
    const documents = await this.getAggregatorDocuments(aggregatorUid);

    const requiredDocTypes = [
      DocumentType.AADHAAR,
      DocumentType.PAN,
      DocumentType.BANK_STATEMENT,
    ];

    const uploadedTypes = documents.map((d) => d.type);
    const missingDocuments = requiredDocTypes.filter((type) => !uploadedTypes.includes(type));

    return {
      totalDocuments: documents.length,
      verified: documents.filter((d) => d.status === DocumentStatus.VERIFIED).length,
      pending: documents.filter((d) => d.status === DocumentStatus.PENDING).length,
      rejected: documents.filter((d) => d.status === DocumentStatus.REJECTED).length,
      expired: documents.filter((d) => d.status === DocumentStatus.EXPIRED).length,
      isFullyVerified: requiredDocTypes.every((type) =>
        documents.some((doc) => doc.type === type && doc.status === DocumentStatus.VERIFIED),
      ),
      missingDocuments,
    };
  }
}
