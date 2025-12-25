import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { KpiType } from '@prisma/client';
import { SnapshotsService } from './snapshots.service';

@Processor('inventory-snapshot-queue')
export class InventorySnapshotProcessor extends WorkerHost {
  constructor(private readonly snapshotsService: SnapshotsService) {
    super();
  }

  async process(job: Job<{ tenantId: string; snapshotDate?: string }>) {
    if (job.name !== 'inventory-snapshot') {
      return;
    }
    const snapshotDate = job.data.snapshotDate ? new Date(job.data.snapshotDate) : new Date();
    return this.snapshotsService.generateInventorySnapshotForTenant(job.data.tenantId, snapshotDate);
  }
}

@Processor('kpi-snapshot-queue')
export class KpiSnapshotProcessor extends WorkerHost {
  constructor(private readonly snapshotsService: SnapshotsService) {
    super();
  }

  async process(
    job: Job<{ tenantId: string; kpiType: KpiType; periodStart: string; periodEnd: string; warehouseId?: string }>,
  ) {
    if (job.name !== 'kpi-snapshot') {
      return;
    }
    return this.snapshotsService.generateKpiSnapshotForTenant(
      job.data.tenantId,
      job.data.kpiType,
      new Date(job.data.periodStart),
      new Date(job.data.periodEnd),
      job.data.warehouseId,
    );
  }
}

export const SnapshotsProcessor = [InventorySnapshotProcessor, KpiSnapshotProcessor];
