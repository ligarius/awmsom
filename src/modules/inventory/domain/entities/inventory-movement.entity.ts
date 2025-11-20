export class InventoryMovement {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly uom: string,
    public readonly fromLocationId: string,
    public readonly toLocationId: string,
    public readonly lotCode?: string,
    public readonly createdAt?: Date,
    public readonly createdBy?: string,
    public readonly reason?: string,
    public readonly id?: string,
  ) {
    if (quantity <= 0) {
      throw new Error('La cantidad del movimiento debe ser positiva');
    }

    if (!createdBy) {
      throw new Error('Los movimientos deben ser trazables con usuario');
    }

    if (!fromLocationId || !toLocationId) {
      throw new Error('Los movimientos deben indicar origen y destino');
    }
  }

  withTimestamp(date: Date) {
    return new InventoryMovement(
      this.productId,
      this.quantity,
      this.uom,
      this.fromLocationId,
      this.toLocationId,
      this.lotCode,
      date,
      this.createdBy,
      this.reason,
      this.id,
    );
  }
}
