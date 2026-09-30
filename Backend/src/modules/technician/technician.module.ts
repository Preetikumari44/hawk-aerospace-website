import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { UsersModule } from '../users/users.module';
import { TechnicianController } from './technician.controller';
import { TechnicianService } from './technician.service';

@Module({
  imports: [UsersModule, EventEmitterModule.forRoot()],
  controllers: [TechnicianController],
  providers: [TechnicianService],
  exports: [TechnicianService],
})
export class TechnicianModule {}
