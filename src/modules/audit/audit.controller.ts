import { Controller, Get, Query } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from './audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuditExportQueryDto } from './dto/audit-export-query.dto';

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
  getLogs(@Query() query: PaginationDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.auditService.getLogs(tenantId, query.page, query.limit);
  }

  @Get('exports/logs')
  exportLogs(@Query() query: AuditExportQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    const start = query.start ? new Date(query.start) : undefined;
    const end = query.end ? new Date(query.end) : undefined;
    return this.auditService.getLogs(tenantId, query.page, query.limit, start, end);
  }

  @Get('exports/access-reviews')
  exportAccessReviews(@Query() query: AuditExportQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    const start = query.start ? new Date(query.start) : undefined;
    const end = query.end ? new Date(query.end) : undefined;
    return this.auditService.exportAccessReviews(tenantId, start, end);
  }
}
