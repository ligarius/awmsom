import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueuesService {
  constructor(
    @InjectQueue('kpi-snapshot-queue') private readonly kpiSnapshotQueue: Queue,
    @InjectQueue('inventory-snapshot-queue') private readonly inventorySnapshotQueue: Queue,
    @InjectQueue('integration-jobs-queue') private readonly integrationJobsQueue: Queue,
    @InjectQueue('maintenance-queue') private readonly maintenanceQueue: Queue,
    @InjectQueue('replenishment-queue') private readonly replenishmentQueue: Queue,
    @InjectQueue('slotting-queue') private readonly slottingQueue: Queue,
    @InjectQueue('waves-queue') private readonly wavesQueue: Queue,
  ) {}

  enqueueKpiSnapshotJob(tenantId: string, payload: any) {
    return this.kpiSnapshotQueue.add('kpi-snapshot', { tenantId, ...payload });
  }

  enqueueInventorySnapshotJob(tenantId: string, payload: any) {
    return this.inventorySnapshotQueue.add('inventory-snapshot', { tenantId, ...payload });
  }

  enqueueIntegrationJob(tenantId: string, integrationJobId: string) {
    return this.integrationJobsQueue.add('integration-job', { tenantId, integrationJobId });
  }

  enqueueMaintenanceJob(tenantId: string, payload: any) {
    return this.maintenanceQueue.add('maintenance', { tenantId, ...payload });
  }

  enqueueReplenishmentJob(tenantId: string, payload: any = {}) {
    return this.replenishmentQueue.add('evaluate', { tenantId, ...payload });
  }

  enqueueSlottingJob(tenantId: string, payload: any = {}) {
    return this.slottingQueue.add('calculate', { tenantId, ...payload });
  }

  enqueueWaveGenerationJob(tenantId: string, payload: any = {}) {
    return this.wavesQueue.add('generate', { tenantId, ...payload });
  }
}
