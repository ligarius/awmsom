import { SelectFefoLotUseCase } from '../../src/modules/inventory/application/use-cases/select-fefo-lot.use-case';
import { InventoryRepository } from '../../src/modules/inventory/domain/repositories/inventory.repository';
import { fixtures } from './fixtures/inventory.fixtures';

describe('Given multiple lots when selecting FEFO', () => {
  const inventoryRepo: InventoryRepository = {
    findByProductLotAndLocation: jest.fn(),
    save: jest.fn(),
    listAvailableLots: jest.fn(async () => [fixtures.availableStock, fixtures.fresherStock]),
  };

  it('then it picks the one with earliest expiration', async () => {
    const useCase = new SelectFefoLotUseCase(inventoryRepo);

    const result = await useCase.execute('prod-1');

    expect(result.lotCode).toBe('LOT-2');
    expect(result.expirationDate?.toISOString()).toBe(new Date('2024-06-01').toISOString());
  });
});
