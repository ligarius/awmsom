import { Inject, Injectable } from '@nestjs/common';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../domain/repositories/inventory.repository';
import { StockItem } from '../../domain/entities/stock-item.entity';
import { StockState } from '../../domain/enums/stock-state.enum';

@Injectable()
export class SelectFefoLotUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(productId: string): Promise<StockItem> {
    const lots = await this.inventoryRepo.listAvailableLots(productId);
    const eligible = lots
      .filter((item) => item.stockState === StockState.AVAILABLE && !!item.lotCode)
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate) {
          return a.expirationDate.getTime() - b.expirationDate.getTime();
        }

        if (!a.expirationDate && b.expirationDate) {
          return 1;
        }

        if (a.expirationDate && !b.expirationDate) {
          return -1;
        }

        if (a.createdAt && b.createdAt) {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }

        return 0;
      });

    if (!eligible.length) {
      throw new Error('No hay lotes disponibles para FEFO');
    }

    return eligible[0];
  }
}
