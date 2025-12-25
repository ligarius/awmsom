import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WavesService } from './waves.service';
import { WavePickingStrategy } from '@prisma/client';

@Processor('waves-queue')
export class WavesProcessor extends WorkerHost {
  constructor(private readonly wavesService: WavesService) {
    super();
  }

  async process(
    job: Job<{
      tenantId: string;
      warehouseId: string;
      strategy: WavePickingStrategy;
      timeWindowFrom?: string;
      timeWindowTo?: string;
    }>,
  ) {
    if (job.name !== 'generate') {
      return;
    }
    if (!job.data?.tenantId) return;
    const { tenantId, ...payload } = job.data;
    await this.wavesService.generateWaves(tenantId, payload as any);
  }
}
