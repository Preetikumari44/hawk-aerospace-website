/**
 * Google Maps Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService], // Export for use in other modules (e.g., booking module)
})
export class MapsModule {}
