import { StockState } from '../enums/stock-state.enum';

export class StockItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly uom: string,
    public readonly locationId: string,
    public readonly lotCode?: string,
    public readonly expirationDate?: Date,
    public readonly stockState: StockState = StockState.AVAILABLE,
    public readonly id?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly createdBy?: string,
    public readonly updatedBy?: string,
  ) {
    if (quantity < 0) {
      throw new Error('El stock no puede ser negativo');
    }
  }

  withQuantity(quantity: number) {
    return new StockItem(
      this.productId,
      quantity,
      this.uom,
      this.locationId,
      this.lotCode,
      this.expirationDate,
      this.stockState,
      this.id,
      this.createdAt,
      this.updatedAt,
      this.createdBy,
      this.updatedBy,
    );
  }
}
