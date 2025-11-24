import { Prisma, TransferOrderStatus } from '@prisma/client';
import { ReplenishmentService } from '../../src/modules/replenishment/replenishment.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('TransferOrder creation', () => {
  let prisma: any;
  let service: ReplenishmentService;

  beforeEach(() => {
    prisma = {
      replenishmentSuggestion: { findMany: jest.fn() },
      transferOrder: {
        create: jest.fn(),
        update: jest.fn(),
      },
      location: { findFirst: jest.fn() },
      movementHeader: { create: jest.fn() },
      movementLine: { create: jest.fn() },
      product: { findUnique: jest.fn() },
      inventory: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const cache = { getJson: jest.fn(), setJson: jest.fn(), buildKey: jest.fn((ns: string, parts: any[]) => `${ns}:${parts.join(':')}`) };
    const audit = { recordLog: jest.fn() };
    const usage = { checkLimit: jest.fn(), incrementUsage: jest.fn() };

    service = new ReplenishmentService(prisma as any, { getTenantId: () => 'tenant' } as any, cache as any, audit as any, usage as any);
  });

  it('creates movement header and lines for transfer order', async () => {
    prisma.replenishmentSuggestion.findMany.mockResolvedValue([]);
    prisma.transferOrder.create.mockResolvedValue({
      id: 'to-1',
      lines: [{ id: 'l1', productId: 'prod-1', quantity: 3 }],
    });
    prisma.transferOrder.update.mockResolvedValue({ id: 'to-1', status: TransferOrderStatus.COMPLETED, lines: [] });
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'EA' });
    prisma.inventory.findFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: decimal(5) });
    prisma.inventory.findFirst.mockResolvedValueOnce({ id: 'inv-2', quantity: decimal(2) });

    const order = await service.createTransferOrderFromSuggestions('tenant', {
      sourceWarehouseId: 'wh-1',
      destinationWarehouseId: 'wh-2',
      lines: [{ productId: 'prod-1', quantity: 3 }],
    });

    expect(order.status).toBe(TransferOrderStatus.COMPLETED);
    expect(prisma.movementHeader.create).toHaveBeenCalled();
    expect(prisma.movementLine.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ movementHeaderId: 'mh-1', productId: 'prod-1' }) }),
    );
  });

  it('updates inventory quantities on transfer', async () => {
    prisma.replenishmentSuggestion.findMany.mockResolvedValue([]);
    prisma.transferOrder.create.mockResolvedValue({ id: 'to-1', lines: [{ id: 'l1', productId: 'prod-1', quantity: 4 }] });
    prisma.transferOrder.update.mockResolvedValue({ id: 'to-1', status: TransferOrderStatus.COMPLETED, lines: [] });
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'EA' });
    prisma.inventory.findFirst.mockResolvedValueOnce({ id: 'inv-src', quantity: decimal(10) });
    prisma.inventory.findFirst.mockResolvedValueOnce(null);

    await service.createTransferOrderFromSuggestions('tenant', {
      sourceWarehouseId: 'wh-1',
      destinationWarehouseId: 'wh-2',
      lines: [{ productId: 'prod-1', quantity: 4 }],
    });

    expect(prisma.inventory.update).toHaveBeenCalledWith({ where: { id: 'inv-src' }, data: { quantity: decimal(6) } });
    expect(prisma.inventory.create).toHaveBeenCalled();
  });
});
