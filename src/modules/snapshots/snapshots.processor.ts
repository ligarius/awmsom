import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { KpiType } from '@prisma/client';
import { SnapshotsService } from './snapshots.service';

@Processor('inventory-snapshot-queue')
export class InventorySnapshotProcessor {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Process('inventory-snapshot')
  handleInventorySnapshot(job: Job<{ tenantId: string; snapshotDate?: string }>) {
    const snapshotDate = job.data.snapshotDate ? new Date(job.data.snapshotDate) : new Date();
    return this.snapshotsService.generateInventorySnapshotForTenant(job.data.tenantId, snapshotDate);
  }
}

@Processor('kpi-snapshot-queue')
export class KpiSnapshotProcessor {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Process('kpi-snapshot')
  handleKpiSnapshot(job: Job<{ tenantId: string; kpiType: KpiType; periodStart: string; periodEnd: string; warehouseId?: string }>) {
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
