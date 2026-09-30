import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

import { FirebaseAdminService } from './firebase/firebase-admin.service';

@Injectable()
export class AppService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  getHealth() {
    return {
      service: 'hawk-super-app-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
      integrations: {
        firebaseAdminConfigured: this.firebaseAdminService.isEnabled(),
        mongoReadyState: this.mongoConnection.readyState,
      },
    };
  }
}
