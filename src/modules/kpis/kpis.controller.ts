import { Controller, Get, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { KpisService } from './kpis.service';
import { KpiQueryDto } from './dto/kpi-query.dto';

@Controller('kpis')
export class KpisController {
  constructor(
    private readonly kpisService: KpisService,
    private readonly tenantContext: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  @Get('summary')
  @Permissions(PermissionResource.REPORTS, PermissionAction.READ)
  async getSummary(@Query() query: KpiQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    await this.audit.recordLog({
      tenantId,
      userId: null,
      resource: 'KPIS',
      action: 'QUERY',
      metadata: { filters: query },
    });
    return this.kpisService.getSummary(tenantId, query);
  }
}
