import { Controller, Get, Query } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from './audit.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

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
}
