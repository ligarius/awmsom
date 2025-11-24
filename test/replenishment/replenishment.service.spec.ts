import { Prisma, ReplenishmentMethod, ReplenishmentStatus, TransferOrderStatus } from '@prisma/client';
import { ReplenishmentService } from '../../src/modules/replenishment/replenishment.service';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('ReplenishmentService', () => {
  let service: ReplenishmentService;
  let prisma: any;
  let cache: any;
  let audit: any;
  let usage: any;

  beforeEach(() => {
    prisma = {
      replenishmentPolicy: { findMany: jest.fn() },
      replenishmentSuggestion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      inventory: {
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      movementLine: { aggregate: jest.fn(), create: jest.fn() },
      outboundOrderLine: { aggregate: jest.fn() },
      transferOrder: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      location: { findFirst: jest.fn() },
      movementHeader: { create: jest.fn() },
      product: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    cache = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      buildKey: jest.fn((ns: string, parts: any[]) => `${ns}:${parts.join(':')}`),
    };
    audit = { recordLog: jest.fn() };
    usage = { checkLimit: jest.fn(), incrementUsage: jest.fn() };

    service = new ReplenishmentService(prisma as any, { getTenantId: () => 'tenant' } as any, cache as any, audit as any, usage as any);
  });

  const mockPolicy = (overrides: Partial<any> = {}) => ({
    id: 'policy-1',
    tenantId: 'tenant',
    warehouseId: 'wh-1',
    productId: 'prod-1',
    isActive: true,
    ...overrides,
  });

  const setupCommonMocks = (stock: number, movementQty = 0, outboundQty = 0) => {
    prisma.inventory.aggregate.mockResolvedValue({ _sum: { quantity: stock } });
    prisma.movementLine.aggregate.mockResolvedValue({ _sum: { quantity: movementQty } });
    prisma.outboundOrderLine.aggregate.mockResolvedValue({ _sum: { pickedQty: outboundQty } });
    prisma.replenishmentSuggestion.create.mockImplementation(async (data: any) => ({ id: 's1', ...data.data }));
  };

  it('creates FIXED replenishment suggestion', async () => {
    prisma.replenishmentPolicy.findMany.mockResolvedValue([mockPolicy({ method: ReplenishmentMethod.FIXED, fixedQty: 100 })]);
    setupCommonMocks(0);

    const suggestions = await service.evaluateReplenishment('tenant', { force: true });

    expect(suggestions[0].suggestedQty).toBe(100);
    expect(prisma.replenishmentSuggestion.create).toHaveBeenCalled();
  });

  it('creates MIN_MAX replenishment when below minimum', async () => {
    prisma.replenishmentPolicy.findMany.mockResolvedValue([
      mockPolicy({ method: ReplenishmentMethod.MIN_MAX, minQty: 50, maxQty: 120 }),
    ]);
    setupCommonMocks(20);

    const suggestions = await service.evaluateReplenishment('tenant', { force: true });

    expect(suggestions[0].suggestedQty).toBe(100);
  });

  it('creates DOS suggestion using average consumption', async () => {
    prisma.replenishmentPolicy.findMany.mockResolvedValue([
      mockPolicy({ method: ReplenishmentMethod.DOS, daysOfSupply: 10 }),
    ]);
    setupCommonMocks(5, 60, 0); // 60 units over 30 days => 2 per day

    const suggestions = await service.evaluateReplenishment('tenant', { force: true });

    expect(suggestions[0].suggestedQty).toBe(15);
  });

  it('creates EOQ suggestion', async () => {
    prisma.replenishmentPolicy.findMany.mockResolvedValue([mockPolicy({ method: ReplenishmentMethod.EOQ, eoqQty: 70 })]);
    setupCommonMocks(0);

    const suggestions = await service.evaluateReplenishment('tenant', { force: true });
    expect(suggestions[0].suggestedQty).toBe(70);
  });

  it('approves and rejects suggestions', async () => {
    prisma.replenishmentSuggestion.findFirst.mockResolvedValue({ id: 's1', tenantId: 'tenant' });
    prisma.replenishmentSuggestion.update.mockResolvedValue({ id: 's1', status: ReplenishmentStatus.APPROVED });

    const approved = await service.approveSuggestion('tenant', { suggestionId: 's1', approve: true });
    expect(approved.status).toBe(ReplenishmentStatus.APPROVED);
  });

  it('creates transfer order from suggestions', async () => {
    usage.checkLimit.mockResolvedValue(true);
    prisma.replenishmentSuggestion.findMany.mockResolvedValue([{ id: 's1', productId: 'prod-1', suggestedQty: 5 }]);
    prisma.transferOrder.create.mockResolvedValue({
      id: 'to-1',
      lines: [{ id: 'l1', productId: 'prod-1', quantity: 5 }],
    });
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
    prisma.movementHeader.create.mockResolvedValue({ id: 'mh-1' });
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', defaultUom: 'EA' });
    prisma.inventory.findFirst.mockResolvedValueOnce({ id: 'inv-1', quantity: decimal(10) });
    prisma.inventory.findFirst.mockResolvedValueOnce(null);
    prisma.transferOrder.update.mockResolvedValue({
      id: 'to-1',
      status: TransferOrderStatus.COMPLETED,
      lines: [{ id: 'l1', productId: 'prod-1', quantity: 5 }],
    });

    const order = await service.createTransferOrderFromSuggestions('tenant', {
      sourceWarehouseId: 'wh-1',
      destinationWarehouseId: 'wh-2',
      lines: [],
      suggestionIds: ['s1'],
    });

    expect(order.status).toBe(TransferOrderStatus.COMPLETED);
    expect(prisma.movementLine.create).toHaveBeenCalled();
    expect(prisma.replenishmentSuggestion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ReplenishmentStatus.EXECUTED } }),
    );
  });
});
