import { RegisterPutawayUseCase } from '../../src/modules/inbound/application/use-cases/register-putaway.use-case';
import { InboundReceiptRepository } from '../../src/modules/inbound/domain/repositories/inbound-receipt.repository';
import { ProductRepository } from '../../src/modules/inbound/domain/repositories/product.repository';
import { PutawayMovementRepository } from '../../src/modules/inbound/domain/repositories/putaway-movement.repository';

const productRepo: ProductRepository = {
  findById: jest.fn(async () => ({
    id: 'prod-1',
    requiresBatch: true,
    requiresExpiryDate: true,
    defaultUom: 'PCS',
  })),
};

const receiptRepo: InboundReceiptRepository = {
  create: jest.fn(),
  findEarliestExpiry: jest.fn(async () => new Date('2024-01-01')),
};

const movementRepo: PutawayMovementRepository = {
  create: jest.fn(async (movement) => movement),
};

describe('RegisterPutawayUseCase', () => {
  it('rechaza movimientos sin caducidad cuando el producto lo requiere', async () => {
    const useCase = new RegisterPutawayUseCase(productRepo, receiptRepo, movementRepo);

    await expect(
      useCase.execute({
        productId: 'prod-1',
        quantity: 1,
        toLocationId: 'loc-1',
        batchCode: 'B1',
      }),
    ).rejects.toThrow('El producto requiere fecha de caducidad');
  });

  it('enforce FEFO cuando existe una caducidad más próxima', async () => {
    const useCase = new RegisterPutawayUseCase(productRepo, receiptRepo, movementRepo);

    await expect(
      useCase.execute({
        productId: 'prod-1',
        quantity: 1,
        toLocationId: 'loc-1',
        batchCode: 'B1',
        expiryDate: new Date('2024-12-31'),
      }),
    ).rejects.toThrow('Debe ubicarse primero el lote con caducidad más próxima (FEFO)');
  });
});
