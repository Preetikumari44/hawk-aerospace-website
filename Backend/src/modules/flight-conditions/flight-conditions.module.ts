/**
 * Flight Conditions Module
 *
 * Shared weather + airspace (flying-restriction) pre-flight checks used across the
 * customer, aggregator, pilot and fleet booking flows. Exports both services so
 * any module can inject them directly (e.g. BookingService).
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirebaseModule } from '../../firebase/firebase.module';
import { CacheModule } from '../../common/cache/cache.module';
import { MapsModule } from '../maps/maps.module';
import { AirspaceService } from './airspace.service';
import { FlightConditionsController } from './flight-conditions.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [ConfigModule, MapsModule, FirebaseModule, CacheModule],
  controllers: [FlightConditionsController],
  providers: [WeatherService, AirspaceService],
  exports: [WeatherService, AirspaceService],
})
export class FlightConditionsModule {}
