import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [KpisService, TenantContextService],
  controllers: [KpisController],
})
export class KpisModule {}
