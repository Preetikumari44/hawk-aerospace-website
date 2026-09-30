import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BookingModule } from '../booking/booking.module';
import { UsersModule } from '../users/users.module';
import { MapsModule } from '../maps/maps.module';
import { IncidentModule } from '../incident/incident.module';
import { NotificationModule } from '../notification/notification.module';
import { AggregatorController } from './aggregator.controller';
import { AggregatorService } from './aggregator.service';
import { SAManagementController } from './sa-management.controller';
import { SAManagementService } from './sa-management.service';
import { TerritoryController } from './controllers/territory.controller';
import { TerritoryService } from './services/territory.service';
import { DocumentVerificationController } from './controllers/document-verification.controller';
import { DocumentVerificationService } from './services/document-verification.service';
import { ConsentController } from './controllers/consent.controller';
import { ConsentService } from './services/consent.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [AuthModule, BookingModule, UsersModule, MapsModule, IncidentModule, NotificationModule],
  controllers: [
    AggregatorController,
    SAManagementController,
    TerritoryController,
    DocumentVerificationController,
    ConsentController,
    AnalyticsController,
  ],
  providers: [
    AggregatorService,
    SAManagementService,
    TerritoryService,
    DocumentVerificationService,
    ConsentService,
    AnalyticsService,
  ],
  exports: [
    AggregatorService,
    SAManagementService,
    TerritoryService,
    DocumentVerificationService,
    ConsentService,
    AnalyticsService,
  ],
})
export class AggregatorModule {}
