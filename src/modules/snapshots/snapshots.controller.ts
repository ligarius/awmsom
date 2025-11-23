import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { SnapshotsService } from './snapshots.service';
import { KpiSnapshotQueryDto } from './dto/kpi-snapshot-query.dto';
import { InventorySnapshotQueryDto } from './dto/inventory-snapshot-query.dto';

@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService, private readonly tenantContext: TenantContextService) {}

  @Get('kpis')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getKpiSnapshots(@Query() query: KpiSnapshotQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.snapshotsService.listKpiSnapshots(tenantId, query);
  }

  @Get('inventory')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  getInventorySnapshots(@Query() query: InventorySnapshotQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.snapshotsService.listInventorySnapshots(tenantId, query);
  }
}
