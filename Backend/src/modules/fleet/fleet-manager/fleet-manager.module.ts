import { Module } from '@nestjs/common';
import { FleetManagerController } from './fleet-manager.controller';
import { FleetManagerService } from './fleet-manager.service';

@Module({
  controllers: [FleetManagerController],
  providers: [FleetManagerService],
  exports: [FleetManagerService],
})
export class FleetManagerModule {}
