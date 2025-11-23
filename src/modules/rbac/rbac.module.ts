import { Module } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RbacReviewScheduler } from './rbac.review.scheduler';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RbacController],
  providers: [RbacService, TenantContextService, RbacReviewScheduler],
  exports: [RbacService],
})
export class RbacModule {}
