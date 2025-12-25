import { Controller, Get } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { KpiLegacyService } from './kpi-legacy.service';

@Controller('kpi')
export class KpiLegacyController {
  constructor(
    private readonly legacyService: KpiLegacyService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('executive')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getExecutive() {
    const tenantId = this.tenantContext.getTenantId();
    return this.legacyService.getExecutive(tenantId);
  }

  @Get('operations')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getOperations() {
    const tenantId = this.tenantContext.getTenantId();
    return this.legacyService.getOperations(tenantId);
  }

  @Get('inventory')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getInventory() {
    const tenantId = this.tenantContext.getTenantId();
    return this.legacyService.getInventory(tenantId);
  }

  @Get('performance')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getPerformance() {
    const tenantId = this.tenantContext.getTenantId();
    return this.legacyService.getPerformance(tenantId);
  }
}
