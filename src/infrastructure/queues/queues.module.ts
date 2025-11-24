import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';

const queueNames = [
  'kpi-snapshot-queue',
  'inventory-snapshot-queue',
  'integration-jobs-queue',
  'maintenance-queue',
  'replenishment-queue',
  'slotting-queue',
  'waves-queue',
];

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          db: config.get<number>('REDIS_DB', 0),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      ...queueNames.map((name) => ({ name, defaultJobOptions: { removeOnComplete: true, attempts: 1 } })),
    ),
  ],
  providers: [QueuesService],
  exports: [QueuesService, BullModule],
})
export class QueuesModule {}
