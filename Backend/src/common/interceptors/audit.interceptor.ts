import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { tap, type Observable } from 'rxjs';

import { USER_SUBCOLLECTIONS } from '../constants/collection-paths.constant';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import type { FirestoreAdminActionDocument } from '../../database/firestore/contracts';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    const shouldAudit =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
      (role === 'admin' || role === 'subadmin');

    if (!shouldAudit) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `Administrative action: ${role} ${request.method} ${request.originalUrl} (${request.user.uid})`,
        );
        void this.recordAction(request).catch((error: unknown) => {
          this.logger.warn(
            `Failed to persist administrative action: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
      }),
    );
  }

  private async recordAction(request: AuthenticatedRequest): Promise<void> {
    if (!request.user) {
      return;
    }

    const firestore = this.firebaseAdminService.firestore();
    const ref = firestore
      .collection('users')
      .doc(request.user.uid)
      .collection(USER_SUBCOLLECTIONS.adminActions)
      .doc();
    const now = new Date().toISOString();
    const requestParams = request.params as Record<string, string | undefined>;
    const targetId =
      requestParams.uid ??
      requestParams.id ??
      requestParams.bookingId ??
      requestParams.droneId ??
      request.originalUrl;
    const document: FirestoreAdminActionDocument = {
      id: ref.id,
      actionType: `${request.method} ${request.originalUrl}`,
      adminId: request.user.uid,
      targetId,
      status: 'approved',
      remarks: null,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(document);
  }
}
