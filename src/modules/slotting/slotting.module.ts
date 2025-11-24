import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';
import { AuditModule } from '../audit/audit.module';
import { SlottingService } from './slotting.service';
import { SlottingController } from './slotting.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { SlottingProcessor } from './slotting.processor';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule, BullModule.registerQueue({ name: 'slotting-queue' })],
  controllers: [SlottingController],
  providers: [SlottingService, TenantContextService, SlottingProcessor],
  exports: [SlottingService],
})
export class SlottingModule {}
