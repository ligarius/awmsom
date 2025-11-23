import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, AuditModule, CacheModule],
  providers: [KpisService, TenantContextService],
  controllers: [KpisController],
  exports: [KpisService],
})
export class KpisModule {}
