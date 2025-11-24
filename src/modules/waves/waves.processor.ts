import { Process, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WavesService } from './waves.service';
import { WavePickingStrategy } from '@prisma/client';

@Processor('waves-queue')
export class WavesProcessor {
  constructor(private readonly wavesService: WavesService) {}

  @Process('generate')
  async handleGenerate(job: Job<{ tenantId: string; warehouseId: string; strategy: WavePickingStrategy; timeWindowFrom?: string; timeWindowTo?: string }>) {
    if (!job.data?.tenantId) return;
    const { tenantId, ...payload } = job.data;
    await this.wavesService.generateWaves(tenantId, payload as any);
  }
}
