import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../common/cache/cache.module';
import { WavesService } from './waves.service';
import { WavesController } from './waves.controller';
import { WavesProcessor } from './waves.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'waves-queue' }), AuditModule, CacheModule],
  controllers: [WavesController],
  providers: [WavesService, WavesProcessor],
  exports: [WavesService],
})
export class WavesModule {}
