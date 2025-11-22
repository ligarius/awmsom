import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  getEvents() {
    return this.auditService.getEvents();
  }

  @Get('traces')
  getTraces() {
    return this.auditService.getTraces();
  }
}
