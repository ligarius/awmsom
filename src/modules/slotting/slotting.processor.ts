import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SlottingService } from './slotting.service';

@Processor('slotting-queue')
export class SlottingProcessor extends WorkerHost {
  constructor(private readonly slottingService: SlottingService) {
    super();
  }

  async process(job: Job<{ tenantId: string; warehouseId?: string; productId?: string; force?: boolean }>) {
    if (job.name !== 'calculate') {
      return;
    }
    if (!job.data?.tenantId) return;
    const { tenantId, ...payload } = job.data;
    await this.slottingService.calculateSlotting(tenantId, payload as any);
  }
}
