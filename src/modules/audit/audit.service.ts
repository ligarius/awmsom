import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogInput } from './audit.interfaces';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly events: any[] = [];
  private readonly traces: any[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async recordLog(entry: AuditLogInput) {
    try {
      const metadata =
        entry.metadata === undefined
          ? undefined
          : (JSON.parse(JSON.stringify(entry.metadata)) as Prisma.InputJsonValue);
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          resource: entry.resource,
          action: entry.action,
          entityId: entry.entityId,
          metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to persist audit log: ${String(error)}`);
    }
  }

  async getLogs(tenantId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  recordEvent(event: any) {
    this.events.push(event);
  }

  recordTrace(trace: any) {
    this.traces.push(trace);
  }

  getEvents() {
    return this.events;
  }

  getTraces() {
    return this.traces;
  }
}
