import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SlottingService } from './slotting.service';

@Processor('slotting-queue')
export class SlottingProcessor {
  constructor(private readonly slottingService: SlottingService) {}

  @Process('calculate')
  async handleSlotting(job: Job<{ tenantId: string; warehouseId?: string; productId?: string; force?: boolean }>) {
    if (!job.data?.tenantId) return;
    const { tenantId, ...payload } = job.data;
    await this.slottingService.calculateSlotting(tenantId, payload as any);
  }
}
