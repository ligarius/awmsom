import { CreateInboundReceiptUseCase } from '../../src/modules/inbound/application/use-cases/create-inbound-receipt.use-case';
import { InboundReceiptRepository } from '../../src/modules/inbound/domain/repositories/inbound-receipt.repository';
import { ProductRepository } from '../../src/modules/inbound/domain/repositories/product.repository';

const product: ProductRepository = {
  findById: jest.fn(async () => ({
    id: 'prod-1',
    requiresBatch: true,
    requiresExpiryDate: true,
    defaultUom: 'PCS',
  })),
};

const receiptRepo: InboundReceiptRepository = {
  create: jest.fn(async (receipt) => receipt),
  findEarliestExpiry: jest.fn(),
};

describe('CreateInboundReceiptUseCase', () => {
  it('valida lote y caducidad requeridos', async () => {
    const useCase = new CreateInboundReceiptUseCase(receiptRepo, product);

    await expect(
      useCase.execute({
        reference: 'R1',
        lines: [
          {
            productId: 'prod-1',
            quantity: 10,
            uom: 'PCS',
          },
        ],
      }),
    ).rejects.toThrow('El producto requiere lote');
  });

  it('rechaza cantidades negativas', async () => {
    const useCase = new CreateInboundReceiptUseCase(receiptRepo, product);

    await expect(
      useCase.execute({
        lines: [
          {
            productId: 'prod-1',
            quantity: -1,
            uom: 'PCS',
            batchCode: 'B1',
            expiryDate: new Date(),
          },
        ],
      }),
    ).rejects.toThrow('La cantidad no puede ser negativa');
  });
});
