import { Controller, Get, Query } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('events')
  getEvents() {
    return this.auditService.getEvents();
  }

  @Get('traces')
  getTraces() {
    return this.auditService.getTraces();
  }

  @Get('logs')
  getLogs(@Query('limit') limit?: number) {
    const tenantId = this.tenantContext.getTenantId();
    return this.auditService.getLogs(tenantId, limit ? Number(limit) : 100);
  }
}
