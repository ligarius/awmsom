import { Inject, Injectable } from '@nestjs/common';
import { StockItem } from '../../domain/entities/stock-item.entity';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../domain/repositories/inventory.repository';
import { StockState } from '../../domain/enums/stock-state.enum';

@Injectable()
export class AdjustStockUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: {
    productId: string;
    locationId: string;
    lotCode?: string;
    expirationDate?: Date;
    quantityDelta: number;
    uom: string;
    stockState?: StockState;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<StockItem> {
    const current = await this.inventoryRepo.findByProductLotAndLocation(
      input.productId,
      input.lotCode,
      input.locationId,
      input.stockState,
    );

    const currentQuantity = current?.quantity ?? 0;
    const newQuantity = currentQuantity + input.quantityDelta;

    if (newQuantity < 0) {
      throw new Error('El stock no puede ser negativo');
    }

    const stock = (current ??
      new StockItem(
        input.productId,
        0,
        input.uom,
        input.locationId,
        input.lotCode,
        input.expirationDate,
        input.stockState,
        undefined,
        undefined,
        undefined,
        input.createdBy,
        input.updatedBy,
      )).withQuantity(newQuantity);

    return this.inventoryRepo.save(stock);
  }
}
