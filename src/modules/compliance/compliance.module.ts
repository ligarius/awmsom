import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantContextService } from '../../common/tenant-context.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ComplianceScopeGuard } from './guards/compliance-scope.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, TenantContextService, ComplianceScopeGuard],
  exports: [ComplianceService],
})
export class ComplianceModule {}
