import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KpiType } from '@prisma/client';
import { QueuesService } from '../../infrastructure/queues/queues.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly queues: QueuesService, private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async enqueueInventorySnapshots() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    const snapshotDate = new Date();
    await Promise.all(
      tenants.map((tenant) =>
        this.queues.enqueueInventorySnapshotJob(tenant.id, { snapshotDate: snapshotDate.toISOString() }),
      ),
    );
    this.logger.log(`Scheduled inventory snapshots for ${tenants.length} tenants`);
  }

  @Cron('0 3 * * *')
  async enqueueDailyKpis() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 1);
    await Promise.all(
      tenants.map((tenant) =>
        this.queues.enqueueKpiSnapshotJob(tenant.id, {
          kpiType: KpiType.DAILY,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        }),
      ),
    );
    this.logger.log(`Scheduled KPI snapshots for ${tenants.length} tenants`);
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async enqueueMaintenance() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    await Promise.all(
      tenants.map((tenant) =>
        this.queues.enqueueMaintenanceJob(tenant.id, { action: 'cleanup-audit-logs', olderThanDays: 365 }),
      ),
    );
    this.logger.log(`Scheduled maintenance jobs for ${tenants.length} tenants`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async enqueueExpiredAuditLogPurge() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    const retentionDays = Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? 365);
    await Promise.all(
      tenants.map((tenant) =>
        this.queues.enqueueMaintenanceJob(tenant.id, {
          action: 'purge-expired-audit-logs',
          olderThanDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 365,
        }),
      ),
    );
    this.logger.log(`Scheduled audit log purge for ${tenants.length} tenants`);
  }

  @Cron('0 4 * * *')
  async enqueueDailyReplenishment() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    await Promise.all(tenants.map((tenant) => this.queues.enqueueReplenishmentJob(tenant.id, {})));
    this.logger.log(`Scheduled replenishment for ${tenants.length} tenants`);
  }

  @Cron('30 2 * * *')
  async enqueueDailySlotting() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    await Promise.all(tenants.map((tenant) => this.queues.enqueueSlottingJob(tenant.id, {})));
    this.logger.log(`Scheduled slotting for ${tenants.length} tenants`);
  }
}
