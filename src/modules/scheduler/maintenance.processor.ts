import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('maintenance-queue')
export class MaintenanceProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process('maintenance')
  async handleMaintenance(job: Job<{ tenantId: string; action: string; olderThanDays?: number }>) {
    if (job.data.action === 'cleanup-audit-logs') {
      const olderThanDays = job.data.olderThanDays ?? 365;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - olderThanDays);
      await this.prisma.auditLog.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
      await this.prisma.kpiSnapshot.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
      await this.prisma.inventorySnapshot.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
    }
  }
}
