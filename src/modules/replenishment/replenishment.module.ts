import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';
import { AuditModule } from '../audit/audit.module';
import { UsageModule } from '../usage/usage.module';
import { ReplenishmentService } from './replenishment.service';
import { ReplenishmentController } from './replenishment.controller';
import { TenantContextService } from '../../common/tenant-context.service';
import { ReplenishmentProcessor } from './replenishment.processor';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule, UsageModule, BullModule.registerQueue({ name: 'replenishment-queue' })],
  controllers: [ReplenishmentController],
  providers: [ReplenishmentService, TenantContextService, ReplenishmentProcessor],
  exports: [ReplenishmentService],
})
export class ReplenishmentModule {}
