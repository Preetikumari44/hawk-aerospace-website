import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { FirebaseAdminService } from '../../firebase/firebase-admin.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.firebaseAdminService.isEnabled()) {
      throw new ServiceUnavailableException('Firebase Admin is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request & { firebaseUser?: unknown }>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Firebase bearer token.');
    }

    const token = authorizationHeader.replace('Bearer ', '').trim();
    request.firebaseUser = await this.firebaseAdminService.auth().verifyIdToken(token);

    return true;
  }
}
