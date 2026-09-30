import { Module, forwardRef } from '@nestjs/common';

import { CacheModule } from '../../common/cache/cache.module';
import { BookingModule } from '../booking/booking.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { FleetManagerModule } from './fleet-manager/fleet-manager.module';
import { DronePilotMatchingService } from './services/drone-pilot-matching.service';
import { DroneHealthMonitoringService } from './services/drone-health-monitoring.service';
import { AutomatedMaintenanceTriggerService } from './services/automated-maintenance-trigger.service';
import { FleetManagerMatchingService } from './services/fleet-manager-matching.service';
import { FleetManagerRequestService } from './services/fleet-manager-request.service';
import { FleetManagerRequestController } from './controllers/fleet-manager-request.controller';

@Module({
  imports: [
    FleetManagerModule,
    CacheModule,
    forwardRef(() => BookingModule), // ⭐ Use forwardRef for circular dependency
    UsersModule,
    AuthModule,
  ],
  controllers: [FleetController, FleetManagerRequestController],
  providers: [
    FleetService,
    DronePilotMatchingService,
    DroneHealthMonitoringService,
    AutomatedMaintenanceTriggerService,
    FleetManagerMatchingService,
    FleetManagerRequestService,
  ],
  exports: [
    FleetService,
    FleetManagerModule,
    DronePilotMatchingService,
    DroneHealthMonitoringService,
    AutomatedMaintenanceTriggerService,
    FleetManagerMatchingService,
    FleetManagerRequestService,
  ],
})
export class FleetModule {}

