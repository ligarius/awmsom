import { StockItem } from '../entities/stock-item.entity';
import { StockState } from '../enums/stock-state.enum';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  findByProductLotAndLocation(
    productId: string,
    lotCode: string | undefined,
    locationId: string,
    stockState?: StockState,
  ): Promise<StockItem | null>;
  save(stock: StockItem): Promise<StockItem>;
  listAvailableLots(productId: string): Promise<StockItem[]>;
}
