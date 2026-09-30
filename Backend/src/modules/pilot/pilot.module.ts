import { Module } from '@nestjs/common';

import { BookingModule } from '../booking/booking.module';
import { PricingModule } from '../pricing/pricing.module';
import { UsersModule } from '../users/users.module';
import { MissionService } from './mission/mission.service';
import { PilotController } from './pilot.controller';
import { PilotService } from './pilot.service';
import { PilotAdminController } from './pilot-admin.controller';
import { PilotAdminService } from './pilot-admin.service';
import { PilotApplicationController } from './pilot-application.controller';
import { PilotApplicationService } from './services/pilot-application.service';

@Module({
  imports: [BookingModule, PricingModule, UsersModule],
  controllers: [PilotController, PilotAdminController, PilotApplicationController],
  providers: [PilotService, MissionService, PilotAdminService, PilotApplicationService],
  exports: [PilotService, MissionService, PilotAdminService, PilotApplicationService],
})
export class PilotModule {}
