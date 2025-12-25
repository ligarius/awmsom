import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { SaasTenantsController } from './saas-tenants.controller';
import { SaasAdminController } from './saas-admin.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, OnboardingModule, UsersModule, RbacModule, MonitoringModule],
  controllers: [TenantsController, SaasTenantsController, SaasAdminController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
