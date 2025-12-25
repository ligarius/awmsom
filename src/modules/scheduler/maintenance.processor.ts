import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('maintenance-queue')
export class MaintenanceProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ tenantId: string; action: string; olderThanDays?: number }>) {
    if (job.name !== 'maintenance') {
      return;
    }
    if (job.data.action === 'cleanup-audit-logs') {
      const olderThanDays = job.data.olderThanDays ?? 365;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - olderThanDays);
      await this.prisma.auditLog.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
      await this.prisma.kpiSnapshot.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
      await this.prisma.inventorySnapshot.deleteMany({ where: { tenantId: job.data.tenantId, createdAt: { lt: threshold } } });
    } else if (job.data.action === 'purge-expired-audit-logs') {
      const retentionWindow = job.data.olderThanDays ?? 365;
      const fallbackThreshold = new Date();
      fallbackThreshold.setDate(fallbackThreshold.getDate() - retentionWindow);
      await this.prisma.auditLog.deleteMany({
        where: {
          tenantId: job.data.tenantId,
          OR: [
            { expiresAt: { lte: new Date() } },
            { expiresAt: null, createdAt: { lt: fallbackThreshold } },
          ],
        },
      });
    }
  }
}
