import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { ErpConnectorService } from './services/erp-connector.service';
import { EventQueueService } from './services/event-queue.service';
import { TmsConnectorService } from './services/tms-connector.service';
import { WebhookService } from './services/webhook.service';

@Module({
  controllers: [IntegrationController],
  providers: [EventQueueService, WebhookService, ErpConnectorService, TmsConnectorService],
})
export class IntegrationModule {}
