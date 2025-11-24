import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { QueuesModule } from '../../infrastructure/queues/queues.module';
import { IntegrationsProcessor } from './integrations.processor';
import { PaginationService } from '../../common/pagination/pagination.service';
import { ErpConnectorService } from '../integration/services/erp-connector.service';
import { TmsConnectorService } from '../integration/services/tms-connector.service';

@Module({
  imports: [PrismaModule, AuditModule, QueuesModule, BullModule.registerQueue({ name: 'integration-jobs-queue' })],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsProcessor, PaginationService, ErpConnectorService, TmsConnectorService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
