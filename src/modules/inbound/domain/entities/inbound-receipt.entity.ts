import { InboundReceiptLine } from './inbound-receipt-line.entity';

export class InboundReceipt {
  constructor(
    public readonly reference: string | undefined,
    public readonly lines: InboundReceiptLine[],
    public readonly id?: string,
  ) {
    if (!lines.length) {
      throw new Error('El recibo debe contener al menos una línea');
    }
  }
}
