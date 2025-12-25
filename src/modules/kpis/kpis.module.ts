import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { KpiLegacyController } from './kpi-legacy.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../common/cache/cache.module';
import { KpiLegacyService } from './kpi-legacy.service';

@Module({
  imports: [PrismaModule, AuditModule, CacheModule],
  providers: [KpisService, KpiLegacyService, TenantContextService],
  controllers: [KpisController, KpiLegacyController],
  exports: [KpisService],
})
export class KpisModule {}
