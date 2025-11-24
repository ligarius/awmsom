import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WavesService } from './waves.service';
import { WavesController } from './waves.controller';
import { WavesProcessor } from './waves.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../../common/cache/cache.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'waves-queue' })],
  controllers: [WavesController],
  providers: [WavesService, WavesProcessor, PrismaService, TenantContextService, AuditService, CacheService],
  exports: [WavesService],
})
export class WavesModule {}
