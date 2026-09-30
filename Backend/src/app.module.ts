import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './common/cache/cache.module';
import { getEnvFilePaths, validateEnv } from './common/config/app.config';
import { buildMongoConnectionOptions } from './common/config/mongodb.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { QuotaErrorInterceptor } from './common/interceptors/quota-error.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { FirebaseModule } from './firebase/firebase.module';
import { GatewayModule } from './gateway/gateway.module';
import { AdminModule } from './modules/admin/admin.module';
import { AggregatorModule } from './modules/aggregator/aggregator.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingModule } from './modules/booking/booking.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { IncidentModule } from './modules/incident/incident.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PilotModule } from './modules/pilot/pilot.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { RewardModule } from './modules/reward/reward.module';
import { RoleApplicationsModule } from './modules/role-applications/role-applications.module';
import { ServiceCentreModule } from './modules/service-centre/service-centre.module';
import { SubAdminModule } from './modules/subadmin/subadmin.module';
import { SyncModule } from './modules/sync/sync.module';
import { TechnicianModule } from './modules/technician/technician.module';
import { UsersModule } from './modules/users/users.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { CustomerModule } from './modules/customer/customer.module';
import { MapsModule } from './modules/maps/maps.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FlightConditionsModule } from './modules/flight-conditions/flight-conditions.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { FarmModule } from './modules/farm/farm.module';
import { ChatModule } from './modules/chat/chat.module';
import { UpdateModule } from './modules/update/update.module';
import { RefundModule } from './modules/refund/refund.module';
import { PayoutModule } from './modules/payout/payout.module';
import { ReferralModule } from './modules/referral/referral.module';
import { TeamModule } from './modules/team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: getEnvFilePaths(),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => buildMongoConnectionOptions(configService),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    CacheModule, // Global cache module with Redis/in-memory support
    ScheduleModule.forRoot(), // Single scheduler registration (complaint SLA + booking expiry crons)
    FirebaseModule,
    GatewayModule,
    UsersModule,
    AuthModule,
    PricingModule,
    BookingModule,
    VendorModule,
    PilotModule,
    AggregatorModule,
    CustomerModule,
    FleetModule,
    ServiceCentreModule,
    IncidentModule,
    PaymentModule,
    NotificationModule,
    CouponModule,
    RewardModule,
    TechnicianModule,
    AdminModule,
    SubAdminModule,
    RevenueModule,
    // SyncModule, // Temporarily disabled - requires MongoDB connection
    FileStorageModule,
    MarketplaceModule,
    MapsModule,
    FlightConditionsModule, // Shared weather + airspace pre-flight checks
    DashboardModule, // Re-enabled now that MongoDB connection is fixed
    ComplaintModule, // Unified complaint management across all roles
    FarmModule, // Farm management for customers
    ChatModule, // Chat and messaging system
    RoleApplicationsModule, // Role application + admin approval flow
    UpdateModule, // APK auto-update version check endpoint
    RefundModule, // Refund processing and tracking
    PayoutModule, // Payout methods, withdrawals, and earnings
    ReferralModule, // Refer & Earn: codes, invites, wallet, rules
    TeamModule, // FM ↔ pilot team invites and join requests
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: QuotaErrorInterceptor, // Global quota error handler
    },
  ],
})
export class AppModule {}
