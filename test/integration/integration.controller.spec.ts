import { IntegrationController } from '../../src/modules/integration/integration.controller';
import { ConsumeEventDto } from '../../src/modules/integration/dto/consume-event.dto';
import { ErpOrderDto } from '../../src/modules/integration/dto/erp-order.dto';
import { PublishEventDto } from '../../src/modules/integration/dto/publish-event.dto';
import { PurchaseWebhookDto } from '../../src/modules/integration/dto/purchase-webhook.dto';
import { SaleWebhookDto } from '../../src/modules/integration/dto/sale-webhook.dto';
import { TmsShipmentDto } from '../../src/modules/integration/dto/tms-shipment.dto';
import { ErpConnectorService } from '../../src/modules/integration/services/erp-connector.service';
import { EventQueueService } from '../../src/modules/integration/services/event-queue.service';
import { TmsConnectorService } from '../../src/modules/integration/services/tms-connector.service';
import { WebhookService } from '../../src/modules/integration/services/webhook.service';

describe('IntegrationController', () => {
  let controller: IntegrationController;
  let eventQueueService: jest.Mocked<EventQueueService>;
  let webhookService: jest.Mocked<WebhookService>;
  let erpConnectorService: jest.Mocked<ErpConnectorService>;
  let tmsConnectorService: jest.Mocked<TmsConnectorService>;

  beforeEach(() => {
    eventQueueService = {
      publish: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<EventQueueService>;

    webhookService = {
      handlePurchase: jest.fn(),
      handleSale: jest.fn(),
    } as unknown as jest.Mocked<WebhookService>;

    erpConnectorService = {
      sendOrder: jest.fn(),
    } as unknown as jest.Mocked<ErpConnectorService>;

    tmsConnectorService = {
      notifyShipment: jest.fn(),
    } as unknown as jest.Mocked<TmsConnectorService>;

    controller = new IntegrationController(
      eventQueueService,
      webhookService,
      erpConnectorService,
      tmsConnectorService,
    );
  });

  it('publishes events to the queue adapter', () => {
    const dto: PublishEventDto = { eventType: 'inventory.updated', payload: { sku: 'ABC' } };
    (eventQueueService.publish as jest.Mock).mockReturnValue({ status: 'published' });

    const result = controller.publishEvent(dto);

    expect(eventQueueService.publish).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 'published' });
  });

  it('consumes events coming from queues', () => {
    const dto: ConsumeEventDto = { source: 'warehouse.topic', payload: { message: 'ok' } };
    (eventQueueService.consume as jest.Mock).mockReturnValue({ status: 'consumed' });

    const result = controller.consumeEvent(dto);

    expect(eventQueueService.consume).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 'consumed' });
  });

  it('handles purchase webhooks', () => {
    const dto: PurchaseWebhookDto = { reference: 'PO-1', totalAmount: 123 };
    (webhookService.handlePurchase as jest.Mock).mockReturnValue({ acknowledged: true });

    const result = controller.handlePurchaseWebhook(dto);

    expect(webhookService.handlePurchase).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ acknowledged: true });
  });

  it('handles sales webhooks', () => {
    const dto: SaleWebhookDto = { orderNumber: 'SO-1', totalAmount: 456 };
    (webhookService.handleSale as jest.Mock).mockReturnValue({ acknowledged: true });

    const result = controller.handleSaleWebhook(dto);

    expect(webhookService.handleSale).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ acknowledged: true });
  });

  it('sends orders to ERP connectors', () => {
    const dto: ErpOrderDto = { orderId: 'SO-1', targetSystem: 'SAP', totalAmount: 789 };
    (erpConnectorService.sendOrder as jest.Mock).mockReturnValue({ delivered: true });

    const result = controller.sendErpOrder(dto);

    expect(erpConnectorService.sendOrder).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ delivered: true });
  });

  it('notifies shipments to TMS connectors', () => {
    const dto: TmsShipmentDto = { trackingCode: 'TRK-1', carrier: 'CarrierX' };
    (tmsConnectorService.notifyShipment as jest.Mock).mockReturnValue({ delivered: true });

    const result = controller.sendTmsShipment(dto);

    expect(tmsConnectorService.notifyShipment).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ delivered: true });
  });
});
