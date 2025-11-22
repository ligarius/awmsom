import { Body, Controller, Post } from '@nestjs/common';
import { ConsumeEventDto } from './dto/consume-event.dto';
import { ErpOrderDto } from './dto/erp-order.dto';
import { PublishEventDto } from './dto/publish-event.dto';
import { PurchaseWebhookDto } from './dto/purchase-webhook.dto';
import { SaleWebhookDto } from './dto/sale-webhook.dto';
import { TmsShipmentDto } from './dto/tms-shipment.dto';
import { ErpConnectorService } from './services/erp-connector.service';
import { EventQueueService } from './services/event-queue.service';
import { TmsConnectorService } from './services/tms-connector.service';
import { WebhookService } from './services/webhook.service';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly eventQueueService: EventQueueService,
    private readonly webhookService: WebhookService,
    private readonly erpConnectorService: ErpConnectorService,
    private readonly tmsConnectorService: TmsConnectorService,
  ) {}

  @Post('events/publish')
  publishEvent(@Body() dto: PublishEventDto) {
    return this.eventQueueService.publish(dto);
  }

  @Post('events/consume')
  consumeEvent(@Body() dto: ConsumeEventDto) {
    return this.eventQueueService.consume(dto);
  }

  @Post('webhooks/purchases')
  handlePurchaseWebhook(@Body() dto: PurchaseWebhookDto) {
    return this.webhookService.handlePurchase(dto);
  }

  @Post('webhooks/sales')
  handleSaleWebhook(@Body() dto: SaleWebhookDto) {
    return this.webhookService.handleSale(dto);
  }

  @Post('connectors/erp/orders')
  sendErpOrder(@Body() dto: ErpOrderDto) {
    return this.erpConnectorService.sendOrder(dto);
  }

  @Post('connectors/tms/shipments')
  sendTmsShipment(@Body() dto: TmsShipmentDto) {
    return this.tmsConnectorService.notifyShipment(dto);
  }
}
