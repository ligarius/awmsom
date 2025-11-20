export class PutawayMovement {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly uom: string,
    public readonly toLocationId: string,
    public readonly fromLocationId?: string,
    public readonly batchCode?: string,
    public readonly expiryDate?: Date,
    public readonly id?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly createdBy?: string,
    public readonly updatedBy?: string,
  ) {
    if (quantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }
  }
}
