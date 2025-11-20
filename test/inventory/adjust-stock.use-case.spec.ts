import { AdjustStockUseCase } from '../../src/modules/inventory/application/use-cases/adjust-stock.use-case';
import { StockItem } from '../../src/modules/inventory/domain/entities/stock-item.entity';
import { StockState } from '../../src/modules/inventory/domain/enums/stock-state.enum';
import { InventoryRepository } from '../../src/modules/inventory/domain/repositories/inventory.repository';
import { fixtures } from './fixtures/inventory.fixtures';

describe('Given existing stock when adjusting quantity', () => {
  const inventoryRepo: InventoryRepository = {
    findByProductLotAndLocation: jest.fn(async () => fixtures.availableStock),
    save: jest.fn(async (stock) => stock),
    listAvailableLots: jest.fn(),
  };

  it('then it rejects negative balances', async () => {
    const useCase = new AdjustStockUseCase(inventoryRepo);

    await expect(
      useCase.execute({
        productId: fixtures.availableStock.productId,
        locationId: fixtures.availableStock.locationId,
        lotCode: fixtures.availableStock.lotCode,
        quantityDelta: -10,
        uom: fixtures.availableStock.uom,
        stockState: StockState.AVAILABLE,
      }),
    ).rejects.toThrow('El stock no puede ser negativo');
  });

  it('then it persists new quantities when valid', async () => {
    const useCase = new AdjustStockUseCase(inventoryRepo);

    const result = await useCase.execute({
      productId: fixtures.availableStock.productId,
      locationId: fixtures.availableStock.locationId,
      lotCode: fixtures.availableStock.lotCode,
      quantityDelta: 5,
      uom: fixtures.availableStock.uom,
      stockState: StockState.AVAILABLE,
    });

    expect(result).toBeInstanceOf(StockItem);
    expect(result.quantity).toBe(10);
    expect(inventoryRepo.save).toHaveBeenCalledWith(expect.any(StockItem));
  });
});
