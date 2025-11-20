import { InboundReceiptLine } from './inbound-receipt-line.entity';

export class InboundReceipt {
  constructor(
    public readonly reference: string | undefined,
    public readonly lines: InboundReceiptLine[],
    public readonly id?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly createdBy?: string,
    public readonly updatedBy?: string,
  ) {
    if (!lines.length) {
      throw new Error('El recibo debe contener al menos una línea');
    }
  }
}
