export class InboundReceiptLine {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly uom: string,
    public readonly batchCode?: string,
    public readonly expiryDate?: Date,
  ) {
    if (quantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
  }
}
