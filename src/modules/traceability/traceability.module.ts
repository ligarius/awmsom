import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraceabilityService } from './traceability.service';
import { TraceabilityController } from './traceability.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../common/cache/cache.module';
import { PaginationService } from '../../common/pagination/pagination.service';

@Module({
  imports: [PrismaModule, AuditModule, CacheModule],
  providers: [TraceabilityService, TenantContextService, PaginationService],
  controllers: [TraceabilityController],
})
export class TraceabilityModule {}
