import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { KpisModule } from '../kpis/kpis.module';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsProcessor } from './snapshots.processor';
import { QueuesModule } from '../../infrastructure/queues/queues.module';
import { PaginationService } from '../../common/pagination/pagination.service';
import { SnapshotsController } from './snapshots.controller';
import { TenantContextService } from '../../common/tenant-context.service';

@Module({
  imports: [
    PrismaModule,
    KpisModule,
    QueuesModule,
    BullModule.registerQueue({ name: 'inventory-snapshot-queue' }, { name: 'kpi-snapshot-queue' }),
  ],
  providers: [SnapshotsService, ...SnapshotsProcessor, PaginationService, TenantContextService],
  controllers: [SnapshotsController],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
