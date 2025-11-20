import { InboundReceipt } from '../entities/inbound-receipt.entity';

export const INBOUND_RECEIPT_REPOSITORY = 'INBOUND_RECEIPT_REPOSITORY';

export interface InboundReceiptRepository {
  create(receipt: InboundReceipt): Promise<InboundReceipt>;
  findEarliestExpiry(productId: string): Promise<Date | null>;
}
