import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CustomerController } from './customer.controller';
import { CustomerSelfServiceController } from './customer-self-service.controller';
import { CustomerService } from './customer.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { MapsModule } from '../maps/maps.module';
import { VendorModule } from '../vendor/vendor.module';
import { PricingModule } from '../pricing/pricing.module';
import { FlightConditionsModule } from '../flight-conditions/flight-conditions.module';
import { QuotaErrorInterceptor } from '../../common/interceptors/quota-error.interceptor';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    MapsModule,
    VendorModule,
    PricingModule,
    FlightConditionsModule,
  ],
  controllers: [CustomerController, CustomerSelfServiceController],
  providers: [
    CustomerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: QuotaErrorInterceptor,
    },
  ],
  exports: [CustomerService],
})
export class CustomerModule {}