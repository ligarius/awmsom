import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReplenishmentService } from './replenishment.service';

@Processor('replenishment-queue')
export class ReplenishmentProcessor {
  constructor(private readonly replenishmentService: ReplenishmentService) {}

  @Process('evaluate')
  async handleReplenishment(job: Job<{ tenantId: string }>) {
    if (!job.data?.tenantId) return;
    await this.replenishmentService.evaluateReplenishment(job.data.tenantId, {});
  }
}
