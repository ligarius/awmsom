import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReplenishmentService } from './replenishment.service';

@Processor('replenishment-queue')
export class ReplenishmentProcessor extends WorkerHost {
  constructor(private readonly replenishmentService: ReplenishmentService) {
    super();
  }

  async process(job: Job<{ tenantId: string }>) {
    if (job.name !== 'evaluate') {
      return;
    }
    if (!job.data?.tenantId) return;
    await this.replenishmentService.evaluateReplenishment(job.data.tenantId, {});
  }
}
