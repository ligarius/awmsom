import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { AuditModule } from './modules/audit/audit.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ConfigModule as TenantConfigModule } from './modules/config/config.module';
import { TenantGuard } from './guards/tenant.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RbacModule } from './modules/rbac/rbac.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ExternalModule } from './modules/external/external.module';
import { RateLimitService } from './common/rate-limit.service';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PlansModule } from './modules/plans/plans.module';
import { UsageModule } from './modules/usage/usage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    WarehousesModule,
    LocationsModule,
    ProductsModule,
    TenantConfigModule,
    InventoryModule,
    InboundModule,
    OutboundModule,
    IntegrationModule,
    ApiKeysModule,
    IntegrationsModule,
    WebhooksModule,
    ExternalModule,
    AuditModule,
    MonitoringModule,
    RbacModule,
    OnboardingModule,
    PlansModule,
    UsageModule,
  ],
  providers: [
    RateLimitService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
