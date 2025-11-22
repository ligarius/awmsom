import { Injectable } from '@nestjs/common';
import { ErpOrderDto } from '../dto/erp-order.dto';

@Injectable()
export class ErpConnectorService {
  sendOrder(dto: ErpOrderDto) {
    return {
      delivered: true,
      orderId: dto.orderId,
      erpSystem: dto.targetSystem,
      totalAmount: dto.totalAmount,
      currency: dto.currency ?? 'USD',
    };
  }
}
