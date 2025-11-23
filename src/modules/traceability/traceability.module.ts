import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraceabilityService } from './traceability.service';
import { TraceabilityController } from './traceability.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [TraceabilityService, TenantContextService],
  controllers: [TraceabilityController],
})
export class TraceabilityModule {}
