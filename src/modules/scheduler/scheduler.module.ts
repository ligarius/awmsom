import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { QueuesModule } from '../../infrastructure/queues/queues.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MaintenanceProcessor } from './maintenance.processor';

@Module({
  imports: [ScheduleModule.forRoot(), BullModule.registerQueue({ name: 'maintenance-queue' }), QueuesModule, PrismaModule],
  providers: [SchedulerService, MaintenanceProcessor],
})
export class SchedulerModule {}
