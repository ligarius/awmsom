import { Injectable } from '@nestjs/common';
import { PurchaseWebhookDto } from '../dto/purchase-webhook.dto';
import { SaleWebhookDto } from '../dto/sale-webhook.dto';

@Injectable()
export class WebhookService {
  handlePurchase(dto: PurchaseWebhookDto) {
    return {
      acknowledged: true,
      kind: 'purchase',
      reference: dto.reference,
      totalAmount: dto.totalAmount,
      supplierName: dto.supplierName,
    };
  }

  handleSale(dto: SaleWebhookDto) {
    return {
      acknowledged: true,
      kind: 'sale',
      orderNumber: dto.orderNumber,
      totalAmount: dto.totalAmount,
      customerName: dto.customerName,
    };
  }
}
